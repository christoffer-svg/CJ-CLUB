import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'client'
export type { Language } from '../i18n/translations'
import type { Language } from '../i18n/translations'

/** users/{uid} */
export type UserProfile = {
  role: Role
  name: string
  email: string
  language: Language
  clientId?: string
  /** ids de places guardados como favoritos */
  favorites?: string[]
}

export type ContactType = 'lawyer' | 'gestoria' | 'pool' | 'maintenance' | 'garden' | 'communityAdmin'

/** clients/{clientId} */
export type Client = {
  familyName: string
  property: string
  clientSince: Timestamp
  memberNumber: string
  agentName: string
  agentPhone: string
  agentWhatsapp: string
  contacts: Partial<Record<ContactType, string>>
}

/** partners/{partnerId} */
export type Partner = {
  name: string
  category: ContactType
  phone: string
  description_es: string
  description_en: string
  /** false = desactivado por CJ (no se muestra a los clientes) */
  active?: boolean
}

/** generalContacts/{id} */
export type GeneralContact = {
  group: 'urgencias' | 'salud' | 'transporte'
  name_es: string
  name_en: string
  description_es: string
  description_en: string
  phone: string
  isEmergency: boolean
  order: number
}

/** places/{placeId} */
export type Place = {
  category: 'restaurants' | 'golf' | 'beaches' | 'plans'
  name: string
  meta_es: string
  meta_en: string
  cjNote_es: string
  cjNote_en: string
  discountPercent?: number
  active: boolean
}

/** deals/{dealId} */
export type Deal = {
  title: string
  conditions_es: string
  conditions_en: string
  discountLabel: string
  code: string
  active: boolean
  order: number
}

/** settings/tipOfTheWeek */
export type TipOfTheWeek = {
  text_es: string
  text_en: string
}

/** dealUses/{id}: cada vez que un cliente pulsa "Usar" en un descuento */
export type DealUse = {
  dealId: string
  clientId: string
  date: Timestamp
}
