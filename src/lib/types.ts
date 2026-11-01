import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'client' | 'business' | 'builder' | 'designer'

/** Coordenadas de un punto en el mapa */
export type GeoPoint = { lat: number; lng: number }
export type { Language } from '../i18n/translations'
import type { Language } from '../i18n/translations'

/** users/{uid} */
/** Oficio de un profesional de la obra (constructor, electricista…) */
/** Oficios de obra (cuentas de profesional) */
export const WORK_TRADES = ['construction', 'electrician', 'plumber', 'carpenter', 'painter', 'glazier', 'other'] as const
/** Lo que puede ser un contrato: un oficio, o el arquitecto o el diseñador cuando cobran su parte */
export const TRADES = [...WORK_TRADES, 'architect', 'designer'] as const
export type Trade = (typeof TRADES)[number]

export type UserProfile = {
  /** acceso que está usando ahora */
  role: Role
  /** todos sus accesos con este correo (solo los asigna CJ); las fichas antiguas no lo tienen */
  roles?: Role[]
  name: string
  email: string
  language: Language
  /** casa que está viendo ahora (ficha clients/{clientId}) */
  clientId?: string
  /** todas sus casas; solo las asigna CJ */
  clientIds?: string[]
  /** constructor u otro oficio: nombre de la empresa */
  companyName?: string
  /** oficio del profesional (sin él: constructor) */
  trade?: Trade
  /** arquitecto o diseñador */
  profession?: 'architect' | 'designer'
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
  /** foto de perfil de la casa o la familia (la sube el cliente; función setClientPhoto) */
  photo?: Attachment | null
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
/**
 * Presentación pública de un colaborador (negocio de Descubrir o colaborador de servicios): lo que ve el
 * cliente al pinchar en él. La escriben el propio negocio (desde su panel) o CJ. Todo opcional.
 */
export type PublicProfile = {
  about_es?: string
  about_en?: string
  hours_es?: string
  hours_en?: string
  phone?: string
  email?: string
  /** https://… */
  website?: string
  /** usuario de Instagram, sin @ */
  instagram?: string
  address?: string
  /** logo del negocio (imagen; se sube como las fotos) */
  logo?: Attachment | null
  /** fotos (las sube el servidor: función uploadProfilePhoto); la primera es la portada */
  photos?: Attachment[]
  /** carta del restaurante: fotos o PDF, tal como la tienen */
  menu?: Attachment[]
  /** hace comida para llevar */
  takeaway?: boolean
  /** hace entrega a domicilio */
  delivery?: boolean
  /** cómo pedir: horario de pedidos, zona de reparto, pedido mínimo… */
  orderInfo_es?: string
  orderInfo_en?: string
  /** acepta pedidos dentro de la app (con su lista de platos: places/{id}/orderItems) */
  ordersOpen?: boolean
  /** gastos de envío a domicilio, con IVA (0 = gratis) */
  deliveryFee?: number
  /** pedido mínimo para envío a domicilio, con IVA (0 = sin mínimo) */
  minOrder?: number
}

export const PROFILE_FIELDS = ['about_es', 'about_en', 'hours_es', 'hours_en', 'phone', 'email', 'website', 'instagram', 'address', 'photos', 'menu', 'takeaway', 'delivery', 'orderInfo_es', 'orderInfo_en', 'ordersOpen', 'deliveryFee', 'minOrder', 'logo'] as const
export const MAX_MENU_FILES = 10
export const MAX_PROFILE_PHOTOS = 10

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
} & Omit<PublicProfile, 'phone'>

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
  /** una de las cuatro de siempre (restaurants, golf, beaches, plans) o una creada por CJ (placeCategories) */
  category: string
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
} & PublicProfile

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
/** "service": petición de un servicio del catálogo de CJ (services/{id}) */
export type RequestType = (typeof requestTypes)[number] | 'service'

/**
 * services/{id}: servicio que CJ ofrece a sus clientes (key holding, reforma, vigilancia de la casa…).
 * Lo crea CJ en el panel; el cliente lo pide desde Peticiones.
 */
export type CjService = {
  name_es: string
  name_en: string
  description_es: string
  description_en: string
  /** precio en euros, o null = a consultar */
  price: number | null
  /** junto al precio: "al mes", "desde", "IVA incluido"… */
  priceNote_es: string
  priceNote_en: string
  active: boolean
  order: number
}
export const requestStatuses = ['new', 'in_progress', 'done', 'cancelled'] as const
export type RequestStatus = (typeof requestStatuses)[number]

/** requests/{id}: peticiones de los clientes a CJ */
export type ClientRequest = {
  clientId: string
  familyName: string
  type: RequestType
  /** servicio del catálogo que pide (solo si type es "service") */
  serviceId?: string
  /** nombre del servicio al pedirlo (en español, para el panel) */
  serviceName?: string
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

// ---------- Mi reforma ----------

/** Archivo subido (foto o PDF) en Firebase Storage */
export type Attachment = { path: string; name: string; contentType: string; size: number; url: string }

/** Quién actúa en una obra: el cliente, el constructor o el equipo de CJ */
export type ProjectRole = 'client' | 'builder' | 'cj' | 'designer'

/** projects/{id}: una obra o reforma de una casa (clients/{clientId}) con un constructor */
export type Project = {
  clientId: string
  familyName: string
  property: string
  title: string
  /** profesional del contrato (constructor, electricista…); varios contratos de la misma casa y con el mismo título forman una reforma */
  builderUid: string
  builderName: string
  /** oficio de este contrato (sin él: constructor) */
  trade?: Trade
  /** reforma a la que pertenece (reforms/{id}: planos compartidos) */
  reformId?: string
  /** arquitectos o diseñadores de la reforma: ven conversación, avances y planos, no el dinero */
  designerUids?: string[]
  status: 'planned' | 'in_progress' | 'finished'
  /** presupuesto inicial acordado, en euros, sin IVA */
  budget: number
  /** tipo de IVA de la obra: 21 (general) o 10 (reformas de vivienda); las obras antiguas no lo tienen = 21 */
  vatRate?: 10 | 21
  startDate?: string
  endDate?: string
  createdAt: Timestamp | null
}

/**
 * projects/{id}/budgetLines: el presupuesto (sin IVA); lo escriben el constructor o CJ.
 * "group": una partida (p. ej. baño completo) con su precio cerrado, que es el que cuenta.
 * "item" (o sin kind): un elemento con precio. Con parentId va dentro de una partida y es orientativo
 * (qué incluye y su precio de referencia; no se suma). Sin parentId, es una línea suelta que sí cuenta.
 */
export type BudgetLine = {
  kind?: 'group' | 'item'
  parentId?: string
  title: string
  description: string
  quantity: number
  /** ud, m², m, h… */
  unit: string
  /** precio por unidad, sin IVA */
  unitPrice: number
  order: number
  attachments?: Attachment[]
  authorUid: string
  authorRole: ProjectRole
  authorName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/** Copia de una línea tal como se firmó */
export type SignedLine = { id: string; kind: 'group' | 'item'; parentId: string; title: string; description: string; quantity: number; unit: string; unitPrice: number; photos: number }

/** Un pago del plan (porcentaje del presupuesto firmado, con IVA). El 10 % final queda siempre retenido. */
export type Milestone = { id: string; title: string; percent: number }

/** projects/{id}/plan/release: el cliente da por buenos los repasos y libera el 10 % final */
export type RetentionRelease = { uid: string; name: string; releasedAt: Timestamp | null }

/** projects/{id}/snags: lista de repasos (lo que el constructor tiene que mejorar antes del pago final) */
export type Snag = {
  title: string
  text: string
  attachments?: Attachment[]
  status: 'open' | 'fixed' | 'ok'
  authorUid: string
  authorRole: ProjectRole
  authorName: string
  createdAt: Timestamp | null
  fixedByUid?: string
  fixedByName?: string
  fixedAt?: Timestamp | null
  fixNote?: string
  fixAttachments?: Attachment[]
  okByUid?: string
  okByName?: string
  okAt?: Timestamp | null
  reopenNote?: string
}

/** projects/{id}/signatures/{client|builder}: firma del presupuesto */
export type BudgetSignature = {
  role: 'client' | 'builder'
  uid: string
  name: string
  accepted: true
  /** firma dibujada (PNG) */
  image: string
  /** huella SHA-256 de las líneas firmadas y el tipo de IVA */
  hash: string
  lines: SignedLine[]
  /** plan de pagos firmado (el 10 % final, retenido, no va en la lista) */
  plan?: Milestone[]
  /** total sin IVA de las líneas firmadas */
  base: number
  vatRate: 10 | 21
  /** documento con el que se identificó (las fotos están en identities/{role}, solo para CJ y esa persona) */
  idType?: IdDocType
  signedAt: Timestamp | null
}

export type IdDocType = 'dni' | 'nie' | 'passport'

/** projects/{id}/identities/{client|builder}: DNI, NIE o pasaporte de quien firma. Lo escribe el servidor. */
export type Identity = {
  role: 'client' | 'builder'
  uid: string
  docType: IdDocType
  files: Attachment[]
  createdAt: Timestamp | null
}

/** projects/{id}/selections: producto elegido en tienda con el cliente, con constancia de ambas partes */
export type ProductSelection = {
  title: string
  /** tienda o proveedor donde se eligió */
  store: string
  /** precio en tienda, IVA incluido */
  price: number
  /** referencia o modelo */
  reference: string
  note: string
  /** partida o elemento del presupuesto al que corresponde */
  lineId?: string
  attachments?: Attachment[]
  authorUid: string
  authorRole: ProjectRole
  authorName: string
  createdAt: Timestamp | null
  clientOkUid?: string
  clientOkName?: string
  clientOkAt?: Timestamp | null
  builderOkUid?: string
  builderOkName?: string
  builderOkAt?: Timestamp | null
}

/** projects/{id}/messages: conversación a tres */
export type ProjectMessage = {
  text: string
  sender: ProjectRole
  authorUid: string
  authorName: string
  createdAt: Timestamp | null
}

/** projects/{id}/updates: avances de la obra (los publica el constructor o CJ) */
export type ProjectUpdate = {
  title: string
  text: string
  /** porcentaje de obra hecho, opcional */
  percent?: number
  authorUid: string
  authorRole: ProjectRole
  authorName: string
  /** fotos del avance */
  attachments?: Attachment[]
  createdAt: Timestamp | null
}

/** projects/{id}/payments: pagos; la otra parte los confirma o los discute */
export type ProjectPayment = {
  amount: number
  date: string
  concept: string
  /** pago del plan al que corresponde ('final': el 10 % retenido) */
  milestoneId?: string
  recordedByUid: string
  recordedByRole: ProjectRole
  recordedByName: string
  status: 'pending' | 'confirmed' | 'disputed'
  confirmedByUid?: string
  confirmedByRole?: ProjectRole
  confirmedByName?: string
  confirmedAt?: Timestamp | null
  /** justificantes del pago */
  attachments?: Attachment[]
  createdAt: Timestamp | null
}

/** projects/{id}/extras: trabajos extra con precio; solo el cliente los aprueba o rechaza */
export type ProjectExtra = {
  title: string
  description: string
  amount: number
  /** si sale de la diferencia de un producto elegido (projects/{id}/selections) */
  selectionId?: string
  proposedByUid: string
  proposedByRole: ProjectRole
  proposedByName: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  decidedByUid?: string
  decidedByName?: string
  decidedAt?: Timestamp | null
  decisionNote?: string
  createdAt: Timestamp | null
}

/** reforms/{id}: una reforma (varios contratos de la misma casa con el mismo título); la mantiene CJ */
export type Reform = { clientId: string; title: string; builderUids: string[]; designerUids: string[]; updatedAt: Timestamp | null }

/** reforms/{id}/plans: planos y diseños de la reforma (CJ y arquitectos o diseñadores) */
export type ReformPlan = {
  title: string
  kind: 'plan' | 'design' | 'render' | 'other'
  note: string
  attachments: Attachment[]
  authorUid: string
  authorRole: 'cj' | 'designer'
  authorName: string
  createdAt: Timestamp | null
}

export const EVENT_KINDS = ['tasting', 'music', 'dinner', 'other'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/**
 * events/{id}: evento de un negocio de Descubrir (cata de vino, música en vivo, cena especial…).
 * Lo publica el negocio desde su panel (o CJ). Los clientes lo ven y, si se puede, piden reserva.
 */
export type PlaceEvent = {
  placeId: string
  /** nombre del negocio, copiado de la ficha del lugar */
  businessName: string
  kind: EventKind
  title: string
  about_es: string
  about_en: string
  /** "2026-11-12" */
  date: string
  /** "20:30" */
  time: string
  /** "23:00", o vacío */
  endTime: string
  /** precio por persona con IVA, en euros; 0 = gratis */
  price: number
  /** plazas en total; 0 = sin límite indicado */
  capacity: number
  /** true: los clientes pueden pedir reserva en la app */
  bookable: boolean
  active: boolean
  /** CJ lo ha ocultado (el negocio no puede volver a mostrarlo) */
  hiddenByAdmin: boolean
  /** foto del evento (subida con uploadProfilePhoto, en la carpeta del lugar) */
  photo?: Attachment | null
  createdByUid: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

/**
 * eventBookings/{id}: solicitud de reserva de un cliente para un evento. El negocio la confirma o
 * la rechaza; el cliente puede cancelarla. Se paga en el local.
 */
export type EventBooking = {
  eventId: string
  placeId: string
  /** copia para que el negocio y el cliente lo vean sin abrir el evento */
  eventTitle: string
  eventDate: string
  eventTime: string
  clientId: string
  uid: string
  /** nombre con el que reserva */
  name: string
  people: number
  phone: string
  note: string
  status: BookingStatus
  /** respuesta del negocio (opcional) */
  reply: string
  createdAt: Timestamp | null
  answeredAt: Timestamp | null
  cancelledAt: Timestamp | null
}

/** places/{id}/orderItems/{itemId}: plato que se puede pedir en la app. Lo escribe el restaurante (o CJ). */
export type OrderItem = {
  /** apartado: "Entrantes", "Arroces"… */
  section: string
  name: string
  description: string
  /** precio con IVA, en euros */
  price: number
  /** false = agotado hoy (se ve, pero no se puede pedir) */
  available: boolean
  order: number
}

export type OrderMode = 'pickup' | 'delivery'
export type OrderStatus = 'new' | 'accepted' | 'ready' | 'out' | 'done' | 'declined' | 'cancelled'

/** Línea de un pedido, con el precio que tenía el plato al pedir */
export type OrderLine = { itemId: string; name: string; price: number; qty: number }

/**
 * orders/{id}: pedido de un cliente a un restaurante. Lo crea el servidor (función placeOrder), que
 * toma los precios de la lista de platos del restaurante. Se paga al recoger o al repartidor.
 */
export type FoodOrder = {
  placeId: string
  placeName: string
  clientId: string
  uid: string
  name: string
  phone: string
  mode: OrderMode
  /** solo a domicilio */
  address: string
  /** "asap" (lo antes posible) o "20:30" (hoy) */
  wanted: string
  /** día del pedido, "2026-11-01" */
  day: string
  note: string
  lines: OrderLine[]
  subtotal: number
  deliveryFee: number
  total: number
  status: OrderStatus
  /** mensaje del restaurante (p. ej. "Listo en 30 minutos") */
  reply: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export const SOCIAL_ACTIVITIES = ['golf', 'padel', 'tennis', 'dinner', 'drinks', 'walk', 'beach', 'other'] as const
export type SocialActivity = (typeof SOCIAL_ACTIVITIES)[number]

/**
 * socialPosts/{id}: publicación de un cliente en Social, visible para todos los clientes de CJ con el
 * nombre de su familia. "plan": propone algo (golf, cena, pádel…) entre unas fechas; los demás se
 * apuntan y chatean en privado con quien lo publica. "tip": recomienda un sitio que ha descubierto.
 */
export type SocialPost = {
  kind: 'plan' | 'tip'
  /** solo planes */
  activity: SocialActivity
  title: string
  text: string
  /** planes: desde y hasta ("2026-11-10"); hasta puede ir vacío (un solo día) */
  dateFrom: string
  dateTo: string
  /** dónde: club de golf, restaurante, playa… (opcional) */
  place: string
  /** dirección escrita o enlace de Google Maps (opcional) */
  address?: string
  /** punto exacto, si quien publica usó "mi ubicación actual" */
  location?: GeoPoint | null
  /** hasta 4 fotos (función uploadSocialPhoto) */
  photos: Attachment[]
  clientId: string
  uid: string
  familyName: string
  /** CJ la ha ocultado */
  hidden: boolean
  createdAt: Timestamp | null
}

/** socialPosts/{id}/joins/{clientId}: una familia se apunta a un plan */
export type SocialJoin = { clientId: string; uid: string; familyName: string; createdAt: Timestamp | null }

/**
 * socialChats/{postId}_{clientId}: conversación privada entre quien publica un plan y una familia que
 * se apunta. Solo la ven esas dos casas (CJ no la lee).
 */
export type SocialChat = {
  postId: string
  postTitle: string
  /** [casa que publica, casa que se apunta] */
  members: string[]
  names: Record<string, string>
  lastText: string
  lastClientId: string
  lastAt: Timestamp | null
  /** cuándo leyó cada casa por última vez */
  readAt: Record<string, Timestamp | null>
}

export type SocialMessage = { clientId: string; uid: string; familyName: string; text: string; createdAt: Timestamp | null }

/** socialReports/{id}: un cliente avisa a CJ de una publicación inadecuada */
export type SocialReport = { postId: string; postTitle: string; clientId: string; familyName: string; reason: string; createdAt: Timestamp | null }

/** socialProfiles/{clientId}: lo que los demás clientes ven de una casa en Social (lo escribe el servidor) */
export type SocialProfile = { familyName: string; photo: Attachment | null }

/** Categorías de siempre de Descubrir. "restaurants" tiene reserva, carta y pedidos. */
export const BUILTIN_PLACE_CATEGORIES = ['restaurants', 'golf', 'beaches', 'plans'] as const

/** placeCategories/{id}: categoría de Descubrir creada por CJ (bodegas, spa, tiendas…) */
export type PlaceCategory = {
  name_es: string
  name_en: string
  order: number
  /** false = oculta: ni la categoría ni sus lugares se ven en la app */
  active: boolean
}
