import { applicationDefault, cert, type Credential } from 'firebase-admin/app'

/**
 * Credencial de administrador para los scripts.
 * Se lee de la variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON (configurada en el entorno
 * de trabajo, nunca en el repositorio) o, si no existe, de GOOGLE_APPLICATION_CREDENTIALS.
 */
export function adminCredential(): Credential {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  return json ? cert(JSON.parse(json)) : applicationDefault()
}
