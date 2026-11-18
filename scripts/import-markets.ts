/**
 * Importa a Descubrir › Mercadillos los mercadillos de Dénia a Murcia (scripts/data/mercadillos.json).
 * Crea también la categoría "Mercadillos" (placeCategories/mercadillos) si no existe.
 *
 * Por defecto NO escribe nada: enseña cómo quedarían las primeras fichas y cuántas hay.
 *   npm run import:markets                       → solo vista previa
 *   npm run import:markets -- --write --limit=3  → escribe 3 mercadillos (prueba)
 *   npm run import:markets -- --write            → escribe todos
 *   npm run import:markets -- --remove --write   → borra todos los mercadillos importados (y sus fotos)
 * Firebase de pruebas local: añada --emulator.
 *
 * Se puede repetir sin duplicar (identificadores fijos). Si una ficha ya existe, se actualizan los textos
 * y se conservan sus fotos y si CJ la ha mostrado u ocultado.
 * Los mercadillos con datos poco seguros (confianza "baja") se crean OCULTOS: CJ los revisa y los
 * muestra desde el panel cuando haya confirmado el día y el sitio.
 * Fotos: Wikimedia Commons (licencia libre); autor y licencia se citan en la presentación.
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { adminCredential } from './credentials'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.join('=') || 'true']
  }),
)
const WRITE = args.write === 'true'
const REMOVE = args.remove === 'true'
const LIMIT = args.limit ? Number(args.limit) : Infinity
const MAX_PHOTOS = 3
const SOURCE = 'mercadillos-denia-murcia'
const CATEGORY = 'mercadillos'
const BUCKET = 'cj-club.firebasestorage.app'
const UA = 'CJClubMarketImport/1.0 (one-off import of Wikimedia Commons photos)'

if (args.emulator === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199'
}

type Foto = { url: string; original: string; pagina: string; autor: string | null; licencia: string | null }
type Mercadillo = {
  id: string; nombre: string; municipio: string; zona: string | null; direccion: string | null; lat: number | null; lon: number | null
  tipo: 'semanal' | 'rastro' | 'artesania' | 'agricultor' | 'feria_anual'; dias: string[]; dias_texto: string; horario: string | null
  temporada: string | null; frecuencia: string | null; puestos_aprox: number | null; que_encontrar: string[] | null; aparcamiento: string | null
  descripcion_corta: string | null; descripcion: string | null; consejo_cj: string | null; web_oficial: string | null
  confianza: 'alta' | 'media' | 'baja'; fotos: Foto[]
}

const list: Mercadillo[] = JSON.parse(readFileSync(new URL('./data/mercadillos.json', import.meta.url), 'utf8').replace(/^﻿/, '')).mercadillos

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const town = (m: string) => m.split(' / ').pop()!.replace(/\s*\(.*\)$/, '')
const docId = (m: Mercadillo) => (m.id.startsWith('mercadillo-') ? m.id : `mercadillo-${m.id}`).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100)
const TIPO: Record<Mercadillo['tipo'], string> = { semanal: 'Mercadillo', rastro: 'Rastro', artesania: 'Artesanía', agricultor: 'Agricultores', feria_anual: 'Feria anual' }
const allYear = (t: string | null) => !t || /todo el a[nñ]o/i.test(t)

/** "Mercadillo · Miércoles · Teulada" */
function meta(m: Mercadillo) {
  const when = m.tipo === 'feria_anual' ? m.frecuencia || '' : m.dias_texto || ''
  return [TIPO[m.tipo] || 'Mercadillo', when, town(m.municipio)].filter(Boolean).join(' · ')
}

/** "Miércoles, 08:00–14:00 · Julio y agosto" */
function hours(m: Mercadillo) {
  const when = m.tipo === 'feria_anual' ? m.frecuencia : m.dias_texto
  const parts = [[when, m.horario].filter(Boolean).join(', ')]
  if (!allYear(m.temporada)) parts.push(cap(m.temporada!))
  if (m.frecuencia && /mensual|quincenal/i.test(m.frecuencia)) parts.push(cap(m.frecuencia))
  return parts.filter(Boolean).join(' · ')
}

function about(m: Mercadillo) {
  const lines: string[] = []
  if (m.descripcion) lines.push(m.descripcion)
  if (m.que_encontrar?.length) lines.push(`Qué encontrará: ${m.que_encontrar.join(', ')}.`)
  if (m.puestos_aprox) lines.push(`Unos ${m.puestos_aprox} puestos.`)
  if (m.aparcamiento) lines.push(`Aparcamiento: ${m.aparcamiento}`)
  lines.push('Los días y horarios pueden cambiar en festivos y en verano.')
  const credits = m.fotos.slice(0, MAX_PHOTOS).map((f) => `${f.autor || 'autor desconocido'} (${f.licencia || 'licencia libre'})`)
  if (credits.length) lines.push(`Fotos: ${[...new Set(credits)].join('; ')}, vía Wikimedia Commons.`)
  return lines.join('\n\n')
}

function placeDoc(m: Mercadillo) {
  return {
    category: CATEGORY,
    name: m.nombre,
    meta_es: meta(m),
    cjNote_es: m.consejo_cj || m.descripcion_corta || '',
    about_es: about(m),
    hours_es: hours(m),
    address: [m.direccion, town(m.municipio)].filter(Boolean).join(', '),
    website: m.web_oficial && /^https:\/\//.test(m.web_oficial) ? m.web_oficial : '',
    active: m.confianza !== 'baja',
    ...(m.lat != null && m.lon != null ? { location: { lat: m.lat, lng: m.lon } } : {}),
    importedFrom: SOURCE,
  }
}

const sized = (f: Foto) => (f.url.includes('/thumb/') ? f.url.replace(/\/\d+px-/, '/1280px-') : f.url)

async function download(url: string): Promise<{ buf: Buffer; type: string } | null> {
  for (let wait = 2000, i = 0; i < 6; i++, wait *= 2) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'image/jpeg' }
    if (r.status !== 429 && r.status < 500) return null
    await new Promise((res) => setTimeout(res, wait))
  }
  return null
}

async function main() {
  const todo = list.slice(0, LIMIT)
  console.log(`${list.length} mercadillos en el archivo (${list.filter((m) => m.confianza === 'baja').length} se crearán ocultos para revisar); ${REMOVE ? 'borrar' : 'importar'} ${todo.length}. ${WRITE ? 'ESCRIBIENDO en Firebase.' : 'Vista previa: no se escribe nada (añada --write).'}\n`)

  if (!WRITE) {
    for (const m of todo.slice(0, 3)) console.log(docId(m), JSON.stringify(placeDoc(m), null, 2), `\nfotos: ${Math.min(m.fotos.length, MAX_PHOTOS)}\n`)
    console.log(`Con foto: ${todo.filter((m) => m.fotos.length).length} de ${todo.length}.`)
    return
  }

  initializeApp({ credential: args.emulator === 'true' ? undefined : adminCredential(), projectId: 'cj-club', storageBucket: BUCKET })
  const db = getFirestore()
  const bucket = getStorage().bucket(BUCKET)

  if (REMOVE) {
    const snap = await db.collection('places').where('importedFrom', '==', SOURCE).get()
    for (const d of snap.docs) {
      await bucket.deleteFiles({ prefix: `profiles/places/${d.id}/` }).catch(() => undefined)
      await d.ref.delete()
    }
    console.log(`Borrados ${snap.size} mercadillos importados. La categoría "Mercadillos" se mantiene (se oculta desde el panel).`)
    return
  }

  const cat = db.collection('placeCategories').doc(CATEGORY)
  if (!(await cat.get()).exists) {
    await cat.set({ name_es: 'Mercadillos', name_en: 'Markets', order: 45, active: true })
    console.log('Categoría "Mercadillos" creada.')
  }

  let created = 0, updated = 0, photos = 0
  for (const [i, m] of todo.entries()) {
    const ref = db.collection('places').doc(docId(m))
    const prev = await ref.get()
    const data: Record<string, unknown> = placeDoc(m)
    if (prev.exists) {
      delete data.active
      await ref.set(data, { merge: true })
      updated++
    } else {
      await ref.set({ ...data, photos: [] })
      created++
    }
    if (!prev.exists || !(prev.get('photos') || []).length) {
      const atts = []
      for (const f of m.fotos.slice(0, MAX_PHOTOS)) {
        const got = await download(sized(f))
        if (!got) continue
        const ext = got.type.includes('png') ? 'png' : 'jpg'
        const path = `profiles/places/${ref.id}/photos/${Date.now()}-${randomBytes(4).toString('hex')}-commons.${ext}`
        const token = randomUUID()
        await bucket.file(path).save(got.buf, { contentType: got.type, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: 'import-markets', source: f.pagina } } })
        atts.push({ path, name: `commons.${ext}`, contentType: got.type, size: got.buf.length, url: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` })
        await new Promise((res) => setTimeout(res, 800))
      }
      if (atts.length) { await ref.update({ photos: atts }); photos += atts.length }
    }
    console.log(`${i + 1}/${todo.length}  ${m.nombre} (${town(m.municipio)})${m.confianza === 'baja' && !prev.exists ? ' — oculto, para revisar' : ''}`)
  }
  console.log(`\nListo: ${created} nuevos, ${updated} actualizados, ${photos} fotos subidas.`)
}

main().catch((e) => {
  console.error('La importación se ha parado:', e)
  process.exit(1)
})
