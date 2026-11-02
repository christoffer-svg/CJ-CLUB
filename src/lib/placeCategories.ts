/** Categorías de Descubrir: las cuatro de siempre y las que añade CJ desde el panel */
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from './firebase'
import { BUILTIN_PLACE_CATEGORIES, type PlaceCategory } from './types'
import { autoTranslate } from './autoTranslate'

export type CategoryItem = { id: string; builtin: boolean; order: number; active: boolean; name_es: string; name_en: string }

/** Nombre en español de las de siempre (para el panel) */
export const builtinNameEs: Record<string, string> = { restaurants: 'Restaurantes', golf: 'Golf', beaches: 'Playas', plans: 'Planes' }
const builtinNameEn: Record<string, string> = { restaurants: 'Restaurants', golf: 'Golf', beaches: 'Beaches', plans: 'Plans' }

/** Todas las categorías, por orden. includeHidden: también las ocultas (panel) */
export function usePlaceCategories(includeHidden = false) {
  const [custom, setCustom] = useState<CategoryItem[]>([])
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'placeCategories'),
        (snap) => setCustom(snap.docs.map((d) => ({ ...(d.data() as PlaceCategory), id: d.id, builtin: false }))),
        () => setCustom([]),
      ),
    [],
  )
  const builtin: CategoryItem[] = BUILTIN_PLACE_CATEGORIES.map((id, i) => ({
    id,
    builtin: true,
    order: (i + 1) * 10,
    active: true,
    name_es: builtinNameEs[id],
    name_en: builtinNameEn[id],
  }))
  return [...builtin, ...custom].filter((c) => includeHidden || c.active).sort((a, b) => a.order - b.order || a.name_es.localeCompare(b.name_es))
}

/** Id nuevo a partir del nombre: "Bodegas y vinos" → "bodegas-y-vinos" */
export function categoryIdFrom(name: string) {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  return slug && !(BUILTIN_PLACE_CATEGORIES as readonly string[]).includes(slug) && !['all', 'events', 'saved'].includes(slug) ? slug : `cat-${Date.now()}`
}

export const savePlaceCategory = (id: string, c: PlaceCategory) =>
  setDoc(doc(db, 'placeCategories', id), {
    name_es: c.name_es.trim().slice(0, 40),
    name_en: c.name_en.trim().slice(0, 40),
    order: Math.max(0, Math.round(c.order)),
    active: c.active,
  }).then(() => autoTranslate(`placeCategories/${id}`))

export const deletePlaceCategory = (id: string) => deleteDoc(doc(db, 'placeCategories', id))

/** Nombre de una categoría en el idioma del cliente */
export function categoryLabel(
  id: string,
  cats: CategoryItem[],
  t: (k: `discover.filter.${'restaurants' | 'golf' | 'beaches' | 'plans'}`) => string,
  pick: (item: object | null | undefined, field: string) => string,
) {
  if ((BUILTIN_PLACE_CATEGORIES as readonly string[]).includes(id)) return t(`discover.filter.${id as 'restaurants'}`)
  const c = cats.find((x) => x.id === id)
  return c ? pick(c, 'name') || c.name_es : ''
}
