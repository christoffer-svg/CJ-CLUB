/**
 * Traducción automática de la información de los negocios, colaboradores, descuentos, eventos, cartas,
 * servicios y contactos, con el servicio de traducción de Google (Cloud Translation).
 *
 * - Campos con idioma (about_es / about_en…): si falta un idioma, se traduce desde el español (o el
 *   inglés si no hay español). Lo que CJ o el negocio escriben a mano en un idioma manda siempre.
 * - Campos sin idioma (título de un descuento o evento, platos de la carta): se traducen a todos.
 * Cada traducción se guarda una vez en autoTranslations/{huella} = { lang, src, text }; la app la
 * busca por el texto original. Si el original cambia, se traduce el nuevo.
 * Solo contenido público para los clientes (no se traduce lo oculto o desactivado).
 */
import { applicationDefault } from 'firebase-admin/app'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { createHash } from 'node:crypto'

export const TRANSLATE_LANGS = ['es', 'en', 'nl', 'sv', 'de', 'fr', 'pl']
const MAX_CHARS = 5000

export type Translated = { text: string; detected: string }

/** Traduce varios textos a un idioma. En el Firebase de pruebas local se simula con "[idioma] texto". */
export async function googleTranslate(texts: string[], target: string): Promise<Translated[]> {
  if (!texts.length) return []
  if (process.env.FUNCTIONS_EMULATOR === 'true') return texts.map((t) => ({ text: `[${target}] ${t}`, detected: t.startsWith(`[${target}] `) ? target : 'xx' }))
  const out: Translated[] = []
  // Google admite hasta 128 textos por petición; se mandan de 50 en 50
  for (let i = 0; i < texts.length; i += 50) {
    const chunk = texts.slice(i, i + 50)
    const { access_token } = await applicationDefault().getAccessToken()
    const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', 'x-goog-user-project': 'cj-club' },
      body: JSON.stringify({ q: chunk, target, format: 'text' }),
    })
    if (!res.ok) {
      console.error('translate', res.status, (await res.text()).slice(0, 500))
      if (res.status === 403) throw new HttpsError('failed-precondition', 'La traducción aún no está activada en Google Cloud.')
      throw new HttpsError('unavailable', 'No se pudo traducir ahora.')
    }
    const body = (await res.json()) as { data?: { translations?: { translatedText?: string; detectedSourceLanguage?: string }[] } }
    const tr = body.data?.translations ?? []
    chunk.forEach((t, j) => out.push({ text: tr[j]?.translatedText ?? t, detected: (tr[j]?.detectedSourceLanguage ?? '').slice(0, 2) }))
  }
  return out
}

/** Qué se traduce en cada colección: campos con idioma (_es, _en…) y campos sin idioma */
type Spec = { pattern: RegExp; suffixed: string[]; plain: string[] }
const SPECS: Spec[] = [
  { pattern: /^places\/[^/]+$/, suffixed: ['meta', 'cjNote', 'about', 'hours', 'orderInfo'], plain: [] },
  { pattern: /^places\/[^/]+\/orderItems\/[^/]+$/, suffixed: [], plain: ['section', 'name', 'description'] },
  { pattern: /^partners\/[^/]+$/, suffixed: ['description', 'about', 'hours', 'orderInfo'], plain: [] },
  { pattern: /^generalContacts\/[^/]+$/, suffixed: ['name', 'description'], plain: [] },
  { pattern: /^deals\/[^/]+$/, suffixed: ['conditions', 'description'], plain: ['title'] },
  { pattern: /^events\/[^/]+$/, suffixed: ['about'], plain: ['title'] },
  { pattern: /^services\/[^/]+$/, suffixed: ['name', 'description', 'priceNote'], plain: [] },
  { pattern: /^placeCategories\/[^/]+$/, suffixed: ['name'], plain: [] },
  { pattern: /^settings\/tipOfTheWeek$/, suffixed: ['text'], plain: [] },
]

export const isTranslatablePath = (path: string) => SPECS.some((s) => s.pattern.test(path))

const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_CHARS) : '')
const keyOf = (lang: string, src: string) => createHash('sha256').update(`${lang}\n${src}`).digest('hex')

/** Textos que necesita un documento: idioma → textos originales */
export function neededTexts(path: string, data: Record<string, unknown>): Map<string, Set<string>> {
  const need = new Map<string, Set<string>>(TRANSLATE_LANGS.map((l) => [l, new Set<string>()]))
  const spec = SPECS.find((s) => s.pattern.test(path))
  if (!spec) return need
  // Lo oculto o desactivado no se traduce (se traducirá cuando se vuelva a guardar visible)
  if (data.active === false || data.hiddenByAdmin === true || data.hidden === true) return need
  for (const f of spec.suffixed) {
    const src = str(data[`${f}_es`]) || str(data[`${f}_en`])
    if (!src) continue
    for (const l of TRANSLATE_LANGS) if (!str(data[`${f}_${l}`])) need.get(l)!.add(src)
  }
  for (const f of spec.plain) {
    const src = str(data[f])
    if (src) for (const l of TRANSLATE_LANGS) need.get(l)!.add(src)
  }
  return need
}

/** Traduce lo que aún no está traducido. Devuelve cuántos textos nuevos se han traducido. */
export async function ensureTranslations(db: Firestore, need: Map<string, Set<string>>): Promise<number> {
  let done = 0
  for (const [lang, set] of need) {
    const srcs = [...set]
    if (!srcs.length) continue
    const refs = srcs.map((s) => db.doc(`autoTranslations/${keyOf(lang, s)}`))
    const snaps = await db.getAll(...refs)
    const missing = srcs.filter((_, i) => !snaps[i].exists)
    if (!missing.length) continue
    const out = await googleTranslate(missing, lang)
    const batch = db.batch()
    missing.forEach((src, i) => batch.set(db.doc(`autoTranslations/${keyOf(lang, src)}`), { lang, src, text: out[i].text, at: FieldValue.serverTimestamp() }))
    await batch.commit()
    done += missing.length
  }
  return done
}

/** Un documento (después de guardarlo en el panel) */
export async function translateDoc(db: Firestore, path: string): Promise<number> {
  if (!isTranslatablePath(path)) return 0
  const snap = await db.doc(path).get()
  if (!snap.exists) return 0
  return ensureTranslations(db, neededTexts(path, snap.data() ?? {}))
}

/** Todo el contenido (al publicar la app): pone al día lo que falte */
export async function translateEverything(db: Firestore): Promise<number> {
  const need = new Map<string, Set<string>>(TRANSLATE_LANGS.map((l) => [l, new Set<string>()]))
  const add = (path: string, data: Record<string, unknown>) => {
    for (const [l, set] of neededTexts(path, data)) for (const s of set) need.get(l)!.add(s)
  }
  for (const coll of ['places', 'partners', 'generalContacts', 'deals', 'events', 'services', 'placeCategories']) {
    for (const d of (await db.collection(coll).get()).docs) add(d.ref.path, d.data())
  }
  for (const d of (await db.collectionGroup('orderItems').get()).docs) add(d.ref.path, d.data())
  const tip = await db.doc('settings/tipOfTheWeek').get()
  if (tip.exists) add(tip.ref.path, tip.data() ?? {})
  return ensureTranslations(db, need)
}
