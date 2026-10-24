/**
 * Funciones de servidor de CJ Club.
 * Se ejecutan con permisos de administrador de Firebase, por eso comprueban siempre
 * que quien las llama es del equipo de CJ (rol "admin").
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
  const language = data.language === 'en' ? 'en' : 'es'
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
