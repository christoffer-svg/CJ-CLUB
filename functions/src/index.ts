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
import { randomBytes, randomUUID } from 'node:crypto'
import { invitationEmail, isMailLanguage, sendWithResend, type MailRole } from './email.js'

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
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr']
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
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr']
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
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr']
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
  const languages = ['es', 'en', 'nl', 'sv', 'de', 'fr']
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

  // Borrado en lotes (máx. 500 operaciones por lote)
  const uses = await db.collection('dealUses').where('clientId', '==', clientId).get()
  const requests = await db.collection('requests').where('clientId', '==', clientId).get()
  const reservationClicks = await db.collection('reservationClicks').where('clientId', '==', clientId).get()
  const reservationConfirms = await db.collection('reservationConfirms').where('clientId', '==', clientId).get()
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
  const refs = [
    ...users.docs.map((d) => d.ref),
    ...uses.docs.map((d) => d.ref),
    ...requests.docs.map((d) => d.ref),
    ...reservationClicks.docs.map((d) => d.ref),
    ...reservationConfirms.docs.map((d) => d.ref),
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
    const generated = await getAuth().generatePasswordResetLink(email, { url: `${base}/acceso` })
    // La página de Firebase donde se elige la contraseña, en el idioma de la persona
    const url = new URL(generated)
    url.searchParams.set('lang', language)
    const link = url.toString()
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
  if (role === 'builder' && project.get('builderUid') === uid) return 'builder'
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
