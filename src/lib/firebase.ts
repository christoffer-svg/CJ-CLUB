import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

// Configuración web de Firebase (.env). No es secreta: identifica el proyecto.
// La protección de los datos la dan las reglas de Firestore y las funciones de servidor.
// Se lee cada variable por su nombre para que Vite la sustituya y no incluya nada más.
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useEmulators ? 'demo-key' : undefined),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cj-club',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
auth.languageCode = 'es'

export const db = getFirestore(app)

// Funciones de servidor (carpeta functions/), en Madrid como la base de datos
export const functions = getFunctions(app, 'europe-southwest1')

// Firebase de pruebas local (npm run emulators); en la app publicada este bloque desaparece
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
