import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'client'

/** Coordenadas de un punto en el mapa */
export type GeoPoint = { lat: number; lng: number }
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
  /** ubicación de la vivienda, para calcular distancias */
  location?: GeoPoint
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
  discountPercent?: number | null
  active: boolean
  location?: GeoPoint
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

/** conversations/{clientId}: una conversación por cliente con el equipo de CJ (resumen para las listas) */
export type Conversation = {
  clientId: string
  familyName: string
  lastMessageAt: Timestamp
  lastMessageText: string
  lastSender: 'client' | 'cj'
  /** última vez que cada parte abrió la conversación */
  clientReadAt?: Timestamp
  cjReadAt?: Timestamp
}

/** conversations/{clientId}/messages/{id} */
export type Message = {
  text: string
  sender: 'client' | 'cj'
  authorUid: string
  authorName: string
  /** null mientras se envía (hora del servidor) */
  createdAt: Timestamp | null
}

export const requestTypes = ['repair', 'budget', 'keys', 'cleaning', 'other'] as const
export type RequestType = (typeof requestTypes)[number]
export const requestStatuses = ['new', 'in_progress', 'done', 'cancelled'] as const
export type RequestStatus = (typeof requestStatuses)[number]

/** requests/{id}: peticiones de los clientes a CJ */
export type ClientRequest = {
  clientId: string
  familyName: string
  type: RequestType
  description: string
  /** fecha preferida "2026-11-03", opcional */
  preferredDate?: string
  status: RequestStatus
  /** comentario de CJ que ve el cliente */
  cjNote?: string
  createdByUid: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
