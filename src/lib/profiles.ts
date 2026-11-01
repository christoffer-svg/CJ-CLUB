/** Presentación pública de los colaboradores (negocios de Descubrir y colaboradores de servicios) */
import { doc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { MAX_BYTES, prepare, toBase64 } from './attachments'
import { db, functions } from './firebase'
import { PROFILE_FIELDS, type Attachment, type PublicProfile } from './types'

export type ProfileCollection = 'places' | 'partners'

type Req = { collection: ProfileCollection; id: string; kind: 'photos' | 'menu'; name: string; contentType: string; data: string }

/** Sube fotos de la presentación (reducidas a 1600 px), o de la carta (fotos o PDF), y devuelve sus fichas */
export async function uploadProfilePhotos(coll: ProfileCollection, id: string, files: File[], kind: 'photos' | 'menu' | 'logo' = 'photos'): Promise<Attachment[]> {
  const call = httpsCallable<Req, Attachment>(functions, 'uploadProfilePhoto', { timeout: 120_000 })
  const out: Attachment[] = []
  for (const file of files) {
    const { blob, name, type } = await prepare(file, kind === 'logo')
    if (blob.size > MAX_BYTES) throw new Error('too-big')
    // El logo va en la carpeta de fotos
    out.push((await call({ collection: coll, id, kind: kind === 'menu' ? 'menu' : 'photos', name, contentType: type, data: await toBase64(blob) })).data)
  }
  return out
}

/** Textos limpios: sin espacios sobrantes; la web, con https:// delante */
export function cleanProfile(p: PublicProfile): PublicProfile {
  const tr = (s: string | undefined, max: number) => (s ?? '').trim().slice(0, max)
  let website = tr(p.website, 300)
  if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website
  website = website.replace(/^http:\/\//i, 'https://').replace(/\s/g, '')
  return {
    about_es: tr(p.about_es, 4000),
    about_en: tr(p.about_en, 4000),
    hours_es: tr(p.hours_es, 600),
    hours_en: tr(p.hours_en, 600),
    phone: tr(p.phone, 40),
    email: tr(p.email, 120),
    website,
    instagram: tr(p.instagram, 100).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, ''),
    address: tr(p.address, 300),
    logo: p.logo ?? null,
    photos: (p.photos ?? []).slice(0, 10),
    menu: (p.menu ?? []).slice(0, 10),
    takeaway: p.takeaway === true,
    delivery: p.delivery === true,
    orderInfo_es: tr(p.orderInfo_es, 600),
    orderInfo_en: tr(p.orderInfo_en, 600),
  }
}

/** Guarda solo los campos de la presentación (el resto de la ficha no se toca) */
export function saveProfile(coll: ProfileCollection, id: string, p: PublicProfile, keepPhone = true) {
  const data = cleanProfile(p) as Record<string, unknown>
  // En los colaboradores de servicios, el teléfono es el de su ficha y lo cambia CJ ahí
  if (!keepPhone) delete data.phone
  return updateDoc(doc(db, coll, id), data)
}

export const profileOf = (item: object | null | undefined): PublicProfile => {
  const rec = (item ?? {}) as Record<string, unknown>
  return Object.fromEntries(PROFILE_FIELDS.map((f) => [f, rec[f]]).filter(([, v]) => v !== undefined)) as PublicProfile
}

/** ¿Tiene algo que enseñar más allá del nombre? */
export const hasProfile = (p: PublicProfile) =>
  Boolean(p.about_es || p.about_en || p.photos?.length || p.menu?.length || p.takeaway || p.delivery || p.hours_es || p.website || p.instagram || p.email || p.address)

export const instagramUrl = (user: string) => `https://www.instagram.com/${encodeURIComponent(user)}/`
export const websiteLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')

/** Quita los campos de la presentación: el formulario de la ficha no los guarda (no pisa lo que haya escrito el negocio) */
export function withoutProfile<T extends object>(data: T): T {
  const out = { ...data } as Record<string, unknown>
  for (const f of PROFILE_FIELDS) if (f !== 'phone') delete out[f]
  return out as T
}
