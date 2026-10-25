/**
 * Servicios de los colaboradores (abogado, piscina, y los que CJ añada).
 *
 * Las fichas antiguas solo tienen `category` (un servicio). Se leen como una lista
 * de un elemento. Al guardar se escriben `categories` y se conserva `category`,
 * sin borrar el dato viejo.
 */
import { dataFallback, translations, type Language } from '../i18n/translations'
import type { PartnerCategory } from './types'

export const PARTNER_CATEGORIES = 'partnerCategories'

export const categoryIcons = ['default', 'scales', 'shield', 'wave', 'wrench', 'sun', 'key', 'home'] as const
export type CategoryIcon = (typeof categoryIcons)[number]

export const categoryIconChoices: { id: CategoryIcon; label: string }[] = [
  { id: 'default', label: 'Por defecto' },
  { id: 'scales', label: 'Balanza' },
  { id: 'shield', label: 'Escudo' },
  { id: 'wave', label: 'Agua' },
  { id: 'wrench', label: 'Herramienta' },
  { id: 'sun', label: 'Sol' },
  { id: 'key', label: 'Llave' },
  { id: 'home', label: 'Casa' },
]

const nameLangs = ['es', 'en', 'nl', 'sv', 'de', 'fr'] as const
export type CategoryNameField = `name_${(typeof nameLangs)[number]}`

/** Los seis servicios de siempre. Si Firestore aún no los tiene, la app los muestra igual. */
export const builtinCategoryList: (PartnerCategory & { id: string })[] = [
  {
    id: 'lawyer',
    name_es: 'Abogado',
    name_en: 'Lawyer',
    name_nl: 'Advocaat',
    name_sv: 'Advokat',
    name_de: 'Anwalt',
    name_fr: 'Avocat',
    icon: 'scales',
    order: 1,
    active: true,
  },
  {
    id: 'gestoria',
    name_es: 'Gestoría',
    name_en: 'Gestoría',
    name_nl: 'Gestoría',
    name_sv: 'Gestoría',
    name_de: 'Gestoría',
    name_fr: 'Gestoría',
    icon: 'shield',
    order: 2,
    active: true,
  },
  {
    id: 'pool',
    name_es: 'Piscina',
    name_en: 'Pool',
    name_nl: 'Zwembad',
    name_sv: 'Pool',
    name_de: 'Pool',
    name_fr: 'Piscine',
    icon: 'wave',
    order: 3,
    active: true,
  },
  {
    id: 'maintenance',
    name_es: 'Mantenimiento',
    name_en: 'Maintenance',
    name_nl: 'Onderhoud',
    name_sv: 'Underhåll',
    name_de: 'Instandhaltung',
    name_fr: 'Entretien',
    icon: 'wrench',
    order: 4,
    active: true,
  },
  {
    id: 'garden',
    name_es: 'Jardinería',
    name_en: 'Gardening',
    name_nl: 'Tuin',
    name_sv: 'Trädgård',
    name_de: 'Garten',
    name_fr: 'Jardin',
    icon: 'sun',
    order: 5,
    active: true,
  },
  {
    id: 'communityAdmin',
    name_es: 'Administrador de fincas',
    name_en: 'Community administrator',
    name_nl: 'VvE-beheerder',
    name_sv: 'Förvaltare',
    name_de: 'Hausverwaltung',
    name_fr: 'Syndic',
    icon: 'key',
    order: 6,
    active: true,
  },
]

const builtinById = new Map(builtinCategoryList.map((c) => [c.id, c]))

export type MergedCategory = {
  id: string
  name_es: string
  name_en: string
  name_nl: string
  name_sv: string
  name_de: string
  name_fr: string
  icon: CategoryIcon
  order: number
  active: boolean
  /** Forma parte de los seis de siempre */
  builtin: boolean
  /** Hay un documento en Firestore con este id */
  stored: boolean
}

export function normalizeIcon(icon: unknown): CategoryIcon {
  return categoryIcons.includes(icon as CategoryIcon) ? (icon as CategoryIcon) : 'default'
}

function nameOf(cat: PartnerCategory | undefined, lang: (typeof nameLangs)[number]): string | undefined {
  const value = cat?.[`name_${lang}`]
  return typeof value === 'string' ? value : undefined
}

/**
 * Junta los servicios guardados con los seis de siempre.
 * Un documento de Firestore manda sobre el de código (así se puede renombrar u ocultar).
 * Si un idioma no viene en el documento, se conserva el texto de siempre.
 */
export function mergeCategories(stored: (PartnerCategory & { id: string })[]): MergedCategory[] {
  const byId = new Map(stored.filter((d) => d.id && !d.id.includes('/')).map((d) => [d.id, d]))
  const ids = builtinCategoryList.map((c) => c.id)
  for (const id of byId.keys()) if (!ids.includes(id)) ids.push(id)

  const merged = ids.map((id) => {
    const base = builtinById.get(id)
    const doc = byId.get(id)
    const name = (lang: (typeof nameLangs)[number]) => {
      const fromDoc = doc ? nameOf(doc, lang) : undefined
      if (fromDoc !== undefined) return fromDoc
      return nameOf(base, lang) ?? ''
    }
    const nameEs = name('es').trim() || base?.name_es || id
    return {
      id,
      name_es: nameEs,
      name_en: name('en'),
      name_nl: name('nl'),
      name_sv: name('sv'),
      name_de: name('de'),
      name_fr: name('fr'),
      icon: normalizeIcon(typeof doc?.icon === 'string' && doc.icon ? doc.icon : base?.icon),
      order: typeof doc?.order === 'number' ? doc.order : (base?.order ?? 100),
      active: doc && typeof doc.active === 'boolean' ? doc.active : (base?.active ?? true),
      builtin: Boolean(base),
      stored: Boolean(doc),
    }
  })

  return merged.sort((a, b) => a.order - b.order || a.name_es.localeCompare(b.name_es, 'es') || a.id.localeCompare(b.id))
}

/** Nombre en el idioma del cliente. Si falta, inglés y después español. */
export function categoryName(cat: MergedCategory | undefined, lang: Language): string {
  if (!cat) return ''
  for (const code of dataFallback(lang)) {
    const value = cat[`name_${code}`].trim()
    if (value) return value
  }
  return ''
}

function personalGuideLabel(lang: Language, id: string): string | null {
  const key = `guide.type.${id}`
  const es = translations.es as Record<string, string>
  if (!Object.prototype.hasOwnProperty.call(es, key)) return null
  return (translations[lang] as Record<string, string>)[key] ?? null
}

/**
 * Texto que ve el cliente.
 * Si el servicio de siempre no se ha renombrado, se mantiene «Su abogado», «Your lawyer», etc.
 * Una traducción escrita en el panel manda. Si se deja vacía, y el nombre en español cambió,
 * se muestra el español.
 */
export function clientServiceLabel(id: string, lang: Language, categories: MergedCategory[]): string {
  const cat = categories.find((c) => c.id === id)
  if (!cat) return personalGuideLabel(lang, id) ?? id
  if (!cat.builtin) return categoryName(cat, lang) || id

  const base = builtinById.get(id)
  if (lang !== 'es' && base) {
    const value = cat[`name_${lang}`].trim()
    const original = (base[`name_${lang}`] ?? '').trim()
    if (value && value !== original) return value
  }
  if (base && cat.name_es.trim() !== base.name_es.trim()) return cat.name_es.trim()
  return personalGuideLabel(lang, id) ?? cat.name_es
}

/** Valor del formulario: las traducciones iguales a las de siempre se ven vacías (son opcionales). */
export function editableTranslation(cat: MergedCategory, lang: Exclude<Language, 'es'>): string {
  const value = cat[`name_${lang}`].trim()
  const base = builtinById.get(cat.id)
  if (!base) return value
  const original = (base[`name_${lang}`] ?? '').trim()
  if (!value || value === original) return ''
  return value
}

export function storedFromMerged(cat: MergedCategory, patch?: { order?: number; active?: boolean }): PartnerCategory {
  return {
    name_es: cat.name_es.trim(),
    name_en: cat.name_en.trim(),
    name_nl: cat.name_nl.trim(),
    name_sv: cat.name_sv.trim(),
    name_de: cat.name_de.trim(),
    name_fr: cat.name_fr.trim(),
    icon: cat.icon,
    order: patch?.order ?? cat.order,
    active: patch?.active ?? cat.active,
  }
}

/** Id seguro para Firestore y para la clave contacts.{id}: sin puntos ni espacios. */
export function categorySlug(name: string, taken: Set<string>): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/g, '') || 'servicio'
  let id = base
  let n = 2
  while (taken.has(id)) {
    const suffix = `-${n}`
    id = `${base.slice(0, 40 - suffix.length)}${suffix}`
    n += 1
  }
  return id
}

/** Servicios de un colaborador. Si solo existe el campo antiguo, es una lista de uno. */
export function partnerServiceIds(partner: { category?: unknown; categories?: unknown }): string[] {
  const fromList = Array.isArray(partner.categories)
    ? partner.categories.filter((id): id is string => typeof id === 'string' && id.trim() !== '').map((id) => id.trim())
    : []
  const unique = [...new Set(fromList)]
  if (unique.length > 0) return unique
  if (typeof partner.category === 'string' && partner.category.trim()) return [partner.category.trim()]
  return []
}

export function partnerOffers(partner: { category?: unknown; categories?: unknown }, serviceId: string) {
  return partnerServiceIds(partner).includes(serviceId)
}

export function sortServiceIds(ids: string[], categories: { id: string }[]): string[] {
  const order = new Map(categories.map((c, index) => [c.id, index]))
  return [...new Set(ids)].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b))
}

/** Orden de la lista oficial, y al final los que no estén en ella. Sin duplicados. */
export function orderedSelection(selected: string[], orderedIds: string[]): string[] {
  const unique = [...new Set(selected.map((id) => id.trim()).filter(Boolean))]
  const set = new Set(unique)
  const inOrder = orderedIds.filter((id) => set.has(id))
  const rest = unique.filter((id) => !orderedIds.includes(id))
  return [...inOrder, ...rest]
}

/**
 * Campo `category` que se sigue guardando. Si el servicio de antes sigue marcado, no cambia
 * (las fichas antiguas siguen apuntando al mismo). Si se quita, pasa a ser el primero que quede.
 */
export function legacyCategory(previous: unknown, selected: string[], orderedIds: string[]): string {
  const prev = typeof previous === 'string' ? previous.trim() : ''
  if (prev && selected.includes(prev)) return prev
  for (const id of orderedIds) if (selected.includes(id)) return id
  return selected[0] ?? prev
}

export function servicesToSave(previousCategory: unknown, selected: string[], orderedIds: string[]) {
  const categories = orderedSelection(selected, orderedIds)
  return { categories, category: legacyCategory(previousCategory, categories, orderedIds) }
}

export function categoryInUse(
  id: string,
  partners: { category?: unknown; categories?: unknown }[],
  clients: { contacts?: Partial<Record<string, string>> | null }[],
) {
  if (partners.some((partner) => partnerOffers(partner, id))) return true
  return clients.some((client) => Boolean(client.contacts?.[id]))
}
