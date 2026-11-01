/**
 * Crea el primer administrador y los datos de ejemplo de CJ Club.
 *
 * Uso (Firebase real, con la clave de la cuenta de servicio):
 *   npm run seed -- --admin-email=correo@ejemplo.com --admin-name="Nombre"
 *   (necesita la clave en el entorno; ver scripts/credentials.ts)
 * Solo algunas colecciones, sin tocar el resto ni los usuarios:
 *   npm run seed -- --only=settings
 * Uso (Firebase de pruebas local):
 *   npm run seed:emulator -- --admin-email=... [--client-email=...]
 *
 * Se puede repetir sin duplicar nada: usa siempre los mismos identificadores.
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'node:crypto'
import { builtinCategoryList } from '../src/lib/services'
import { adminCredential } from './credentials'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.join('=')]
  }),
)

// --only=settings,deals: escribe solo esas colecciones y no crea usuarios
const only = args['only'] ? args['only'].split(',') : null
const adminEmail = args['admin-email']
const adminName = args['admin-name'] || 'Administrador CJ'
// Opcional (útil en pruebas): si no se indica, se envía un enlace para que elija la suya
const adminPassword = args['admin-password']
// Opcional: crea un acceso de cliente de prueba vinculado a la Familia Jansen
const clientEmail = args['client-email']
const clientPassword = args['client-password']
// Opcional: constructor de prueba con una obra de ejemplo de la Familia Jansen (Mi reforma)
const builderEmail = args['builder-email']
const builderPassword = args['builder-password']

if (!adminEmail && !only) {
  console.error('Falta --admin-email=...')
  process.exit(1)
}

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const app = initializeApp(emulator ? { projectId: 'cj-club' } : { credential: adminCredential(), projectId: 'cj-club' })
const auth = getAuth(app)
const db = getFirestore(app)

async function ensureAuthUser(email: string, displayName: string, password?: string) {
  try {
    const u = await auth.getUserByEmail(email)
    if (password) await auth.updateUser(u.uid, { password })
    return u
  } catch {
    return auth.createUser({
      email,
      displayName,
      emailVerified: true,
      // Si no se indica, contraseña aleatoria que nadie conoce: se elige una propia con el enlace
      password: password || randomBytes(24).toString('base64url'),
    })
  }
}

const date = (iso: string) => Timestamp.fromDate(new Date(iso))

const partners = {
  'lawyer-ruiz': {
    name: 'Ruiz & Asociados Abogados',
    category: 'lawyer',
    phone: '+34 965 000 101',
    description_es: 'Abogados especializados en compraventa, herencias y residencia.',
    description_en: 'Lawyers specialised in property, inheritance and residency.',
    active: true,
  },
  'gestoria-marina': {
    name: 'Gestoría Marina Alta',
    category: 'gestoria',
    phone: '+34 965 000 102',
    description_es: 'Impuestos, NIE, empadronamiento y trámites con la administración.',
    description_en: 'Taxes, NIE, town hall registration and paperwork.',
    active: true,
  },
  'gestoria-vega': {
    name: 'Gestoría Vega Baja',
    category: 'gestoria',
    phone: '+34 966 000 103',
    description_es: 'Trámites, impuestos y declaración de no residentes.',
    description_en: 'Paperwork, taxes and non-resident tax returns.',
    active: true,
  },
  'pool-azul': {
    name: 'Piscinas Azul Costa',
    category: 'pool',
    phone: '+34 600 000 104',
    description_es: 'Mantenimiento semanal de piscinas y reparaciones.',
    description_en: 'Weekly pool maintenance and repairs.',
    active: true,
  },
  'maintenance-casa': {
    name: 'Mantenimiento Casa Blanca',
    category: 'maintenance',
    phone: '+34 600 000 105',
    description_es: 'Fontanería, electricidad, pintura y pequeñas reparaciones.',
    description_en: 'Plumbing, electrical work, painting and small repairs.',
    active: true,
  },
  'garden-verde': {
    name: 'Jardines Verde Mar',
    category: 'garden',
    phone: '+34 600 000 106',
    description_es: 'Cuidado de jardines, riego y poda.',
    description_en: 'Garden care, irrigation and pruning.',
    active: true,
  },
  'community-fincas': {
    name: 'Administración de Fincas Levante',
    category: 'communityAdmin',
    phone: '+34 966 000 107',
    description_es: 'Administración de comunidades de propietarios.',
    description_en: 'Homeowners’ association management.',
    active: true,
  },
}

const clients = {
  jansen: {
    familyName: 'Familia Jansen',
    property: 'Villa en Jávea',
    clientSince: date('2026-04-17'),
    memberNumber: 'CJ 2026 0417',
    agentName: 'Equipo CJ',
    agentPhone: '+34 600 000 001',
    agentWhatsapp: '+34600000001',
    location: { lat: 38.7745, lng: 0.1601 },
    contacts: {
      lawyer: 'lawyer-ruiz',
      gestoria: 'gestoria-marina',
      pool: 'pool-azul',
      maintenance: 'maintenance-casa',
      garden: 'garden-verde',
    },
  },
  lindqvist: {
    familyName: 'Familia Lindqvist',
    property: 'Apartamento en Torrevieja',
    clientSince: date('2025-09-02'),
    memberNumber: 'CJ 2025 0902',
    agentName: 'Equipo CJ',
    agentPhone: '+34 600 000 002',
    agentWhatsapp: '+34600000002',
    location: { lat: 37.9787, lng: -0.6822 },
    contacts: {
      lawyer: 'lawyer-ruiz',
      gestoria: 'gestoria-vega',
      maintenance: 'maintenance-casa',
      communityAdmin: 'community-fincas',
    },
  },
}

const generalContacts = {
  emergencias: {
    group: 'urgencias',
    name_es: 'Emergencias',
    name_en: 'Emergencies',
    description_es: 'Ambulancia, bomberos y policía. Gratuito, 24 horas, atienden en inglés.',
    description_en: 'Ambulance, fire and police. Free, 24 hours, English spoken.',
    phone: '112',
    isEmergency: true,
    order: 1,
  },
  'guardia-civil': {
    group: 'urgencias',
    name_es: 'Guardia Civil',
    name_en: 'Guardia Civil',
    description_es: 'Seguridad ciudadana y denuncias.',
    description_en: 'Public safety and police reports.',
    phone: '062',
    isEmergency: true,
    order: 2,
  },
  'centro-salud': {
    group: 'salud',
    name_es: 'Centro de salud (ejemplo)',
    name_en: 'Health centre (example)',
    description_es: 'Atención primaria. Pida cita con su tarjeta sanitaria.',
    description_en: 'Primary care. Book with your health card.',
    phone: '+34 965 000 201',
    isEmergency: false,
    order: 3,
  },
  'clinica-internacional': {
    group: 'salud',
    name_es: 'Clínica internacional (ejemplo)',
    name_en: 'International clinic (example)',
    description_es: 'Médicos que hablan inglés, alemán y neerlandés.',
    description_en: 'Doctors who speak English, German and Dutch.',
    phone: '+34 965 000 202',
    isEmergency: false,
    order: 4,
  },
  taxi: {
    group: 'transporte',
    name_es: 'Radio Taxi (ejemplo)',
    name_en: 'Radio Taxi (example)',
    description_es: 'Taxis 24 horas y traslados al aeropuerto.',
    description_en: '24-hour taxis and airport transfers.',
    phone: '+34 965 000 301',
    isEmergency: false,
    order: 5,
  },
  'traslados-aeropuerto': {
    group: 'transporte',
    name_es: 'Traslados aeropuerto (ejemplo)',
    name_en: 'Airport transfers (example)',
    description_es: 'Traslados privados a los aeropuertos de Alicante y Valencia.',
    description_en: 'Private transfers to Alicante and Valencia airports.',
    phone: '+34 965 000 302',
    isEmergency: false,
    order: 6,
  },
}

const places = {
  'rest-la-terraza': {
    category: 'restaurants',
    name: 'La Terraza del Puerto',
    meta_es: 'Mediterránea · Frente al mar',
    meta_en: 'Mediterranean · Seafront',
    cjNote_es: 'Pida el arroz del día y reserve mesa en la terraza al atardecer.',
    cjNote_en: 'Order the rice of the day and book a terrace table at sunset.',
    discountPercent: 10,
    active: true,
    location: { lat: 38.7953, lng: 0.1802 },
    reservationChannel: 'link',
    reservationTarget: 'https://example.com/reservar/la-terraza',
    about_es: 'Restaurante familiar en el puerto de Jávea desde 1998. Arroces, pescado de la lonja y una terraza frente al mar.\n\nPregunte por la mesa del rincón al atardecer.',
    about_en: 'Family restaurant on Jávea harbour since 1998. Rice dishes, fish from the market and a seafront terrace.\n\nAsk for the corner table at sunset.',
    hours_es: 'Martes a domingo, 13:00–16:00 y 20:00–23:30. Lunes cerrado.',
    hours_en: 'Tuesday to Sunday, 1–4 pm and 8–11.30 pm. Closed on Mondays.',
    phone: '+34 965 000 111',
    website: 'https://example.com/la-terraza',
    instagram: 'laterrazadelpuerto',
    address: 'Explanada del Puerto 5, 03730 Jávea',
    takeaway: true,
    delivery: true,
    orderInfo_es: 'Pedidos de 12:30 a 15:30 y de 19:30 a 22:30. Reparto en Jávea.',
    orderInfo_en: 'Orders 12.30–3.30 pm and 7.30–10.30 pm. Delivery in Jávea.',
    ordersOpen: true,
    deliveryFee: 3,
    minOrder: 20,
  },
  'rest-casa-olivo': {
    category: 'restaurants',
    name: 'Casa Olivo',
    meta_es: 'Cocina de mercado · Interior',
    meta_en: 'Market cuisine · Inland',
    cjNote_es: 'Un lugar tranquilo para comer los domingos en familia.',
    cjNote_en: 'A quiet spot for Sunday family lunch.',
    active: true,
    location: { lat: 38.7896, lng: 0.1062 },
  },
  'golf-las-colinas': {
    category: 'golf',
    name: 'Golf Club Brisa',
    meta_es: '18 hoyos · Par 72',
    meta_en: '18 holes · Par 72',
    cjNote_es: 'Recorrido con vistas al mar. Mejor a primera hora de la mañana.',
    cjNote_en: 'A course with sea views. Best early in the morning.',
    discountPercent: 15,
    active: true,
    location: { lat: 38.7341, lng: 0.1325 },
  },
  'golf-pinar': {
    category: 'golf',
    name: 'Club de Golf El Pinar',
    meta_es: '9 hoyos · Ideal para empezar',
    meta_en: '9 holes · Great for beginners',
    cjNote_es: 'Tienen clases en inglés para toda la familia.',
    cjNote_en: 'They offer lessons in English for the whole family.',
    active: true,
    location: { lat: 38.6935, lng: 0.0905 },
  },
  'beach-cala-serena': {
    category: 'beaches',
    name: 'Cala Serena',
    meta_es: 'Cala de piedra · Aguas cristalinas',
    meta_en: 'Pebble cove · Crystal-clear water',
    cjNote_es: 'Llegue antes de las 10 en verano: el aparcamiento es pequeño.',
    cjNote_en: 'Arrive before 10am in summer: parking is limited.',
    active: true,
    location: { lat: 38.7385, lng: 0.2205 },
  },
  'plan-ruta-faro': {
    category: 'plans',
    name: 'Ruta del Faro',
    meta_es: 'Senderismo · 2 horas',
    meta_en: 'Hiking · 2 hours',
    cjNote_es: 'Paseo sencillo con vistas espectaculares. Lleve agua.',
    cjNote_en: 'An easy walk with spectacular views. Bring water.',
    active: true,
    location: { lat: 38.8019, lng: 0.2343 },
  },
}

const deals = {
  'deal-terraza': {
    title: 'La Terraza del Puerto',
    conditions_es: 'Descuento en la cuenta total, de lunes a jueves.',
    conditions_en: 'Discount on the total bill, Monday to Thursday.',
    discountLabel: '10%',
    code: 'CJCLUB10',
    active: true,
    order: 1,
  },
  'deal-golf': {
    title: 'Golf Club Brisa',
    conditions_es: 'En green fees, reservando con 48 horas de antelación.',
    conditions_en: 'On green fees, booking 48 hours in advance.',
    discountLabel: '15%',
    code: 'CJGOLF15',
    active: true,
    order: 2,
  },
  'deal-deco': {
    title: 'Interiores Costa',
    conditions_es: 'En mobiliario y textil para el hogar.',
    conditions_en: 'On furniture and home textiles.',
    discountLabel: '20%',
    code: 'CJHOME20',
    active: true,
    order: 3,
  },
  'deal-piscina': {
    title: 'Piscinas Azul Costa',
    conditions_es: 'Primera revisión de la piscina sin coste.',
    conditions_en: 'First pool inspection free of charge.',
    discountLabel: 'Gratis',
    code: 'CJPOOL',
    active: true,
    order: 4,
  },
}

const tipOfTheWeek = {
  text_es:
    'En verano, riegue el jardín a primera hora de la mañana o al anochecer: ahorrará agua y las plantas lo agradecerán.',
  text_en: 'In summer, water the garden early in the morning or after sunset: you will save water and your plants will thank you.',
}

async function main() {
  console.log(emulator ? 'Usando el Firebase de pruebas local' : 'Usando el proyecto real cj-club')

  const batch = db.batch()
  const put = (col: string, data: Record<string, object>) => {
    if (only && !only.includes(col)) return
    Object.entries(data).forEach(([id, d]) => batch.set(db.collection(col).doc(id), d))
  }
  put(
    'partners',
    Object.fromEntries(Object.entries(partners).map(([id, partner]) => [id, { ...partner, categories: [partner.category] }])),
  )
  // Los seis servicios de siempre. Añadir otro se hace en el panel, sin tocar este archivo.
  put(
    'partnerCategories',
    Object.fromEntries(builtinCategoryList.map(({ id, ...data }) => [id, data])),
  )
  put('clients', clients)
  put('generalContacts', generalContacts)
  put('places', places)
  put('deals', deals)
  // Eventos de ejemplo de La Terraza: dentro de unos días (las fechas se calculan al cargar los datos)
  const inDays = (n: number) => {
    const d = new Date(Date.now() + n * 86_400_000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const event = (extra: object) => ({
    placeId: 'rest-la-terraza',
    businessName: 'La Terraza del Puerto',
    endTime: '',
    capacity: 0,
    bookable: true,
    active: true,
    hiddenByAdmin: false,
    photo: null,
    createdByUid: 'seed',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...extra,
  })
  // Platos que se pueden pedir en La Terraza
  if (!only || only.includes('places')) {
    const dishes: [string, string, string, string, number][] = [
      ['d1', 'Entrantes', 'Croquetas de jamón (8 uds.)', 'Caseras, con jamón ibérico.', 8.5],
      ['d2', 'Entrantes', 'Ensalada de la casa', 'Tomate, ventresca y cebolla tierna.', 11],
      ['d3', 'Arroces', 'Paella de marisco (2 pers.)', 'Gamba roja, sepia y mejillón.', 38],
      ['d4', 'Arroces', 'Arroz negro (2 pers.)', 'Con alioli.', 34],
      ['d5', 'Postres', 'Tarta de queso', '', 6.5],
    ]
    dishes.forEach(([id, section, name, description, price], i) =>
      batch.set(db.doc(`places/rest-la-terraza/orderItems/${id}`), { section, name, description, price, available: id !== 'd4', order: (i + 1) * 10 }),
    )
  }
  put('events', {
    'ev-cata': event({
      kind: 'tasting',
      title: 'Cata de vinos de la Marina Alta',
      about_es: 'Cinco vinos de bodegas de la comarca con tapas del chef. Plazas limitadas.',
      about_en: 'Five wines from local wineries with tapas by the chef. Limited places.',
      date: inDays(5),
      time: '19:30',
      endTime: '21:30',
      price: 35,
      capacity: 20,
    }),
    'ev-jazz': event({
      kind: 'music',
      title: 'Jazz en la terraza',
      about_es: 'Trío de jazz en directo al atardecer. Entrada libre con consumición.',
      about_en: 'Live jazz trio at sunset. Free entry with a drink.',
      date: inDays(9),
      time: '20:30',
      price: 0,
      bookable: false,
    }),
  })
  put('settings', { tipOfTheWeek })

  // Conversación y petición de ejemplo de la Familia Jansen
  if (!only || only.includes('conversations')) {
    const minutes = (n: number) => Timestamp.fromMillis(Date.now() - n * 60_000)
    batch.set(db.doc('conversations/jansen'), {
      clientId: 'jansen',
      familyName: 'Familia Jansen',
      lastMessageAt: minutes(30),
      lastMessageText: 'Buenos días. Le confirmo que el técnico de la piscina pasará el martes.',
      lastSender: 'cj',
      clientReadAt: minutes(90),
      cjReadAt: minutes(30),
    })
    batch.set(db.doc('conversations/jansen/messages/m1'), {
      text: 'Hola, la depuradora de la piscina hace un ruido extraño desde ayer. ¿Pueden mandar a alguien?',
      sender: 'client',
      authorUid: 'seed',
      authorName: 'Familia Jansen',
      createdAt: minutes(90),
    })
    batch.set(db.doc('conversations/jansen/messages/m2'), {
      text: 'Buenos días. Le confirmo que el técnico de la piscina pasará el martes.',
      sender: 'cj',
      authorUid: 'seed',
      authorName: 'Equipo CJ',
      createdAt: minutes(30),
    })
  }
  if (!only || only.includes('requests')) {
    batch.set(db.doc('requests/r-jansen-pintura'), {
      clientId: 'jansen',
      familyName: 'Familia Jansen',
      type: 'budget',
      description: 'Presupuesto para pintar la fachada y la valla del jardín.',
      preferredDate: '2026-11-15',
      status: 'in_progress',
      cjNote: 'Estamos pidiendo dos presupuestos. Se los enviamos esta semana.',
      createdByUid: 'seed',
      createdAt: Timestamp.fromDate(new Date('2026-10-20T10:00:00')),
      updatedAt: Timestamp.fromDate(new Date('2026-10-21T09:00:00')),
    })
  }

  if (only) {
    await batch.commit()
    console.log(`Guardado: ${only.join(', ')}`)
    return
  }

  const admin = await ensureAuthUser(adminEmail!, adminName, adminPassword)
  batch.set(db.collection('users').doc(admin.uid), {
    role: 'admin',
    name: adminName,
    email: adminEmail,
    language: 'es',
  })

  if (clientEmail) {
    const client = await ensureAuthUser(clientEmail, 'Familia Jansen', clientPassword)
    batch.set(db.collection('users').doc(client.uid), {
      role: 'client',
      name: 'Familia Jansen',
      email: clientEmail,
      language: 'en',
      clientId: 'jansen',
    })
  }

  if (builderEmail) {
    const builder = await ensureAuthUser(builderEmail, 'Marta Ruiz', builderPassword)
    batch.set(db.collection('users').doc(builder.uid), {
      role: 'builder',
      name: 'Marta Ruiz',
      companyName: 'Reformas Costa Azul',
      email: builderEmail,
      language: 'es',
    })
    const day = (iso: string) => Timestamp.fromDate(new Date(iso))
    const pr = db.doc('projects/p-jansen-cocina')
    batch.set(pr, {
      clientId: 'jansen',
      familyName: 'Familia Jansen',
      property: 'Villa en Jávea',
      title: 'Reforma de la cocina',
      builderUid: builder.uid,
      builderName: 'Reformas Costa Azul',
      reformId: 'r-jansen-cocina',
      designerUids: [],
      status: 'in_progress',
      budget: 18500,
      startDate: '2026-10-05',
      endDate: '2026-12-15',
      createdAt: day('2026-10-01T10:00:00'),
    })
    // La reforma de la cocina (comparte planos entre los contratos de la misma casa y título)
    batch.set(db.doc('reforms/r-jansen-cocina'), {
      clientId: 'jansen',
      title: 'Reforma de la cocina',
      builderUids: [builder.uid],
      designerUids: [],
      updatedAt: day('2026-10-01T10:00:00'),
    })
    // Presupuesto (sin IVA), aún sin firmar: la partida "Cocina completa" a precio cerrado (18.500 €) con lo que incluye, a título orientativo
    batch.set(pr.collection('budgetLines').doc('g1'), {
      kind: 'group',
      title: 'Cocina completa',
      description: 'Desmontaje de la cocina antigua, montaje y remates',
      quantity: 1,
      unit: 'ud',
      unitPrice: 18500,
      order: 1,
      authorUid: builder.uid,
      authorRole: 'builder',
      authorName: 'Marta Ruiz',
      createdAt: day('2026-10-02T10:00:00'),
      updatedAt: day('2026-10-02T10:00:00'),
    })
    const lines: [string, string, string, number, string, number][] = [
      ['l1', 'Muebles de cocina', 'Lacado blanco mate, con cajones de cierre suave', 1, 'ud', 9800],
      ['l2', 'Encimera de cuarzo', 'Color arena, 2 cm, con frente de la zona de cocción', 6.2, 'm²', 450],
      ['l3', 'Electrodomésticos', 'Placa de inducción, horno, campana, lavavajillas y frigorífico integrados', 1, 'ud', 3400],
      ['l4', 'Fontanería y electricidad', 'Nuevas tomas de agua, desagües y circuito de cocina', 1, 'ud', 2510],
    ]
    lines.forEach(([id, title, description, quantity, unit, unitPrice], i) =>
      batch.set(pr.collection('budgetLines').doc(id), {
        kind: 'item',
        parentId: 'g1',
        title,
        description,
        quantity,
        unit,
        unitPrice,
        order: i + 1,
        authorUid: builder.uid,
        authorRole: 'builder',
        authorName: 'Marta Ruiz',
        createdAt: day('2026-10-02T10:00:00'),
        updatedAt: day('2026-10-02T10:00:00'),
      }),
    )
    // Plan de pagos de ejemplo (90 % en tres pagos; el 10 % final queda retenido hasta los repasos)
    batch.set(pr.collection('plan').doc('main'), {
      milestones: [
        { id: 'm1', title: 'Al empezar la obra', percent: 30 },
        { id: 'm2', title: 'A mitad de obra', percent: 30 },
        { id: 'm3', title: 'Al terminar la obra', percent: 30 },
      ],
      authorUid: builder.uid,
      authorRole: 'builder',
      authorName: 'Marta Ruiz',
      updatedAt: day('2026-10-02T10:00:00'),
    })
    batch.set(pr.collection('updates').doc('u1'), {
      title: 'Demolición terminada',
      text: 'Retirados los muebles antiguos y el alicatado. Mañana empieza la fontanería.',
      percent: 25,
      authorUid: builder.uid,
      authorRole: 'builder',
      authorName: 'Marta Ruiz',
      createdAt: day('2026-10-12T17:00:00'),
    })
    batch.set(pr.collection('payments').doc('pay1'), {
      amount: 5550,
      date: '2026-10-05',
      concept: 'Primer pago (30 %) al empezar la obra',
      recordedByUid: builder.uid,
      recordedByRole: 'builder',
      recordedByName: 'Marta Ruiz',
      status: 'confirmed',
      confirmedByUid: 'seed',
      confirmedByRole: 'client',
      confirmedByName: 'Familia Jansen',
      confirmedAt: day('2026-10-06T09:00:00'),
      createdAt: day('2026-10-05T12:00:00'),
    })
    batch.set(pr.collection('extras').doc('x1'), {
      title: 'Enchufes adicionales en la isla',
      description: 'Dos enchufes dobles y una toma USB en la isla central.',
      amount: 420,
      proposedByUid: builder.uid,
      proposedByRole: 'builder',
      proposedByName: 'Marta Ruiz',
      status: 'pending',
      createdAt: day('2026-10-14T11:00:00'),
    })
    batch.set(pr.collection('messages').doc('mm1'), {
      text: 'Buenos días. El viernes llega la encimera; ¿podrá alguien abrir a las 9?',
      sender: 'builder',
      authorUid: builder.uid,
      authorName: 'Marta Ruiz',
      createdAt: day('2026-10-15T08:30:00'),
    })
  }

  await batch.commit()
  console.log('Datos de ejemplo guardados.')
  console.log(`Administrador: ${adminEmail}`)
  if (!emulator) {
    const link = await auth.generatePasswordResetLink(adminEmail!)
    console.log(`Enlace para elegir la contraseña del administrador:\n${link}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
