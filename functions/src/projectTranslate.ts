/**
 * Traducción de «Mi reforma» al idioma del cliente: presupuesto, plan de pagos, extras, avances, pagos,
 * desperfectos, selecciones y planos. El texto original (normalmente español) es el que vale; la traducción
 * es para que el cliente lo entienda.
 *
 * Traductor: la IA de Claude (Anthropic), que conoce el vocabulario de obra; mientras no esté configurada
 * (REFORM_TRANSLATOR=claude y el secreto ANTHROPIC_API_KEY), el servicio de traducción de Google.
 * Resultado en projects/{pid}/translations/{idioma} = { provider, items: [{ s: original, t: traducción }] },
 * que solo leen las partes del contrato. Solo se traduce lo nuevo.
 */
import Anthropic from '@anthropic-ai/sdk'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { googleTranslate } from './autoTranslate.js'

export const REFORM_LANGS = ['en', 'nl', 'sv', 'de', 'fr', 'pl']
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'British English',
  nl: 'Dutch (formal "u")',
  sv: 'Swedish',
  de: 'German (formal "Sie")',
  fr: 'French (formal "vous")',
  pl: 'Polish (formal)',
}
const MAX_CHARS = 4000

const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_CHARS) : '')

/** Todos los textos de una reforma que el cliente lee */
export async function projectTexts(db: Firestore, pid: string): Promise<string[]> {
  const set = new Set<string>()
  const add = (...vals: unknown[]) => vals.forEach((v) => str(v) && set.add(str(v)))
  const project = await db.doc(`projects/${pid}`).get()
  if (!project.exists) return []
  add(project.get('title'))
  const sub = (name: string) => db.collection(`projects/${pid}/${name}`).get()
  const [lines, extras, updates, payments, snags, selections, signatures, plan] = await Promise.all([
    sub('budgetLines'),
    sub('extras'),
    sub('updates'),
    sub('payments'),
    sub('snags'),
    sub('selections'),
    sub('signatures'),
    db.doc(`projects/${pid}/plan/main`).get(),
  ])
  for (const d of lines.docs) add(d.get('title'), d.get('description'))
  for (const d of extras.docs) add(d.get('title'), d.get('description'), d.get('decisionNote'))
  for (const d of updates.docs) add(d.get('title'), d.get('text'))
  for (const d of payments.docs) add(d.get('concept'))
  for (const d of snags.docs) add(d.get('title'), d.get('text'), d.get('fixNote'), d.get('reopenNote'))
  for (const d of selections.docs) add(d.get('title'), d.get('note'))
  // Lo firmado (puede diferir de las líneas actuales)
  for (const d of signatures.docs) {
    for (const l of (d.get('lines') as { title?: string; description?: string }[] | undefined) ?? []) add(l.title, l.description)
    for (const m of (d.get('plan') as { title?: string }[] | undefined) ?? []) add(m.title)
  }
  for (const m of (plan.get('milestones') as { title?: string }[] | undefined) ?? []) add(m.title)
  const reformId = project.get('reformId')
  if (typeof reformId === 'string' && reformId) {
    for (const d of (await db.collection(`reforms/${reformId}/plans`).get()).docs) add(d.get('title'), d.get('note'))
  }
  return [...set]
}

const SYSTEM = `You translate texts from a home-renovation project on the Costa Blanca, Spain, for the foreign homeowner (the client).
The texts are written by Spanish builders, trades (electricians, plumbers, carpenters…), architects and the agency CJ Real Estate & Services: budget items and what they include, payment milestones, extra work, progress updates, payments, snags (defects to fix), product selections and plan notes.

Rules:
- Translate faithfully and completely. Do not add, omit, summarise or explain anything.
- Use the correct construction and renovation terminology a professional in the target language would use (e.g. "alicatado" = wall tiling, "solado" = floor tiling, "enlucido" = plastering, "rozas" = wall chases for cables/pipes, "partida" = budget item, "IVA" = the target language's word for VAT).
- Keep exactly as written: numbers, prices, measurements and units (m², ml, ud, cm), dates, product names, brands, model references, company and personal names, and addresses.
- Keep the line breaks and list formatting of each text.
- Polite, clear and natural, as a professional would write to a client.
- If a text is already in the target language, return it unchanged.
- Each input text is independent; return one translation per input, in the same order.`

/** Traduce con Claude; devuelve una traducción por texto, en el mismo orden */
async function claudeTranslate(apiKey: string, texts: string[], lang: string): Promise<string[]> {
  if (process.env.FUNCTIONS_EMULATOR === 'true' && (!apiKey || apiKey === 'test')) return texts.map((t) => `[${lang}·IA] ${t}`)
  const client = new Anthropic({ apiKey })
  const out: string[] = []
  for (let i = 0; i < texts.length; i += 60) {
    const chunk = texts.slice(i, i + 60)
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // Si la IA rechazara un texto, Anthropic lo reintenta con el modelo alternativo recomendado
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { translations: { type: 'array', items: { type: 'string' } } },
            required: ['translations'],
            additionalProperties: false,
          },
        },
      },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Target language: ${LANGUAGE_NAMES[lang]}.\nTranslate each of these ${chunk.length} texts (JSON array):\n${JSON.stringify(chunk)}`,
        },
      ],
    })
    if (response.stop_reason === 'refusal') throw new HttpsError('unavailable', 'La IA no ha podido traducir este texto.')
    const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = JSON.parse(text) as { translations?: unknown }
    const list = Array.isArray(parsed.translations) ? parsed.translations : []
    if (list.length !== chunk.length) throw new HttpsError('unavailable', 'La traducción ha llegado incompleta.')
    chunk.forEach((t, j) => out.push(typeof list[j] === 'string' && list[j] ? (list[j] as string) : t))
  }
  return out
}

/** Pone al día la traducción de una reforma a un idioma. Devuelve cuántos textos nuevos se han traducido. */
export async function translateProject(db: Firestore, pid: string, lang: string, claudeKey: string): Promise<number> {
  const provider = claudeKey ? 'claude' : 'google'
  const ref = db.doc(`projects/${pid}/translations/${lang}`)
  const [texts, snap] = await Promise.all([projectTexts(db, pid), ref.get()])
  // Si cambia el traductor (p. ej. de Google a Claude), se traduce todo de nuevo con el mejor
  const old = snap.exists && snap.get('provider') === provider ? ((snap.get('items') as { s: string; t: string }[] | undefined) ?? []) : []
  const known = new Map(old.map((x) => [x.s, x.t]))
  const missing = texts.filter((s) => !known.has(s))
  if (!missing.length && snap.exists && old.length === texts.length) return 0
  if (missing.length) {
    const done = provider === 'claude' ? await claudeTranslate(claudeKey, missing, lang) : (await googleTranslate(missing, lang)).map((x) => x.text)
    missing.forEach((s, i) => known.set(s, done[i]))
  }
  // Solo los textos actuales (lo borrado se quita)
  await ref.set({ provider, items: texts.map((s) => ({ s, t: known.get(s) ?? s })), updatedAt: FieldValue.serverTimestamp() })
  return missing.length
}
