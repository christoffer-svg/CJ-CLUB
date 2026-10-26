import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'client' | 'business'

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
  /** lugar vinculado; solo el rol "business" */
  placeId?: string
  /** nombre del lugar en el momento del alta */
  businessName?: string
  /** ids de places guardados como favoritos */
  favorites?: string[]
}

/**
 * Id de un servicio de colaborador.
 * Los seis de siempre (lawyer, gestoria, pool, maintenance, garden, communityAdmin)
 * siguen valiendo. Los nuevos los crea CJ en el panel y viven en partnerCategories.
 */
export type ContactType = string

/** clients/{clientId} */
export type Client = {
  familyName: string
  property: string
  clientSince: Timestamp
  memberNumber: string
  agentName: string
  agentPhone: string
  agentWhatsapp: string
  /** Un colaborador por servicio. La clave es el id del servicio. */
  contacts: Partial<Record<string, string>>
  /** ubicación de la vivienda, para calcular distancias */
  location?: GeoPoint
}

/** partners/{partnerId} */
export type Partner = {
  name: string
  /**
   * Primer servicio. Las fichas antiguas solo tienen este campo.
   * Se sigue guardando: si el colaborador tiene varios, es uno de ellos.
   */
  category: ContactType
  /** Todos los servicios. Si falta o está vacío, se usa `category`. */
  categories?: ContactType[]
  phone: string
  description_es: string
  description_en: string
  /** false = desactivado por CJ (no se muestra a los clientes) */
  active?: boolean
}

/** partnerCategories/{id}: oficios que puede ofrecer un colaborador. Los crea CJ, sin cambiar la app. */
export type PartnerCategory = {
  name_es: string
  name_en?: string
  name_nl?: string
  name_sv?: string
  name_de?: string
  name_fr?: string
  /** Clave de icono de línea. Vacío o desconocido: icono por defecto. */
  icon?: string
  order: number
  /** false = oculto: no se ofrece al elegir, pero no se borra */
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

/** Cómo abre el cliente la reserva: enlace del restaurante, llamada o WhatsApp */
export const reservationChannels = ['link', 'phone', 'whatsapp'] as const
export type ReservationChannel = (typeof reservationChannels)[number]

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
  /**
   * Solo restaurantes. Lo configura CJ en el panel, sin tocar la app.
   * Vacío o null: el cliente no ve el botón Reservar.
   */
  reservationChannel?: ReservationChannel | null
  /** URL https, o teléfono (con o sin prefijo) */
  reservationTarget?: string | null
}

/** reservationClicks/{id}: cada vez que un cliente pulsa Reservar */
export type ReservationClick = {
  placeId: string
  clientId: string
  /** uid de quien ha pulsado, si había sesión */
  uid: string
  channel: ReservationChannel
  createdAt: Timestamp | null
}

/** reservationConfirms/{id}: el cliente indica, al volver, que consiguió mesa */
export type ReservationConfirm = {
  placeId: string
  clientId: string
  uid: string
  createdAt: Timestamp | null
}

/**
 * reservationReports/{placeId}_{aaaa-mm}
 * Número de reservas que el restaurante ha comunicado a CJ para ese mes.
 * La app no puede ver las reservas hechas en TheFork, CoverManager u otro sistema.
 */
export type ReservationReport = {
  placeId: string
  /** "2026-10" */
  month: string
  count: number
  updatedAt: Timestamp | null
}

/**
 * deals/{dealId}
 * Los descuentos antiguos los creó CJ y no tienen placeId ni source.
 * Los nuevos los publica el negocio vinculado al lugar.
 */
export type Deal = {
  title: string
  conditions_es: string
  conditions_en: string
  discountLabel: string
  code: string
  active: boolean
  order: number
  placeId?: string
  /** nombre del negocio, copiado de la ficha del lugar */
  businessName?: string
  description_es?: string
  description_en?: string
  /** "YYYY-MM-DD", o vacío si no hay límite */
  validFrom?: string
  validUntil?: string
  /** "business" si lo publicó el negocio. Ausente en los descuentos antiguos de CJ. */
  source?: 'business'
  createdByUid?: string
  /** CJ lo ha ocultado. El negocio no puede quitar esta marca. */
  hiddenByAdmin?: boolean
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

/** Id reservado: el cliente escribe el servicio a mano (no es una categoría de CJ). */
export const ownServiceOther = 'other'

/**
 * clients/{clientId}/ownContacts/{id} si es privado.
 * clients/{clientId}/sharedContacts/{id} si el cliente lo comparte con CJ.
 * El equipo de CJ no puede leer la colección privada. Los negocios tampoco.
 * `service` es el id de una categoría de colaboradores, o "other".
 */
export type OwnContact = {
  name: string
  service: string
  /** Solo si service es "other", p. ej. "Placas solares" */
  serviceOther: string
  phone: string
  email: string
  notes: string
  shareWithCj: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export const houseSections = ['wifi', 'alarm', 'meters', 'keys', 'rubbish', 'other'] as const
export type HouseSection = (typeof houseSections)[number]

/**
 * clients/{clientId}/houseNotes/{id} si es privada.
 * clients/{clientId}/sharedHouseNotes/{id} si el cliente la comparte con CJ.
 */
export type HouseNote = {
  section: HouseSection
  title: string
  body: string
  /** Contraseña o código. Vacío si la nota no tiene. */
  secret: string
  shareWithCj: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
