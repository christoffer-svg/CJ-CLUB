/**
 * Importa a Descubrir una "lista preparada" de src/data/suggestedPlaces.ts (golf, centros comerciales…),
 * igual que el botón «Añadir a la app» del panel, pero sin tener que pulsarlo.
 *
 *   npm run import:list -- --list=golf-denia-murcia                 → vista previa (no escribe nada)
 *   npm run import:list -- --list=golf-denia-murcia --write         → añade los que falten
 *   npm run import:list -- --list=golf-denia-murcia --remove --write → borra los importados de esa lista
 * Firebase de pruebas local: añada --emulator.
 *
 * No toca las fichas que ya existen (ni sus fotos, textos o si están visibles). Si CJ ya creó la
 * categoría con un nombre parecido (p. ej. «Centro comerciales»), usa esa.
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { suggestedLists } from '../src/data/suggestedPlaces'
import { adminCredential } from './credentials'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.join('=') || 'true']
  }),
)
const WRITE = args.write === 'true'
const REMOVE = args.remove === 'true'
const BUILTIN = ['restaurants', 'golf', 'beaches', 'plans']

if (args.emulator === 'true') process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'

const list = suggestedLists.find((l) => l.id === args.list)
if (!list) {
  console.error(`Lista no encontrada. Listas: ${suggestedLists.map((l) => l.id).join(', ')}`)
  process.exit(1)
}

const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.replace(/s$/, ''))
    .join(' ')

async function main() {
  console.log(`${list!.title}: ${list!.places.length} lugares. ${WRITE ? 'ESCRIBIENDO en Firebase.' : 'Vista previa: no se escribe nada (añada --write).'}`)
  if (!WRITE) {
    for (const p of list!.places) console.log(`- ${p.name} · ${p.meta_es}${p.website ? ' · ' + p.website : ''}`)
    return
  }
  initializeApp(args.emulator === 'true' ? { projectId: 'cj-club' } : { credential: adminCredential(), projectId: 'cj-club' })
  const db = getFirestore()

  if (REMOVE) {
    const snap = await db.collection('places').where('importedFrom', '==', list!.id).get()
    for (const d of snap.docs) await d.ref.delete()
    console.log(`Borrados ${snap.size} lugares de la lista.`)
    return
  }

  // Categoría: la de siempre (golf…), la que CJ ya tenga con un nombre parecido, o una nueva
  let categoryId = list!.category.id
  if (!BUILTIN.includes(categoryId)) {
    const cats = await db.collection('placeCategories').get()
    const same = cats.docs.find((d) => d.id === categoryId) ?? cats.docs.find((d) => norm(String(d.get('name_es') ?? '')) === norm(list!.category.name_es))
    if (same) categoryId = same.id
    else {
      await db.doc(`placeCategories/${categoryId}`).set({ name_es: list!.category.name_es, name_en: list!.category.name_en, order: list!.category.order, active: true })
      console.log(`Categoría «${list!.category.name_es}» creada.`)
    }
  }

  let created = 0
  let kept = 0
  for (const { id, ...data } of list!.places) {
    const ref = db.doc(`places/${id}`)
    if ((await ref.get()).exists) {
      kept++
      continue
    }
    await ref.set({ ...data, category: categoryId, active: true, discountPercent: null, reservationChannel: null, reservationTarget: null, photos: [], importedFrom: list!.id })
    created++
    console.log(`+ ${data.name}`)
  }
  console.log(`\nListo: ${created} añadidos en «${categoryId}», ${kept} ya estaban.`)
}

main().catch((e) => {
  console.error('La importación se ha parado:', e)
  process.exit(1)
})
