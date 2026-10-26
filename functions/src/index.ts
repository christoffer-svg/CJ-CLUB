/**
 * Funciones de servidor de CJ Club.
 * Se ejecutan con permisos de administrador de Firebase, por eso comprueban siempre
 * quién llama y qué puede hacer.
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { randomBytes } from 'node:crypto'

initializeApp()
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

/**
 * Crea un cliente nuevo: su cuenta de acceso (rol "client"), su ficha en clients/
 * y su perfil en users/. La invitación para elegir contraseña la envía después la app.
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
  if (existing) throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.')

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
      name: familyName,
      email,
      language,
      clientId: clientRef.id,
    })
    await batch.commit()
  } catch (e) {
    // Si no se pudo guardar la ficha, no dejamos una cuenta suelta
    await auth.deleteUser(user.uid).catch(() => {})
    throw e
  }

  return { clientId: clientRef.id, uid: user.uid, memberNumber }
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
  if (existing) throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.')

  const user = await auth.createUser({
    email,
    displayName: contactName,
    password: randomBytes(24).toString('base64url'),
  })

  try {
    await db.doc(`users/${user.uid}`).set({
      role: 'business',
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

  return { uid: user.uid, placeId, businessName }
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

  const users = await db.collection('users').where('clientId', '==', clientId).get()
  if (users.docs.some((u) => u.get('role') !== 'client')) {
    throw new HttpsError('failed-precondition', 'Este cliente tiene una cuenta del equipo de CJ vinculada. Revísela antes de darle de baja.')
  }

  const auth = getAuth()
  for (const u of users.docs) {
    await auth.deleteUser(u.id).catch((e: { code?: string }) => {
      if (e.code !== 'auth/user-not-found') throw e
    })
  }

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
    dealUses: uses.size,
    requests: requests.size,
    reservationClicks: reservationClicks.size,
    reservationConfirms: reservationConfirms.size,
    ownContacts: ownContacts.size + sharedContacts.size,
    houseNotes: houseNotes.size + sharedHouseNotes.size,
  }
})
