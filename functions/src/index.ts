/**
 * Funciones de servidor de CJ Club.
 * Se ejecutan con permisos de administrador de Firebase, por eso comprueban siempre
 * quién llama y qué puede hacer.
 */
import { initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { googleTranslate, translateDoc, TRANSLATE_LANGS } from './autoTranslate.js'
import { REFORM_LANGS, translateProject } from './projectTranslate.js'
import { invitationEmail, isMailLanguage, noticeEmail, sendWithResend, type MailRole } from './email.js'

initializeApp()

// Almacén de archivos (fotos y PDF de Mi reforma)
const BUCKET = 'cj-club.firebasestorage.app'

/**
 * El almacén. En Firebase real el servidor tiene acceso de administrador; en el Firebase de pruebas
 * local hay que identificarse como "owner" para que las reglas (todo cerrado) no le apliquen.
 */
type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>
async function projectBucket(): Promise<Bucket> {
  if (process.env.FUNCTIONS_EMULATOR !== 'true' || !process.env.STORAGE_EMULATOR_HOST) return getStorage().bucket(BUCKET)
  const { Storage } = await import('@google-cloud/storage')
  const { OAuth2Client } = await import('google-auth-library')
  const authClient = new OAuth2Client()
  authClient.setCredentials({ access_token: 'owner', expiry_date: Date.now() + 3600_000 })
  return new Storage({ apiEndpoint: process.env.STORAGE_EMULATOR_HOST, projectId: 'cj-club', authClient, useAuthWithCustomEndpoint: true }).bucket(BUCKET) as unknown as Bucket
}
setGlobalOptions({ region: 'europe-southwest1', maxInstances: 5 })

const db = getFirestore()

async function requireAdmin(uid: string | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const me = await db.doc(`users/${uid}`).get()
  if (me.get('role') !== 'admin') throw new HttpsError('permission-denied', 'Solo el equipo de CJ puede hacer esto.')
}

function text(value: unknown, field: string, required = true) {
  const s = typeof value === 'string' ? value.trim() : ''
  if (required && !s) throw new HttpsError('invalid-argument', `Falta: ${field}.`)
  if (s.length > 200) throw new HttpsError('invalid-argument', `Demasiado largo: ${field}.`)
  return s
}

/** "CJ 2026 0417" a partir de la fecha de alta; si ya existe, "CJ 2026 0417-2", "-3"... */
async function nextMemberNumber(date: Date) {
  const base = `CJ ${date.getFullYear()} ${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const taken = await db.collection('clients').where('memberNumber', '==', candidate).limit(1).get()
    if (taken.empty) return candidate
  }
  throw new HttpsError('resource-exhausted', 'No se pudo generar el número de socio.')
}

type Role = 'admin' | 'client' | 'business' | 'builder' | 'designer'

/** Accesos de una persona. Las fichas antiguas solo tienen "role". */
function rolesOf(profile: FirebaseFirestore.DocumentSnapshot): Role[] {
  const roles = profile.get('roles')
  return Array.isArray(roles) && roles.length ? (roles as Role[]) : profile.get('role') ? [profile.get('role') as Role] : []
}

/**
 * Ficha de una cuenta que ya existe, para añadirle otro acceso con el mismo correo
 * (p. ej. un cliente que también tiene un negocio). Su acceso activo no cambia.
 */
async function existingProfile(uid: string) {
  const profile = await db.doc(`users/${uid}`).get()
  if (!profile.exists) throw new HttpsError('already-exists', 'Ese correo tiene una cuenta sin ficha en la app. Avise a quien mantiene la app.')
  return profile
}

/**
 * Crea un cliente nuevo: su cuenta de acceso (rol "client"), su ficha en clients/
 * y su perfil en users/. La invitación para elegir contraseña la envía después la app.
 * Si el correo ya tiene cuenta (de cliente, negocio, constructor o del equipo), la ficha nueva se añade
 * como otra casa de esa cuenta (users/{uid}.clientIds) y no se crea otra cuenta.
 */
export const createClient = onCall(async (request) => {
  await requireAdmin(request.auth?.uid)
  const data = (request.data ?? {}) as Record<string, unknown>

  const familyName = text(data.familyName, 'nombre de la familia')
  const email = text(data.email, 'correo').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'El correo no es válido.')
  const property = text(data.property, 'propiedad', false)
  const agentName = text(data.agentName, 'agente', false)
  const agentPhone = text(data.agentPhone, 'teléfono del agente', false)
  const agentWhatsapp = text(data.agentWhatsapp, 'WhatsApp del agente', false)
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr', 'pl']
  const language = typeof data.language === 'string' && languages.includes(data.language) ? data.language : 'en'
  const since = new Date(text(data.clientSince, 'fecha de alta'))
  if (Number.isNaN(since.getTime())) throw new HttpsError('invalid-argument', 'La fecha de alta no es válida.')

  const auth = getAuth()
  const existing = await auth.getUserByEmail(email).catch(() => null)
  if (existing) {
    const profile = await existingProfile(existing.uid)
    // Otra casa para la misma persona (y, si aún no era cliente, también el acceso de cliente)
    const memberNumber = await nextMemberNumber(since)
    const clientRef = db.collection('clients').doc()
    const current = profile.get('clientId') as string | undefined
    const houses = new Set<string>([...((profile.get('clientIds') as string[] | undefined) ?? []), ...(current ? [current] : [])])
    houses.add(clientRef.id)
    const batch = db.batch()
    batch.set(clientRef, {
      familyName,
      property,
      clientSince: Timestamp.fromDate(since),
      memberNumber,
      agentName,
      agentPhone,
      agentWhatsapp,
      contacts: {},
      createdAt: FieldValue.serverTimestamp(),
    })
    batch.update(profile.ref, {
      clientIds: [...houses],
      roles: [...new Set<Role>([...rolesOf(profile), 'client'])],
      ...(current ? {} : { clientId: clientRef.id }),
    })
    await batch.commit()
    return { clientId: clientRef.id, uid: existing.uid, memberNumber, addedToExisting: true }
  }

  const memberNumber = await nextMemberNumber(since)
  const user = await auth.createUser({
    email,
    displayName: familyName,
    // Contraseña aleatoria que nadie conoce: el cliente elige la suya con el enlace de invitación
    password: randomBytes(24).toString('base64url'),
  })

  const clientRef = db.collection('clients').doc()
  try {
    const batch = db.batch()
    batch.set(clientRef, {
      familyName,
      property,
      clientSince: Timestamp.fromDate(since),
      memberNumber,
      agentName,
      agentPhone,
      agentWhatsapp,
      contacts: {},
      createdAt: FieldValue.serverTimestamp(),
    })
    batch.set(db.doc(`users/${user.uid}`), {
      role: 'client',
      roles: ['client'],
      name: familyName,
      email,
      language,
      clientId: clientRef.id,
      clientIds: [clientRef.id],
    })
    await batch.commit()
  } catch (e) {
    // Si no se pudo guardar la ficha, no dejamos una cuenta suelta
    await auth.deleteUser(user.uid).catch(() => {})
    throw e
  }

  return { clientId: clientRef.id, uid: user.uid, memberNumber, addedToExisting: false }
})

/** "2026-10" en el calendario de España */
function monthKeyMadrid(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).format(date)
}

/**
 * Crea el acceso de un negocio vinculado a un lugar: cuenta (rol "business") y ficha en users/.
 * La invitación para elegir contraseña la envía después la app, igual que con los clientes.
 * Si el correo ya tiene cuenta, se le añade el acceso de negocio (entra con su contraseña de siempre).
 */
export const createBusiness = onCall(async (request) => {
  await requireAdmin(request.auth?.uid)
  const data = (request.data ?? {}) as Record<string, unknown>

  const placeId = text(data.placeId, 'lugar')
  if (placeId.includes('/')) throw new HttpsError('invalid-argument', 'El lugar no es válido.')
  const contactName = text(data.contactName, 'nombre de la persona')
  const email = text(data.email, 'correo').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'El correo no es válido.')
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr', 'pl']
  const language = typeof data.language === 'string' && languages.includes(data.language) ? data.language : 'es'

  const place = await db.doc(`places/${placeId}`).get()
  if (!place.exists) throw new HttpsError('not-found', 'Ese lugar no existe. Créelo antes en Lugares.')
  const businessName = typeof place.get('name') === 'string' ? place.get('name').trim() : ''
  if (!businessName) throw new HttpsError('failed-precondition', 'Ese lugar no tiene nombre.')
  if (businessName.length > 200) throw new HttpsError('invalid-argument', 'El nombre del lugar es demasiado largo.')

  const auth = getAuth()
  const existing = await auth.getUserByEmail(email).catch(() => null)
  if (existing) {
    const profile = await existingProfile(existing.uid)
    if (rolesOf(profile).includes('business')) {
      throw new HttpsError('already-exists', 'Ese correo ya es el acceso de un negocio. Cada correo puede llevar un solo negocio.')
    }
    await profile.ref.update({ roles: [...rolesOf(profile), 'business'], placeId, businessName })
    return { uid: existing.uid, placeId, businessName, addedToExisting: true }
  }

  const user = await auth.createUser({
    email,
    displayName: contactName,
    password: randomBytes(24).toString('base64url'),
  })

  try {
    await db.doc(`users/${user.uid}`).set({
      role: 'business',
      roles: ['business'],
      name: contactName,
      email,
      language,
      placeId,
      businessName,
    })
  } catch (e) {
    await auth.deleteUser(user.uid).catch(() => {})
    throw e
  }

  return { uid: user.uid, placeId, businessName, addedToExisting: false }
})

/**
 * Crea el acceso de un profesional de la obra para "Mi reforma" (constructor, electricista, carpintero…):
 * cuenta (rol "builder", con su oficio) y ficha en users/.
 * Solo ve las obras en las que CJ le asigne. La invitación la envía después la app.
 * Si el correo ya tiene cuenta, se le añade el acceso de constructor (entra con su contraseña de siempre).
 */
export const createBuilder = onCall(async (request) => {
  await requireAdmin(request.auth?.uid)
  const data = (request.data ?? {}) as Record<string, unknown>
  const name = text(data.name, 'nombre de la persona')
  const companyName = text(data.companyName, 'empresa')
  const trades = ['construction', 'electrician', 'plumber', 'carpenter', 'painter', 'glazier', 'other']
  const trade = typeof data.trade === 'string' && trades.includes(data.trade) ? data.trade : 'construction'
  const email = text(data.email, 'correo').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'El correo no es válido.')
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr', 'pl']
  const language = typeof data.language === 'string' && languages.includes(data.language) ? data.language : 'es'

  const auth = getAuth()
  const existing = await auth.getUserByEmail(email).catch(() => null)
  if (existing) {
    const profile = await existingProfile(existing.uid)
    if (rolesOf(profile).includes('builder')) throw new HttpsError('already-exists', 'Ese correo ya es el acceso de un constructor.')
    await profile.ref.update({ roles: [...rolesOf(profile), 'builder'], companyName, trade })
    return { uid: existing.uid, addedToExisting: true }
  }

  const user = await auth.createUser({ email, displayName: name, password: randomBytes(24).toString('base64url') })
  try {
    await db.doc(`users/${user.uid}`).set({ role: 'builder', roles: ['builder'], name, companyName, trade, email, language })
  } catch (e) {
    await auth.deleteUser(user.uid).catch(() => {})
    throw e
  }
  return { uid: user.uid, addedToExisting: false }
})

/**
 * Crea el acceso de un arquitecto o diseñador para "Mi reforma": cuenta (rol "designer", con su profesión) y
 * ficha en users/. CJ lo asigna después a una o varias reformas.
 * Solo ve las obras en las que CJ le asigne. La invitación la envía después la app.
 * Si el correo ya tiene cuenta, se le añade el acceso de constructor (entra con su contraseña de siempre).
 */
export const createDesigner = onCall(async (request) => {
  await requireAdmin(request.auth?.uid)
  const data = (request.data ?? {}) as Record<string, unknown>
  const name = text(data.name, 'nombre de la persona')
  const companyName = text(data.companyName, 'estudio', false)
  const profession = data.profession === 'designer' ? 'designer' : 'architect'
  const email = text(data.email, 'correo').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'El correo no es válido.')
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr', 'pl']
  const language = typeof data.language === 'string' && languages.includes(data.language) ? data.language : 'es'

  const auth = getAuth()
  const existing = await auth.getUserByEmail(email).catch(() => null)
  if (existing) {
    const profile = await existingProfile(existing.uid)
    if (rolesOf(profile).includes('designer')) throw new HttpsError('already-exists', 'Ese correo ya es el acceso de un arquitecto o diseñador.')
    await profile.ref.update({ roles: [...rolesOf(profile), 'designer'], companyName, profession })
    return { uid: existing.uid, addedToExisting: true }
  }

  const user = await auth.createUser({ email, displayName: name, password: randomBytes(24).toString('base64url') })
  try {
    await db.doc(`users/${user.uid}`).set({ role: 'designer', roles: ['designer'], name, companyName, profession, email, language })
  } catch (e) {
    await auth.deleteUser(user.uid).catch(() => {})
    throw e
  }
  return { uid: user.uid, addedToExisting: false }
})

/**
 * Resumen de reservas del propio negocio: solo el número de veces que han pulsado Reservar.
 * No devuelve nombres ni fichas de clientes. El negocio no puede leer esos registros.
 */
export const businessReservationSummary = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const me = await db.doc(`users/${uid}`).get()
  if (me.get('role') !== 'business') throw new HttpsError('permission-denied', 'Solo el negocio puede ver este resumen.')
  const placeId = me.get('placeId')
  if (typeof placeId !== 'string' || !placeId) {
    throw new HttpsError('failed-precondition', 'Su cuenta no está vinculada a un negocio.')
  }

  const place = await db.doc(`places/${placeId}`).get()
  if (!place.exists) throw new HttpsError('not-found', 'No encontramos la ficha de su negocio.')
  const businessName = typeof place.get('name') === 'string' ? place.get('name') : ''
  const restaurant = place.get('category') === 'restaurants'

  const raw = (request.data as { month?: unknown } | undefined)?.month
  const month = typeof raw === 'string' && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : monthKeyMadrid(new Date())
  if (!restaurant) return { restaurant: false, businessName, month, clicks: 0 }

  const snap = await db.collection('reservationClicks').where('placeId', '==', placeId).get()
  let clicks = 0
  snap.forEach((doc) => {
    const created = doc.get('createdAt')
    if (!created || typeof created.toDate !== 'function') return
    if (monthKeyMadrid(created.toDate()) === month) clicks += 1
  })
  return { restaurant: true, businessName, month, clicks }
})

/**
 * Baja de un cliente (derecho de supresión): borra sus cuentas de acceso, sus perfiles,
 * su ficha, su conversación con CJ, sus peticiones, sus registros de uso de descuentos,
 * sus pinchazos y confirmaciones de reserva, sus contactos propios y las notas de su casa
 * (también los que había compartido con CJ).
 * No se puede deshacer.
 */
export const deleteClient = onCall(async (request) => {
  await requireAdmin(request.auth?.uid)
  const clientId = text((request.data ?? {}).clientId, 'cliente')

  const clientRef = db.doc(`clients/${clientId}`)
  const client = await clientRef.get()
  if (!client.exists) throw new HttpsError('not-found', 'Este cliente ya no existe.')

  // Personas con esta casa: como casa activa (clientId) o entre sus casas (clientIds)
  const [byActive, byList] = await Promise.all([
    db.collection('users').where('clientId', '==', clientId).get(),
    db.collection('users').where('clientIds', 'array-contains', clientId).get(),
  ])
  const linked = new Map([...byActive.docs, ...byList.docs].map((d) => [d.id, d]))

  // Si la persona tiene otras casas, se le quita solo esta. Si era la última pero tiene otros accesos
  // (negocio, constructor o equipo de CJ), se le quita solo el acceso de cliente. Si no, se borra su cuenta.
  const auth = getAuth()
  const usersToDelete: FirebaseFirestore.QueryDocumentSnapshot[] = []
  let keptAccounts = 0
  for (const u of linked.values()) {
    const others = (((u.get('clientIds') as string[] | undefined) ?? [u.get('clientId')]) as string[]).filter(
      (id) => id && id !== clientId,
    )
    if (others.length) {
      const active = u.get('clientId') === clientId ? others[0] : u.get('clientId')
      await u.ref.update({ clientIds: others, clientId: active })
      keptAccounts++
    } else if (rolesOf(u).some((r) => r !== 'client')) {
      const rest = rolesOf(u).filter((r) => r !== 'client')
      await u.ref.update({
        roles: rest,
        role: rest.includes(u.get('role')) ? u.get('role') : rest[0],
        clientId: FieldValue.delete(),
        clientIds: FieldValue.delete(),
        favorites: FieldValue.delete(),
      })
      keptAccounts++
    } else {
      await auth.deleteUser(u.id).catch((e: { code?: string }) => {
        if (e.code !== 'auth/user-not-found') throw e
      })
      usersToDelete.push(u)
    }
  }
  const users = { docs: usersToDelete, size: usersToDelete.length }
  // Invitaciones pendientes de las cuentas que se borran
  for (const u of usersToDelete) for (const inv of (await db.collection('invites').where('uid', '==', u.id).get()).docs) await inv.ref.delete()

  // Borrado en lotes (máx. 500 operaciones por lote)
  const uses = await db.collection('dealUses').where('clientId', '==', clientId).get()
  const requests = await db.collection('requests').where('clientId', '==', clientId).get()
  const reservationClicks = await db.collection('reservationClicks').where('clientId', '==', clientId).get()
  const reservationConfirms = await db.collection('reservationConfirms').where('clientId', '==', clientId).get()
  const eventBookings = await db.collection('eventBookings').where('clientId', '==', clientId).get()
  const orders = await db.collection('orders').where('clientId', '==', clientId).get()
  // Contactos propios y notas de la casa: privados y compartidos con CJ
  const [ownContacts, sharedContacts, houseNotes, sharedHouseNotes] = await Promise.all([
    db.collection(`clients/${clientId}/ownContacts`).get(),
    db.collection(`clients/${clientId}/sharedContacts`).get(),
    db.collection(`clients/${clientId}/houseNotes`).get(),
    db.collection(`clients/${clientId}/sharedHouseNotes`).get(),
  ])
  // La conversación y todos sus mensajes
  await db.recursiveDelete(db.doc(`conversations/${clientId}`))
  // Las obras de esta casa (Mi reforma), con su conversación, avances, pagos y extras
  const projects = await db.collection('projects').where('clientId', '==', clientId).get()
  for (const pr of projects.docs) {
    await db.recursiveDelete(pr.ref)
    // Fotos y justificantes de la obra (si el almacén aún no está creado, no hay nada que borrar)
    await (await projectBucket()).deleteFiles({ prefix: `projects/${pr.id}/` }).catch(() => {})
  }
  // Las reformas de esta casa, con sus planos y diseños
  const reforms = await db.collection('reforms').where('clientId', '==', clientId).get()
  for (const r of reforms.docs) {
    await db.recursiveDelete(r.ref)
    await (await projectBucket()).deleteFiles({ prefix: `reforms/${r.id}/` }).catch(() => {})
  }
  // Social: sus publicaciones (con quién se apuntó), sus conversaciones, sus apuntes y avisos, y sus fotos
  const socialPosts = await db.collection('socialPosts').where('clientId', '==', clientId).get()
  for (const sp of socialPosts.docs) await db.recursiveDelete(sp.ref)
  const socialChats = await db.collection('socialChats').where('members', 'array-contains', clientId).get()
  for (const sc of socialChats.docs) await db.recursiveDelete(sc.ref)
  const socialJoins = await db.collectionGroup('joins').where('clientId', '==', clientId).get()
  const socialReports = await db.collection('socialReports').where('clientId', '==', clientId).get()
  await (await projectBucket()).deleteFiles({ prefix: `social/${clientId}/` }).catch(() => {})
  await (await projectBucket()).deleteFiles({ prefix: `clients/${clientId}/` }).catch(() => {})
  await db.doc(`socialProfiles/${clientId}`).delete().catch(() => {})
  const refs = [
    ...socialJoins.docs.map((d) => d.ref),
    ...socialReports.docs.map((d) => d.ref),
    ...users.docs.map((d) => d.ref),
    ...uses.docs.map((d) => d.ref),
    ...requests.docs.map((d) => d.ref),
    ...reservationClicks.docs.map((d) => d.ref),
    ...reservationConfirms.docs.map((d) => d.ref),
    ...eventBookings.docs.map((d) => d.ref),
    ...orders.docs.map((d) => d.ref),
    ...ownContacts.docs.map((d) => d.ref),
    ...sharedContacts.docs.map((d) => d.ref),
    ...houseNotes.docs.map((d) => d.ref),
    ...sharedHouseNotes.docs.map((d) => d.ref),
    clientRef,
  ]
  for (let i = 0; i < refs.length; i += 450) {
    const batch = db.batch()
    refs.slice(i, i + 450).forEach((r) => batch.delete(r))
    await batch.commit()
  }

  return {
    accounts: users.size,
    keptAccounts,
    projects: projects.size,
    dealUses: uses.size,
    requests: requests.size,
    reservationClicks: reservationClicks.size,
    reservationConfirms: reservationConfirms.size,
    eventBookings: eventBookings.size,
    orders: orders.size,
    socialPosts: socialPosts.size,
    ownContacts: ownContacts.size + sharedContacts.size,
    houseNotes: houseNotes.size + sharedHouseNotes.size,
  }
})

// ---------- Correo de invitación propio de CJ ----------

// Clave de Resend: se guarda en Secret Manager de Google Cloud (nunca en el código).
// Ver docs/correo.md. Remitente y dirección de la app: functions/.env
// El correo propio solo se activa con EMAIL_ENABLED=true en functions/.env, después de crear el secreto.
// Con false el secreto ni siquiera se declara: Firebase comprueba en la publicación que exista todo
// secreto declarado, y así las funciones se publican aunque aún no esté creado.
const emailEnabled = process.env.EMAIL_ENABLED === 'true'
const resendApiKey = emailEnabled ? defineSecret('RESEND_API_KEY') : null
// Ajustes no secretos (functions/.env), con valores por defecto
const emailFrom = () => process.env.EMAIL_FROM || 'CJ Club <info@cjclub.eu>'
const emailReplyTo = () => process.env.EMAIL_REPLY_TO || ''
const appUrl = () => process.env.APP_URL || 'https://cjclub.eu'

/**
 * Envía a una persona ya dada de alta (cliente, negocio o equipo) el correo de CJ para elegir
 * su contraseña, en su idioma. Solo para el equipo de CJ.
 * Devuelve { sent: true } o { sent: false, reason }; en ese caso la app envía el correo
 * estándar de Firebase para que la invitación llegue igualmente.
 */
export const sendInvitationEmail = onCall({ secrets: resendApiKey ? [resendApiKey] : [] }, async (request) => {
  await requireAdmin(request.auth?.uid)
  const email = text((request.data ?? {}).email, 'correo').toLowerCase()

  const user = await getAuth().getUserByEmail(email).catch(() => null)
  if (!user) throw new HttpsError('not-found', 'No hay ninguna cuenta con ese correo.')
  const profile = await db.doc(`users/${user.uid}`).get()
  const role = (['client', 'business', 'admin', 'builder', 'designer'].includes(profile.get('role')) ? profile.get('role') : 'client') as MailRole
  const language = isMailLanguage(profile.get('language')) ? profile.get('language') : 'en'
  const name = (profile.get('name') as string | undefined) || user.displayName || ''

  const base = appUrl().replace(/\/$/, '')
  const log = db.collection('mailLog').doc()
  const entry = {
    kind: 'invitation',
    to: email,
    uid: user.uid,
    role,
    language,
    by: request.auth!.uid,
    createdAt: FieldValue.serverTimestamp(),
  }

  const key = resendApiKey?.value() ?? ''
  // Firebase de pruebas con el correo activado y la clave "test": no se envía nada, se guarda el correo
  const simulated = emailEnabled && process.env.FUNCTIONS_EMULATOR === 'true' && (!key || key === 'test')
  if (!emailEnabled || (!key && !simulated)) {
    await log.set({ ...entry, status: 'not_configured' })
    return { sent: false, reason: 'not_configured' }
  }

  try {
    // Enlace propio de CJ Club, válido 24 horas y de un solo uso (el de Firebase solo dura una hora).
    // La persona elige la contraseña en /contrasena y entra directamente, en su idioma.
    const token = await createInvite(user.uid, email)
    const link = `${base}/contrasena?${new URLSearchParams({ invite: token, lang: language }).toString()}`
    const mail = invitationEmail({ language, role, name, link, appUrl: base })
    if (simulated) {
      // Firebase de pruebas: no se envía nada; se guarda el correo para poder revisarlo
      await log.set({ ...entry, status: 'sent', provider: 'simulated', subject: mail.subject, html: mail.html })
      return { sent: true }
    }
    const id = await sendWithResend({
      apiKey: key,
      from: emailFrom(),
      replyTo: emailReplyTo() || undefined,
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    })
    await log.set({ ...entry, status: 'sent', provider: 'resend', providerId: id, subject: mail.subject })
    return { sent: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 300) : 'error'
    await log.set({ ...entry, status: 'failed', error: reason })
    return { sent: false, reason: 'failed' }
  }
})

// ---------- Archivos de Mi reforma ----------

const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Papel de una persona en una obra, con las mismas normas que firestore.rules */
/** Quién puede subir planos a una reforma: CJ o un arquitecto o diseñador de esa reforma */
async function reformUploaderRole(uid: string, reformId: string): Promise<'cj' | 'designer' | 'none'> {
  const [me, reform] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`reforms/${reformId}`).get()])
  if (!me.exists || !reform.exists) return 'none'
  if (me.get('role') === 'admin') return 'cj'
  if (me.get('role') === 'designer' && ((reform.get('designerUids') as string[] | undefined) ?? []).includes(uid)) return 'designer'
  return 'none'
}

async function projectRoleOf(uid: string, projectId: string): Promise<'cj' | 'builder' | 'client' | 'designer' | 'none'> {
  const [me, project] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`projects/${projectId}`).get()])
  if (!me.exists || !project.exists) return 'none'
  const role = me.get('role')
  if (role === 'admin') return 'cj'
  // El profesional del contrato (también un arquitecto o diseñador cuando cobra su parte)
  if ((role === 'builder' || role === 'designer') && project.get('builderUid') === uid) return 'builder'
  if (role === 'client' && project.get('clientId') === me.get('clientId')) return 'client'
  if (role === 'designer' && ((project.get('designerUids') as string[] | undefined) ?? []).includes(uid)) return 'designer'
  return 'none'
}

/**
 * Sube una foto o un PDF de un avance, una línea del presupuesto o una elección de producto (constructor o CJ) o de un pago
 * (cualquiera de los tres).
 * Devuelve la ficha del archivo con un enlace privado (código imposible de adivinar) para guardarla
 * dentro del avance o pago. Los archivos no se pueden reemplazar.
 */
export const uploadProjectFile = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  // Planos y diseños van en la reforma (reforms/{id}); lo demás, en el contrato (projects/{id})
  const isPlan = d.kind === 'plans'
  const projectId = text(isPlan ? d.reformId : d.projectId, isPlan ? 'reforma' : 'obra')
  const kind =
    d.kind === 'updates' || d.kind === 'payments' || d.kind === 'budget' || d.kind === 'selections' || d.kind === 'snags' || d.kind === 'plans' ? d.kind : null
  const entryId = text(d.entryId, 'entrada')
  const index = Number(d.index)
  const contentType = text(d.contentType, 'tipo')
  if (!kind || !/^[A-Za-z0-9_-]{6,60}$/.test(projectId) || !/^[A-Za-z0-9]{10,40}$/.test(entryId) || !(Number.isInteger(index) && index >= 1 && index <= 50)) {
    throw new HttpsError('invalid-argument', 'Datos del archivo no válidos.')
  }
  if (!(contentType.startsWith('image/') || contentType === 'application/pdf')) {
    throw new HttpsError('invalid-argument', 'Solo se admiten fotos y PDF.')
  }
  const buffer = Buffer.from(typeof d.data === 'string' ? d.data : '', 'base64')
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new HttpsError('invalid-argument', 'El archivo pasa de 10 MB.')

  const role = isPlan ? await reformUploaderRole(uid, projectId) : await projectRoleOf(uid, projectId)
  // El cliente sube justificantes de pago y fotos de repasos; el resto lo suben el profesional o CJ.
  // Los planos, CJ y los arquitectos o diseñadores de la reforma.
  if (role === 'none' || (kind !== 'payments' && kind !== 'snags' && role === 'client') || (!isPlan && role === 'designer')) {
    throw new HttpsError('permission-denied', 'No puede añadir archivos aquí.')
  }
  // Fotos del presupuesto: solo mientras nadie lo haya firmado. Elecciones de productos: solo con el
  // presupuesto ya firmado por los dos.
  if (kind === 'budget' || kind === 'selections') {
    const signed = await db.collection(`projects/${projectId}/signatures`).get()
    if (kind === 'budget' && !signed.empty) throw new HttpsError('failed-precondition', 'El presupuesto ya está firmado.')
    if (kind === 'selections' && signed.size < 2) throw new HttpsError('failed-precondition', 'Primero hay que firmar el presupuesto.')
  }

  const name =
    (typeof d.name === 'string' ? d.name : 'archivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(-80) || 'archivo'
  const path = `${isPlan ? 'reforms' : 'projects'}/${projectId}/${kind}/${entryId}/${index}-${name}`
  const file = (await projectBucket()).file(path)
  const token = randomUUID()
  try {
    const [exists] = await file.exists()
    if (exists) throw new HttpsError('already-exists', 'Ese archivo ya existe.')
    await file.save(buffer, { contentType, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: uid, role } } })
  } catch (e) {
    if (e instanceof HttpsError) throw e
    console.error('uploadProjectFile', e)
    throw new HttpsError('internal', 'No se pudo guardar el archivo.')
  }
  // Enlace privado: solo funciona con el código (token) que acabamos de crear
  const host = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.STORAGE_EMULATOR_HOST ? process.env.STORAGE_EMULATOR_HOST : 'https://firebasestorage.googleapis.com'
  const url = `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  return { path, name, contentType, size: buffer.length, url }
})

/**
 * Documento de identidad (DNI, NIE o pasaporte) de quien firma el presupuesto: el cliente o el profesional.
 * Una llamada por foto: la parte 1 sustituye lo que hubiera (borra las fotos anteriores) y la parte 2
 * (la otra cara del DNI) se añade. Solo se puede cambiar mientras esa persona no haya firmado.
 * Queda en projects/{id}/identities/{client|builder}, que solo leen CJ y la propia persona.
 */
export const uploadIdentity = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const projectId = text(d.projectId, 'obra')
  const docType = d.docType === 'dni' || d.docType === 'nie' || d.docType === 'passport' ? d.docType : null
  const part = Number(d.part)
  const contentType = text(d.contentType, 'tipo')
  if (!docType || !/^[A-Za-z0-9_-]{6,60}$/.test(projectId) || !(part === 1 || part === 2)) throw new HttpsError('invalid-argument', 'Datos del documento no válidos.')
  if (!(contentType.startsWith('image/') || contentType === 'application/pdf')) throw new HttpsError('invalid-argument', 'Solo se admiten fotos y PDF.')
  const buffer = Buffer.from(typeof d.data === 'string' ? d.data : '', 'base64')
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new HttpsError('invalid-argument', 'El archivo pasa de 10 MB.')

  const role = await projectRoleOf(uid, projectId)
  if (role !== 'client' && role !== 'builder') throw new HttpsError('permission-denied', 'Solo el cliente y el profesional firman el presupuesto.')
  if ((await db.doc(`projects/${projectId}/signatures/${role}`).get()).exists) throw new HttpsError('failed-precondition', 'Ya ha firmado.')

  const ref = db.doc(`projects/${projectId}/identities/${role}`)
  const before = await ref.get()
  const prev = (before.get('files') as { path: string }[] | undefined) ?? []
  if (part === 2 && (!before.exists || before.get('uid') !== uid || prev.length !== 1)) throw new HttpsError('failed-precondition', 'Suba primero la parte delantera.')

  const name =
    (typeof d.name === 'string' ? d.name : 'documento')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(-80) || 'documento'
  const path = `projects/${projectId}/identity/${role}/${Date.now()}-${part}-${name}`
  const bucket = await projectBucket()
  const token = randomUUID()
  try {
    await bucket.file(path).save(buffer, { contentType, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: uid, role } } })
  } catch (e) {
    console.error('uploadIdentity', e)
    throw new HttpsError('internal', 'No se pudo guardar el documento.')
  }
  const host = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.STORAGE_EMULATOR_HOST ? process.env.STORAGE_EMULATOR_HOST : 'https://firebasestorage.googleapis.com'
  const file = { path, name, contentType, size: buffer.length, url: `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` }

  if (part === 1) {
    // Documento nuevo: se borran las fotos del anterior
    await Promise.all(prev.map((f) => bucket.file(f.path).delete().catch(() => undefined)))
    await ref.set({ role, uid, docType, files: [file], createdAt: FieldValue.serverTimestamp() })
  } else {
    await ref.update({ files: FieldValue.arrayUnion(file) })
  }
  return { ok: true }
})

/**
 * Foto de la presentación de un colaborador: un negocio de Descubrir (places/{id}) o un colaborador de
 * servicios (partners/{id}). Las del negocio las sube el propio negocio o CJ; las de servicios, solo CJ.
 * Devuelve la ficha de la foto con su enlace; la app la añade a la lista "photos" del colaborador.
 */
export const uploadProfilePhoto = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const coll = d.collection === 'places' || d.collection === 'partners' ? d.collection : null
  const id = text(d.id, 'colaborador')
  const contentType = text(d.contentType, 'tipo')
  // "photos": fotos de la presentación; "menu": la carta, en fotos o PDF
  const folder = d.kind === 'menu' ? 'menu' : 'photos'
  if (!coll || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new HttpsError('invalid-argument', 'Datos de la foto no válidos.')
  if (!(contentType.startsWith('image/') || (folder === 'menu' && contentType === 'application/pdf'))) {
    throw new HttpsError('invalid-argument', folder === 'menu' ? 'Solo se admiten fotos y PDF.' : 'Solo se admiten fotos.')
  }
  const buffer = Buffer.from(typeof d.data === 'string' ? d.data : '', 'base64')
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new HttpsError('invalid-argument', 'La foto pasa de 10 MB.')

  const [me, target] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`${coll}/${id}`).get()])
  if (!target.exists) throw new HttpsError('not-found', 'Ese colaborador no existe.')
  const role = me.get('role')
  const allowed = role === 'admin' || (coll === 'places' && role === 'business' && me.get('placeId') === id)
  if (!allowed) throw new HttpsError('permission-denied', 'No puede añadir fotos aquí.')

  const name =
    (typeof d.name === 'string' ? d.name : 'foto')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(-80) || 'foto'
  const path = `profiles/${coll}/${id}/${folder}/${Date.now()}-${randomBytes(4).toString('hex')}-${name}`
  const token = randomUUID()
  try {
    await (await projectBucket()).file(path).save(buffer, { contentType, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: uid } } })
  } catch (e) {
    console.error('uploadProfilePhoto', e)
    throw new HttpsError('internal', 'No se pudo guardar la foto.')
  }
  const host = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.STORAGE_EMULATOR_HOST ? process.env.STORAGE_EMULATOR_HOST : 'https://firebasestorage.googleapis.com'
  return { path, name, contentType, size: buffer.length, url: `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` }
})

/**
 * Pedido de comida (para llevar o a domicilio) de un cliente a un restaurante.
 * Los precios se toman aquí, de la lista de platos del restaurante (places/{id}/orderItems), nunca de
 * lo que envía la app. Se paga al recoger o al repartidor; aquí no se cobra nada.
 */
export const placeOrder = onCall({ secrets: resendApiKey ? [resendApiKey] : [] }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const me = await db.doc(`users/${uid}`).get()
  const clientId = me.get('clientId')
  if (me.get('role') !== 'client' || typeof clientId !== 'string' || !clientId) throw new HttpsError('permission-denied', 'Solo los clientes pueden hacer pedidos.')

  const placeId = text(d.placeId, 'restaurante')
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(placeId)) throw new HttpsError('invalid-argument', 'Restaurante no válido.')
  const place = await db.doc(`places/${placeId}`).get()
  if (!place.exists || place.get('active') === false || place.get('category') !== 'restaurants' || place.get('ordersOpen') !== true) {
    throw new HttpsError('failed-precondition', 'Este restaurante no acepta pedidos en la app ahora mismo.')
  }
  const mode = d.mode === 'delivery' ? 'delivery' : d.mode === 'pickup' ? 'pickup' : null
  if (!mode || (mode === 'pickup' && place.get('takeaway') !== true) || (mode === 'delivery' && place.get('delivery') !== true)) {
    throw new HttpsError('invalid-argument', 'Forma de entrega no disponible.')
  }
  const name = text(d.name, 'nombre').slice(0, 120)
  const phone = text(d.phone, 'teléfono').slice(0, 40)
  if ((phone.match(/\d/g) ?? []).length < 6) throw new HttpsError('invalid-argument', 'Indique un teléfono válido.')
  const address = mode === 'delivery' ? text(d.address, 'dirección').slice(0, 300) : ''
  const wanted = typeof d.wanted === 'string' && (d.wanted === 'asap' || /^([01]\d|2[0-3]):[0-5]\d$/.test(d.wanted)) ? d.wanted : null
  if (!wanted) throw new HttpsError('invalid-argument', 'Hora no válida.')
  const note = (typeof d.note === 'string' ? d.note.trim() : '').slice(0, 500)

  const raw = Array.isArray(d.lines) ? d.lines : []
  if (raw.length < 1 || raw.length > 30) throw new HttpsError('invalid-argument', 'El pedido está vacío o es demasiado largo.')
  const wantedLines = raw.map((l) => {
    const r = (l ?? {}) as Record<string, unknown>
    const itemId = typeof r.itemId === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(r.itemId) ? r.itemId : null
    const qty = Number(r.qty)
    if (!itemId || !Number.isInteger(qty) || qty < 1 || qty > 50) throw new HttpsError('invalid-argument', 'Línea del pedido no válida.')
    return { itemId, qty }
  })
  if (new Set(wantedLines.map((l) => l.itemId)).size !== wantedLines.length) throw new HttpsError('invalid-argument', 'Plato repetido en el pedido.')
  const items = await db.getAll(...wantedLines.map((l) => db.doc(`places/${placeId}/orderItems/${l.itemId}`)))
  const lines = wantedLines.map((l, i) => {
    const it = items[i]
    if (!it.exists) throw new HttpsError('failed-precondition', 'Un plato del pedido ya no existe. Revise el pedido.')
    if (it.get('available') === false) throw new HttpsError('failed-precondition', `«${it.get('name')}» está agotado. Quítelo del pedido.`)
    const price = Number(it.get('price'))
    if (!Number.isFinite(price) || price < 0) throw new HttpsError('failed-precondition', 'Precio no válido.')
    return { itemId: l.itemId, name: String(it.get('name')).slice(0, 120), price, qty: l.qty }
  })
  const cents = (n: number) => Math.round(n * 100)
  const subtotal = lines.reduce((sum, l) => sum + cents(l.price) * l.qty, 0) / 100
  const minOrder = Number(place.get('minOrder') ?? 0) || 0
  if (mode === 'delivery' && subtotal < minOrder) throw new HttpsError('failed-precondition', `El pedido mínimo a domicilio es de ${minOrder.toFixed(2).replace('.', ',')} €.`)
  const deliveryFee = mode === 'delivery' ? Number(place.get('deliveryFee') ?? 0) || 0 : 0
  const total = (cents(subtotal) + cents(deliveryFee)) / 100
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const ref = await db.collection('orders').add({
    placeId,
    placeName: String(place.get('name') ?? ''),
    clientId,
    uid,
    name,
    phone,
    mode,
    address,
    wanted,
    day,
    note,
    lines,
    subtotal,
    deliveryFee,
    total,
    status: 'new',
    reply: '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Aviso por correo al restaurante (si falla, el pedido sigue siendo válido: lo ve en su panel)
  const euros = (n: number) => `${n.toFixed(2).replace('.', ',').replace(/,00$/, '')} €`
  await notifyBusiness(placeId, 'order', ref.id, {
    title: `Pedido nuevo · ${euros(total)}`,
    intro: `${name} ha hecho un pedido en CJ Club. Acéptelo o recházelo en su panel; el cliente verá la respuesta al momento.`,
    rows: [
      ['Entrega', mode === 'delivery' ? 'A domicilio' : 'Recoger en el local'],
      ['Para', wanted === 'asap' ? 'Lo antes posible' : `Hoy a las ${wanted}`],
      ['Teléfono', phone],
      ['Dirección', address],
      ['Comentario', note],
      ['Total', `${euros(total)}${deliveryFee ? ` (envío ${euros(deliveryFee)} incluido)` : ''} · se paga ${mode === 'delivery' ? 'al repartidor' : 'al recoger'}`],
    ],
    lines: lines.map((l) => `${l.qty} × ${l.name} · ${euros(l.price * l.qty)}`),
    button: 'Abrir pedidos',
    path: '/negocio/pedidos',
  })
  return { id: ref.id, total }
})

/**
 * Avisa por correo a las cuentas de negocio de un lugar. Nunca falla: si el correo no está configurado
 * o Resend da error, lo anota en mailLog y sigue.
 */
async function notifyBusiness(
  placeId: string,
  kind: 'order' | 'booking',
  refId: string,
  notice: { title: string; intro: string; rows: [string, string][]; lines?: string[]; button: string; path: string },
) {
  try {
    const users = await db.collection('users').where('placeId', '==', placeId).get()
    const to = users.docs
      .filter((u) => rolesOf(u).includes('business') && typeof u.get('email') === 'string' && u.get('email'))
      .map((u) => ({ uid: u.id, email: String(u.get('email')).toLowerCase() }))
    if (!to.length) return
    const base = appUrl().replace(/\/$/, '')
    const mail = noticeEmail({ ...notice, link: `${base}${notice.path}`, appUrl: base })
    const key = resendApiKey?.value() ?? ''
    const simulated = emailEnabled && process.env.FUNCTIONS_EMULATOR === 'true' && (!key || key === 'test')
    for (const r of to) {
      const log = db.collection('mailLog').doc()
      const entry = { kind, to: r.email, uid: r.uid, placeId, refId, subject: mail.subject, createdAt: FieldValue.serverTimestamp() }
      if (!emailEnabled || (!key && !simulated)) {
        await log.set({ ...entry, status: 'not_configured' })
        continue
      }
      if (simulated) {
        await log.set({ ...entry, status: 'sent', provider: 'simulated', html: mail.html })
        continue
      }
      try {
        const id = await sendWithResend({ apiKey: key, from: emailFrom(), replyTo: emailReplyTo() || undefined, to: r.email, subject: mail.subject, html: mail.html, text: mail.text })
        await log.set({ ...entry, status: 'sent', provider: 'resend', providerId: id })
      } catch (e) {
        await log.set({ ...entry, status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : 'error' })
      }
    }
  } catch (e) {
    console.error('notifyBusiness', e)
  }
}

/**
 * Tras pedir reserva para un evento, la app llama aquí para que el negocio reciba un correo.
 * Solo quien hizo la solicitud, y una sola vez por solicitud.
 */
export const notifyBooking = onCall({ secrets: resendApiKey ? [resendApiKey] : [] }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const id = text((request.data ?? {}).bookingId, 'reserva')
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) throw new HttpsError('invalid-argument', 'Reserva no válida.')
  const ref = db.doc(`eventBookings/${id}`)
  const first = await db.runTransaction(async (tx) => {
    const b = await tx.get(ref)
    if (!b.exists || b.get('uid') !== uid) throw new HttpsError('permission-denied', 'No es su reserva.')
    if (b.get('notifiedAt')) return null
    tx.update(ref, { notifiedAt: FieldValue.serverTimestamp() })
    return b.data()!
  })
  if (!first) return { sent: false }
  const [y, m, d] = String(first.eventDate).split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  await notifyBusiness(String(first.placeId), 'booking', id, {
    title: `Solicitud de reserva · ${first.eventTitle}`,
    intro: `${first.name} quiere reservar para su evento. Confírmela o recházela en su panel; el cliente verá la respuesta al momento.`,
    rows: [
      ['Evento', `${first.eventTitle} · ${day}, ${first.eventTime}`],
      ['Personas', String(first.people)],
      ['Teléfono', String(first.phone ?? '')],
      ['Comentario', String(first.note ?? '')],
    ],
    button: 'Abrir eventos',
    path: '/negocio/eventos',
  })
  return { sent: true }
})

/**
 * Foto de una publicación de Social. Solo clientes, en la carpeta de su casa y de esa publicación
 * (la app crea el id de la publicación antes de subir las fotos).
 */
export const uploadSocialPhoto = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const me = await db.doc(`users/${uid}`).get()
  // Los clientes, en la carpeta de su casa; CJ (sus recomendaciones), en la carpeta "cj"
  const clientId = me.get('role') === 'admin' ? 'cj' : me.get('clientId')
  if ((me.get('role') !== 'client' && me.get('role') !== 'admin') || typeof clientId !== 'string' || !clientId) throw new HttpsError('permission-denied', 'Solo los clientes publican en Social.')
  const postId = text(d.postId, 'publicación')
  const contentType = text(d.contentType, 'tipo')
  if (!/^[A-Za-z0-9]{10,40}$/.test(postId)) throw new HttpsError('invalid-argument', 'Publicación no válida.')
  if (!contentType.startsWith('image/')) throw new HttpsError('invalid-argument', 'Solo se admiten fotos.')
  const existing = await db.doc(`socialPosts/${postId}`).get()
  if (existing.exists && existing.get('clientId') !== clientId) throw new HttpsError('permission-denied', 'No es su publicación.')
  const buffer = Buffer.from(typeof d.data === 'string' ? d.data : '', 'base64')
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new HttpsError('invalid-argument', 'La foto pasa de 10 MB.')
  const name =
    (typeof d.name === 'string' ? d.name : 'foto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(-80) || 'foto'
  const path = `social/${clientId}/${postId}/${Date.now()}-${randomBytes(4).toString('hex')}-${name}`
  const token = randomUUID()
  try {
    await (await projectBucket()).file(path).save(buffer, { contentType, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: uid } } })
  } catch (e) {
    console.error('uploadSocialPhoto', e)
    throw new HttpsError('internal', 'No se pudo guardar la foto.')
  }
  const host = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.STORAGE_EMULATOR_HOST ? process.env.STORAGE_EMULATOR_HOST : 'https://firebasestorage.googleapis.com'
  return { path, name, contentType, size: buffer.length, url: `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` }
})

/**
 * Foto de perfil de la casa o la familia. La pone (o la quita, con remove: true) un cliente para su
 * propia casa. Se guarda en clients/{id}.photo y en socialProfiles/{id}, que es lo que ven los demás
 * clientes en Social. La foto anterior se borra.
 */
export const setClientPhoto = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const me = await db.doc(`users/${uid}`).get()
  const clientId = me.get('clientId')
  if (me.get('role') !== 'client' || typeof clientId !== 'string' || !clientId) throw new HttpsError('permission-denied', 'Solo los clientes tienen foto de perfil.')
  const clientRef = db.doc(`clients/${clientId}`)
  const client = await clientRef.get()
  if (!client.exists) throw new HttpsError('not-found', 'No se encuentra su casa.')
  const bucket = await projectBucket()
  const previous = client.get('photo') as { path?: string } | null | undefined

  let photo: { path: string; name: string; contentType: string; size: number; url: string } | null = null
  if (d.remove !== true) {
    const contentType = text(d.contentType, 'tipo')
    if (!contentType.startsWith('image/')) throw new HttpsError('invalid-argument', 'Solo se admiten fotos.')
    const buffer = Buffer.from(typeof d.data === 'string' ? d.data : '', 'base64')
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new HttpsError('invalid-argument', 'La foto pasa de 10 MB.')
    const name =
      (typeof d.name === 'string' ? d.name : 'foto')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.-]+/g, '_')
        .slice(-80) || 'foto'
    const path = `clients/${clientId}/photo/${Date.now()}-${name}`
    const token = randomUUID()
    try {
      await bucket.file(path).save(buffer, { contentType, resumable: false, metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: uid } } })
    } catch (e) {
      console.error('setClientPhoto', e)
      throw new HttpsError('internal', 'No se pudo guardar la foto.')
    }
    const host = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.STORAGE_EMULATOR_HOST ? process.env.STORAGE_EMULATOR_HOST : 'https://firebasestorage.googleapis.com'
    photo = { path, name, contentType, size: buffer.length, url: `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}` }
  }
  await clientRef.update({ photo })
  await db.doc(`socialProfiles/${clientId}`).set({ familyName: String(client.get('familyName') ?? ''), photo })
  if (previous?.path && previous.path.startsWith(`clients/${clientId}/`)) await bucket.file(previous.path).delete().catch(() => {})
  return { photo }
})

/**
 * Traducción de Social con el servicio de traducción de Google (Cloud Translation), a petición del
 * cliente (botón «Traducir»). El servidor comprueba que quien pide puede leer el texto.
 * - Publicaciones: la traducción se guarda en translationCache (solo el servidor la lee), para no pagar
 *   dos veces por el mismo texto.
 * - Mensajes de chat: no se guardan; la traducción solo vuelve a quien la pide.
 * Tope de seguridad: TRANSLATE_DAILY_LIMIT peticiones por persona y día.
 * En el Firebase de pruebas local no se llama a Google: se simula.
 */
const TRANSLATE_DAILY_LIMIT = 300

async function countTranslation(uid: string) {
  const ref = db.doc(`translateUsage/${uid}`)
  const day = new Date().toISOString().slice(0, 10)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const count = snap.get('day') === day ? Number(snap.get('count') ?? 0) : 0
    if (count >= TRANSLATE_DAILY_LIMIT) throw new HttpsError('resource-exhausted', 'Ha llegado al máximo de traducciones de hoy.')
    tx.set(ref, { day, count: count + 1 })
  })
}

export const translateSocial = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const target = typeof d.target === 'string' && TRANSLATE_LANGS.includes(d.target) ? d.target : ''
  if (!target) throw new HttpsError('invalid-argument', 'Idioma no válido.')
  const me = await db.doc(`users/${uid}`).get()
  const role = me.get('role')
  const clientId = me.get('clientId')
  if (role !== 'client' && role !== 'admin') throw new HttpsError('permission-denied', 'Solo para clientes.')
  const validId = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(v)

  // Mensaje de un chat: solo las dos casas del chat
  if (d.chatId !== undefined) {
    if (!validId(d.chatId) || !validId(d.messageId)) throw new HttpsError('invalid-argument', 'Mensaje no válido.')
    const chat = await db.doc(`socialChats/${d.chatId}`).get()
    const members = chat.get('members')
    if (role !== 'client' || !chat.exists || !Array.isArray(members) || !members.includes(clientId))
      throw new HttpsError('permission-denied', 'No puede leer este chat.')
    const msg = await db.doc(`socialChats/${d.chatId}/messages/${d.messageId}`).get()
    const text = String(msg.get('text') ?? '').slice(0, 2000)
    if (!msg.exists || !text.trim()) throw new HttpsError('not-found', 'El mensaje ya no existe.')
    await countTranslation(uid)
    const [t] = await googleTranslate([text], target)
    return { texts: [t.text], same: t.detected === target }
  }

  // Publicación: título, sitio y texto
  if (!validId(d.postId)) throw new HttpsError('invalid-argument', 'Publicación no válida.')
  const post = await db.doc(`socialPosts/${d.postId}`).get()
  if (!post.exists || (post.get('hidden') === true && role !== 'admin' && post.get('clientId') !== clientId))
    throw new HttpsError('not-found', 'La publicación ya no existe.')
  const fields = ['title', 'place', 'text'].map((f) => String(post.get(f) ?? '').slice(0, 5000))
  const results: string[] = [...fields]
  const keys = fields.map((f) => createHash('sha256').update(`${target}\n${f}`).digest('hex'))
  const cached = await Promise.all(keys.map((k, i) => (fields[i].trim() ? db.doc(`translationCache/${k}`).get() : null)))
  const missing = fields.map((f, i) => (f.trim() && !cached[i]?.exists ? i : -1)).filter((i) => i >= 0)
  let same = true
  for (const [i, c] of cached.entries())
    if (c?.exists) {
      results[i] = String(c.get('text'))
      if (c.get('detected') !== target) same = false
    }
  if (missing.length) {
    await countTranslation(uid)
    const done = await googleTranslate(
      missing.map((i) => fields[i]),
      target,
    )
    await Promise.all(
      done.map((t, j) => {
        const i = missing[j]
        results[i] = t.text
        if (t.detected !== target) same = false
        return db.doc(`translationCache/${keys[i]}`).set({ text: t.text, detected: t.detected, target, createdAt: FieldValue.serverTimestamp() })
      }),
    )
  }
  return { texts: results, same }
})

/**
 * Traducción automática de un documento (información de un negocio, descuento, evento, plato…).
 * La llama el panel justo después de guardar. Solo CJ y los negocios; el servidor lee el documento
 * guardado y traduce lo que falte (ver autoTranslate.ts).
 */
export const autoTranslateDoc = onCall({ timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const me = await db.doc(`users/${uid}`).get()
  const roles = rolesOf(me)
  if (!roles.includes('admin') && !roles.includes('business')) throw new HttpsError('permission-denied', 'Solo CJ y los negocios.')
  const path = typeof request.data?.path === 'string' ? request.data.path : ''
  if (!/^[A-Za-z0-9_/-]{1,200}$/.test(path) || path.includes('//')) throw new HttpsError('invalid-argument', 'Documento no válido.')
  return { translated: await translateDoc(db, path) }
})

/**
 * Traducción de «Mi reforma» al idioma del cliente (ver projectTranslate.ts). La pide la app al abrir una
 * reforma en un idioma que no es el español. Solo las partes del contrato (cliente, profesional y CJ).
 * Traductor: la IA de Claude cuando REFORM_TRANSLATOR=claude (functions/.env) y existe el secreto
 * ANTHROPIC_API_KEY; si no, Google.
 */
const anthropicApiKey = process.env.REFORM_TRANSLATOR === 'claude' ? defineSecret('ANTHROPIC_API_KEY') : null

export const translateReform = onCall({ timeoutSeconds: 300, memory: '512MiB', secrets: anthropicApiKey ? [anthropicApiKey] : [] }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Inicie sesión de nuevo.')
  const d = (request.data ?? {}) as Record<string, unknown>
  const lang = typeof d.target === 'string' && REFORM_LANGS.includes(d.target) ? d.target : ''
  if (!lang) throw new HttpsError('invalid-argument', 'Idioma no válido.')
  const pid = typeof d.projectId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(d.projectId) ? d.projectId : ''
  if (!pid) throw new HttpsError('invalid-argument', 'Reforma no válida.')
  const [me, project] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`projects/${pid}`).get()])
  if (!project.exists) throw new HttpsError('not-found', 'La reforma ya no existe.')
  const roles = rolesOf(me)
  const clientIds = [me.get('clientId'), ...((me.get('clientIds') as string[] | undefined) ?? [])]
  const allowed =
    roles.includes('admin') ||
    ((roles.includes('builder') || roles.includes('designer')) && project.get('builderUid') === uid) ||
    (roles.includes('client') && clientIds.includes(project.get('clientId')))
  if (!allowed) throw new HttpsError('permission-denied', 'No forma parte de este contrato.')
  await countTranslation(uid)
  return { translated: await translateProject(db, pid, lang, anthropicApiKey?.value() ?? '') }
})

/**
 * «Quiero formar parte de CJ Club»: formulario público de la pantalla de acceso (sin cuenta).
 * Guarda la solicitud en membershipRequests (solo CJ la ve en el panel) y avisa por correo a CJ
 * (JOIN_NOTICE_EMAIL, por defecto info@cjclub.eu), con «Responder» dirigido a quien lo pide.
 * Protección contra abusos: campo trampa para robots, 3 solicitudes por conexión y día, 100 al día en total.
 */
export const requestMembership = onCall({ secrets: resendApiKey ? [resendApiKey] : [] }, async (request) => {
  const d = (request.data ?? {}) as Record<string, unknown>
  // Campo invisible: solo lo rellenan los robots. Se responde como si todo fuera bien.
  if (typeof d.website === 'string' && d.website.trim()) return { ok: true }
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const name = clean(d.name, 120)
  const email = clean(d.email, 160).toLowerCase()
  const phone = clean(d.phone, 40)
  const country = clean(d.country, 80)
  const message = typeof d.message === 'string' ? d.message.trim().slice(0, 1500) : ''
  const language = isMailLanguage(d.language) ? d.language : 'en'
  if (name.length < 3) throw new HttpsError('invalid-argument', 'name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'email')
  if (phone.replace(/\D/g, '').length < 6) throw new HttpsError('invalid-argument', 'phone')
  if (d.consent !== true) throw new HttpsError('invalid-argument', 'consent')

  // Límites (por conexión y en total, cada día)
  const day = new Date().toISOString().slice(0, 10)
  const ip = createHash('sha256').update(String(request.rawRequest?.ip ?? 'x')).digest('hex').slice(0, 32)
  const ipRef = db.doc(`joinLimits/${day}_${ip}`)
  const allRef = db.doc(`joinLimits/${day}_all`)
  await db.runTransaction(async (tx) => {
    const [a, b] = await Promise.all([tx.get(ipRef), tx.get(allRef)])
    if (Number(a.get('n') ?? 0) >= 3 || Number(b.get('n') ?? 0) >= 100) throw new HttpsError('resource-exhausted', 'limit')
    tx.set(ipRef, { n: Number(a.get('n') ?? 0) + 1, day })
    tx.set(allRef, { n: Number(b.get('n') ?? 0) + 1, day })
  })

  const ref = await db.collection('membershipRequests').add({ name, email, phone, country, message, language, status: 'new', createdAt: FieldValue.serverTimestamp() })

  // Aviso a CJ (si falla, la solicitud ya está guardada en el panel)
  try {
    const base = appUrl().replace(/\/$/, '')
    const to = process.env.JOIN_NOTICE_EMAIL || 'info@cjclub.eu'
    const languageName: Record<string, string> = { es: 'Español', en: 'Inglés', nl: 'Neerlandés', sv: 'Sueco', de: 'Alemán', fr: 'Francés', pl: 'Polaco' }
    const mail = noticeEmail({
      title: `Solicitud para CJ Club: ${name}`,
      intro: 'Una persona que aún no es cliente quiere formar parte de CJ Club. Puede contestarle respondiendo a este correo.',
      rows: [
        ['Nombre', name],
        ['Correo', email],
        ['Teléfono', phone],
        ...(country ? ([['País', country]] as [string, string][]) : []),
        ['Idioma de la app', languageName[language] ?? language],
      ],
      lines: message ? [message] : [],
      button: 'Ver en el panel',
      link: `${base}/admin/solicitudes`,
      appUrl: base,
    })
    const key = resendApiKey?.value() ?? ''
    const simulated = emailEnabled && process.env.FUNCTIONS_EMULATOR === 'true' && (!key || key === 'test')
    const log = db.collection('mailLog').doc()
    const entry = { kind: 'join', to, refId: ref.id, subject: mail.subject, createdAt: FieldValue.serverTimestamp() }
    if (!emailEnabled || (!key && !simulated)) await log.set({ ...entry, status: 'not_configured' })
    else if (simulated) await log.set({ ...entry, status: 'sent', provider: 'simulated', html: mail.html, replyTo: email })
    else {
      const id = await sendWithResend({ apiKey: key, from: emailFrom(), replyTo: email, to, subject: mail.subject, html: mail.html, text: mail.text })
      await log.set({ ...entry, status: 'sent', provider: 'resend', providerId: id })
    }
  } catch (e) {
    console.error('requestMembership mail', e)
  }
  return { ok: true }
})

/**
 * Invitaciones para elegir contraseña: enlace propio de CJ Club, válido 24 horas y de un solo uso.
 * En invites/{huella del código} (solo el servidor; el código en sí solo va en el correo).
 * Al crear una nueva para la misma persona, las anteriores dejan de valer.
 */
const INVITE_HOURS = 24
const inviteRef = (token: string) => db.doc(`invites/${createHash('sha256').update(token).digest('hex')}`)

async function createInvite(uid: string, email: string) {
  const old = await db.collection('invites').where('uid', '==', uid).get()
  await Promise.all(old.docs.map((d) => d.ref.delete()))
  const token = randomBytes(32).toString('base64url')
  await inviteRef(token).set({ uid, email, expiresAt: Timestamp.fromMillis(Date.now() + INVITE_HOURS * 3600_000), createdAt: FieldValue.serverTimestamp() })
  return token
}

async function validInvite(token: unknown) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{30,80}$/.test(token)) throw new HttpsError('not-found', 'invalid')
  const snap = await inviteRef(token).get()
  if (!snap.exists || (snap.get('expiresAt') as Timestamp).toMillis() < Date.now()) throw new HttpsError('not-found', 'invalid')
  return snap
}

/** La pantalla /contrasena comprueba el enlace y muestra a qué correo corresponde */
export const checkInvite = onCall(async (request) => {
  const snap = await validInvite((request.data ?? {}).token)
  return { email: String(snap.get('email')) }
})

/** Guarda la contraseña elegida y anula el enlace. Después la app entra con el correo y esa contraseña. */
export const completeInvite = onCall(async (request) => {
  const d = (request.data ?? {}) as Record<string, unknown>
  const password = typeof d.password === 'string' ? d.password : ''
  if (password.length < 8 || password.length > 128) throw new HttpsError('invalid-argument', 'short')
  const snap = await validInvite(d.token)
  const uid = String(snap.get('uid'))
  try {
    await getAuth().updateUser(uid, { password, emailVerified: true })
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/invalid-password') throw new HttpsError('invalid-argument', 'weak')
    if ((e as { code?: string }).code === 'auth/user-not-found') {
      await snap.ref.delete()
      throw new HttpsError('not-found', 'invalid')
    }
    throw e
  }
  await snap.ref.delete()
  return { email: String(snap.get('email')) }
})
