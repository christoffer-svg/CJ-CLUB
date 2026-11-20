/**
 * Fichas completas de los campos de golf de Dénia a Murcia (scripts/data/golf.json, de la página
 * «Golf Dénia–Murcia» de CJ): hoyos, par, diseño, descripción, dirección, teléfono, email, web y foto.
 * Van a Descubrir › Golf.
 *
 *   npm run import:golf                    → vista previa (no escribe nada)
 *   npm run import:golf -- --write         → crea o completa las fichas
 *   npm run import:golf -- --remove --write → borra los campos importados (y sus fotos)
 * Firebase de pruebas local: añada --emulator.
 *
 * Si una ficha ya existe se actualizan sus datos, pero se respeta si CJ la ha ocultado y las fotos que ya tenga.
 * Los campos con actividad sin confirmar se crean ocultos.
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
const SOURCE = 'golf-denia-murcia'
const BUCKET = 'cj-club.firebasestorage.app'

if (args.emulator === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199'
}

type Campo = {
  id: string
  name: string
  municipality: string
  address: string
  lat: number
  lng: number
  holes: string
  par: number | null
  designer: string | null
  opened: number | null
  description: string
  phone: string
  email: string
  website: string
  status: 'open' | 'partial' | 'uncertain'
  photo: string | null
}

const campos: Campo[] = JSON.parse(readFileSync(new URL('./data/golf.json', import.meta.url), 'utf8')).campos

const town = (m: string) => m.replace(/\s*\(.*\)$/, '').split(' / ')[0]
const holesText = (h: string) => (/^\d+$/.test(h) ? `${h} hoyos` : h.replace(/^(\d+)/, '$1 hoyos'))

function placeDoc(c: Campo) {
  const facts = [`Recorrido: ${holesText(c.holes)}${c.par ? `, par ${c.par}` : ''}.`]
  if (c.designer) facts.push(`Diseño: ${c.designer}${c.opened ? ` (${c.opened})` : ''}.`)
  else if (c.opened) facts.push(`Abierto en ${c.opened}.`)
  const about = [facts.join(' ')]
  if (c.status === 'partial') about.push('Ha reabierto solo en parte: llame antes de ir.')
  if (c.status === 'uncertain') about.push('Su actividad no está confirmada: llame antes de ir.')
  about.push('Reserve su salida (green fee) en la web o por teléfono.')
  return {
    category: 'golf',
    name: c.name,
    meta_es: [holesText(c.holes) + (c.par ? ` · Par ${c.par}` : ''), town(c.municipality)].join(' · '),
    meta_en: '',
    cjNote_es: c.description,
    cjNote_en: '',
    about_es: about.join('\n\n'),
    about_en: '',
    address: c.address,
    phone: c.phone,
    email: c.email,
    website: /^https:\/\//.test(c.website) ? c.website : '',
    location: { lat: c.lat, lng: c.lng },
    discountPercent: null,
    reservationChannel: null,
    reservationTarget: null,
    importedFrom: SOURCE,
  }
}

async function main() {
  console.log(`${campos.length} campos (${campos.filter((c) => c.photo).length} con foto). ${WRITE ? 'ESCRIBIENDO en Firebase.' : 'Vista previa: no se escribe nada (añada --write).'}\n`)
  if (!WRITE) {
    for (const c of campos.slice(0, 3)) console.log(c.id, JSON.stringify(placeDoc(c), null, 2), '\n')
    return
  }
  initializeApp(
    args.emulator === 'true' ? { projectId: 'cj-club', storageBucket: BUCKET } : { credential: adminCredential(), projectId: 'cj-club', storageBucket: BUCKET },
  )
  const db = getFirestore()
  const bucket = getStorage().bucket(BUCKET)

  if (REMOVE) {
    const snap = await db.collection('places').where('importedFrom', '==', SOURCE).get()
    for (const d of snap.docs) {
      await bucket.deleteFiles({ prefix: `profiles/places/${d.id}/` }).catch(() => undefined)
      await d.ref.delete()
    }
    console.log(`Borrados ${snap.size} campos de golf importados.`)
    return
  }

  let created = 0
  let updated = 0
  let photos = 0
  for (const [i, c] of campos.entries()) {
    const ref = db.doc(`places/${c.id}`)
    const prev = await ref.get()
    const data: Record<string, unknown> = placeDoc(c)
    if (prev.exists) {
      await ref.set(data, { merge: true })
      updated++
    } else {
      await ref.set({ ...data, active: c.status !== 'uncertain', photos: [] })
      created++
    }
    if (c.photo && !((prev.exists && prev.get('photos')) || []).length) {
      const buf = readFileSync(new URL(`./data/golf-img/${c.photo}`, import.meta.url))
      const path = `profiles/places/${c.id}/photos/${Date.now()}-${randomBytes(4).toString('hex')}-${c.photo}`
      const token = randomUUID()
      await bucket.file(path).save(buf, { contentType: 'image/jpeg', resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: 'import-golf' } } })
      const host = args.emulator === 'true' ? 'http://127.0.0.1:9199' : 'https://firebasestorage.googleapis.com'
      await ref.update({ photos: [{ path, name: c.photo, contentType: 'image/jpeg', size: buf.length, url: `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` }] })
      photos++
    }
    console.log(`${i + 1}/${campos.length}  ${c.name}${prev.exists ? ' (actualizado)' : ''}`)
  }
  console.log(`\nListo: ${created} nuevos, ${updated} actualizados, ${photos} fotos subidas.`)
}

main().catch((e) => {
  console.error('La importación se ha parado:', e)
  process.exit(1)
})
