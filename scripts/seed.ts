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
  put('partners', partners)
  put('clients', clients)
  put('generalContacts', generalContacts)
  put('places', places)
  put('deals', deals)
  put('settings', { tipOfTheWeek })

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
