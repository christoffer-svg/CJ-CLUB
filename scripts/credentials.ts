import { applicationDefault, cert, type Credential } from 'firebase-admin/app'

// Cuenta de servicio de Firebase del proyecto (no es secreta; la clave sí)
const CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@cj-club.iam.gserviceaccount.com'

/**
 * Credencial de administrador para los scripts. Se configura en el entorno de trabajo,
 * nunca en el repositorio, con una de estas variables:
 * - FIREBASE_PRIVATE_KEY: solo el valor de "private_key" del archivo de la clave (una línea, con \n)
 * - FIREBASE_SERVICE_ACCOUNT_JSON: el archivo completo en una sola línea
 * Si no hay ninguna, usa GOOGLE_APPLICATION_CREDENTIALS.
 */
export function adminCredential(): Credential {
  const key = process.env.FIREBASE_PRIVATE_KEY
  if (key) {
    return cert({
      projectId: 'cj-club',
      clientEmail: CLIENT_EMAIL,
      privateKey: key.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    })
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  return json ? cert(JSON.parse(json)) : applicationDefault()
}
