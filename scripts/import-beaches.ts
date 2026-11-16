/**
 * Importa a Descubrir › Playas las playas de Xàbia a Cartagena (scripts/data/playas.json).
 *
 * Por defecto NO escribe nada: enseña cómo quedarían las primeras fichas y cuántas hay.
 *   npm run import:beaches                       → solo vista previa
 *   npm run import:beaches -- --write --limit=3  → escribe 3 playas (prueba)
 *   npm run import:beaches -- --write            → escribe todas
 *   npm run import:beaches -- --remove --write   → borra todas las playas importadas (y sus fotos)
 * Firebase de pruebas local: añada --emulator.
 * Necesita la clave de la cuenta de servicio en el entorno (ver scripts/credentials.ts).
 *
 * Se puede repetir sin duplicar: cada playa tiene siempre el mismo identificador (beach-…). Si una ficha
 * ya existe, se actualizan los textos pero se conservan sus fotos y lo que CJ haya cambiado en "active".
 * Las fotos son de Wikimedia Commons (licencia libre): se copian al almacén de la app y el autor y la
 * licencia se citan al final de la presentación, como exige la licencia.
 * Los textos van en español; los demás idiomas los pone la traducción automática al publicar la app.
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
const SOURCE = 'playas-xabia-cartagena'
const BUCKET = 'cj-club.firebasestorage.app'
const UA = 'CJClubBeachImport/1.0 (one-off import of Wikimedia Commons photos)'

if (args.emulator === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199'
}

type Foto = { url: string; original: string; pagina: string; autor: string | null; licencia: string | null }
type Playa = {
  id: string; nombre: string; nombre_valenciano: string | null; municipio: string; zona: string | null; mar: string
  lat: number; lon: number; tipo: string | null; arena: string | null; longitud_m: number | null; aguas: string | null
  bandera_azul_2025: boolean | null; socorrista: boolean | null; accesible_pmr: boolean | null; perros: boolean | null; nudista: boolean | null
  servicios: string[]; descripcion_corta: string | null; descripcion: string | null; como_llegar: string | null; curiosidad: string | null
  wikipedia_url: string | null; web_oficial: string | null; fotos: Foto[]
}

const playas: Playa[] = JSON.parse(readFileSync(new URL('./data/playas.json', import.meta.url), 'utf8').replace(/^﻿/, '')).playas

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const town = (m: string) => m.split(' / ').pop()!.replace(/\s*\(.*\)$/, '')
const docId = (p: Playa) => `beach-${p.id}`.slice(0, 100)

/** "Cala · Grava · Aguas cristalinas" — lo que se ve debajo del nombre */
function meta(p: Playa) {
  const tipo = p.tipo === 'cala' ? 'Cala' : p.tipo === 'urbana' ? 'Playa urbana' : p.tipo === 'natural' ? 'Playa natural' : 'Playa'
  const parts = [tipo, p.arena ? cap(p.arena) : '', town(p.municipio)]
  if (p.bandera_azul_2025) parts.push('Bandera Azul')
  return parts.filter(Boolean).join(' · ')
}

function about(p: Playa) {
  const lines: string[] = []
  if (p.descripcion) lines.push(p.descripcion)
  if (p.como_llegar) lines.push(`Cómo llegar: ${p.como_llegar}`)
  const facts = [
    p.longitud_m ? `${p.longitud_m} m de largo` : '',
    p.aguas ? `aguas ${p.aguas}` : '',
    p.socorrista ? 'socorrista en temporada' : '',
    p.accesible_pmr ? 'accesible' : '',
    p.perros ? 'admite perros' : '',
    p.nudista ? 'nudista' : '',
  ].filter(Boolean)
  if (facts.length) lines.push(cap(facts.join(', ')) + '.')
  if (p.servicios?.length) lines.push(`Servicios: ${p.servicios.join(', ')}.`)
  const credits = p.fotos.slice(0, MAX_PHOTOS).map((f) => `${f.autor || 'autor desconocido'} (${f.licencia || 'licencia libre'})`)
  if (credits.length) lines.push(`Fotos: ${[...new Set(credits)].join('; ')}, vía Wikimedia Commons.`)
  return lines.join('\n\n')
}

function placeDoc(p: Playa) {
  const website = [p.web_oficial, p.wikipedia_url].find((u) => u && /^https:\/\//.test(u)) || ''
  return {
    category: 'beaches',
    name: p.nombre,
    meta_es: meta(p),
    cjNote_es: p.curiosidad || p.descripcion_corta || '',
    about_es: about(p),
    address: [p.zona, town(p.municipio)].filter((x, i, a) => x && a.indexOf(x) === i).join(', '),
    website,
    active: true,
    location: { lat: p.lat, lng: p.lon },
    importedFrom: SOURCE,
  }
}

/** Foto de Commons en tamaño de móvil (1280 px de ancho como mucho) */
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
  const list = playas.slice(0, LIMIT)
  console.log(`${playas.length} playas en el archivo; ${REMOVE ? 'borrar' : 'importar'} ${list.length}. ${WRITE ? 'ESCRIBIENDO en Firebase.' : 'Vista previa: no se escribe nada (añada --write).'}\n`)

  if (!WRITE) {
    for (const p of list.slice(0, 3)) console.log(docId(p), JSON.stringify(placeDoc(p), null, 2), `\nfotos: ${Math.min(p.fotos.length, MAX_PHOTOS)}\n`)
    console.log(`Con foto: ${list.filter((p) => p.fotos.length).length} de ${list.length}.`)
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
    console.log(`Borradas ${snap.size} playas importadas.`)
    return
  }

  let created = 0, updated = 0, photos = 0
  for (const [i, p] of list.entries()) {
    const ref = db.collection('places').doc(docId(p))
    const prev = await ref.get()
    const data: Record<string, unknown> = placeDoc(p)
    if (prev.exists) {
      delete data.active // si CJ la ha ocultado, sigue oculta
      await ref.set(data, { merge: true })
      updated++
    } else {
      await ref.set({ ...data, photos: [] })
      created++
    }
    if (!prev.exists || !(prev.get('photos') || []).length) {
      const atts = []
      for (const f of p.fotos.slice(0, MAX_PHOTOS)) {
        const got = await download(sized(f))
        if (!got) continue
        const ext = got.type.includes('png') ? 'png' : 'jpg'
        const path = `profiles/places/${ref.id}/photos/${Date.now()}-${randomBytes(4).toString('hex')}-commons.${ext}`
        const token = randomUUID()
        await bucket.file(path).save(got.buf, { contentType: got.type, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: 'import-beaches', source: f.pagina } } })
        atts.push({ path, name: `commons.${ext}`, contentType: got.type, size: got.buf.length, url: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` })
        await new Promise((res) => setTimeout(res, 800))
      }
      if (atts.length) { await ref.update({ photos: atts }); photos += atts.length }
    }
    console.log(`${i + 1}/${list.length}  ${p.nombre} (${town(p.municipio)})`)
  }
  console.log(`\nListo: ${created} nuevas, ${updated} actualizadas, ${photos} fotos subidas.`)
}

main().catch((e) => {
  console.error('La importación se ha parado:', e)
  process.exit(1)
})
