import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

/** Documentos con información que se traduce sola (igual que en functions/src/autoTranslate.ts) */
const TRANSLATABLE = [
  /^places\/[^/]+$/,
  /^places\/[^/]+\/orderItems\/[^/]+$/,
  /^partners\/[^/]+$/,
  /^generalContacts\/[^/]+$/,
  /^deals\/[^/]+$/,
  /^events\/[^/]+$/,
  /^services\/[^/]+$/,
  /^placeCategories\/[^/]+$/,
  /^settings\/tipOfTheWeek$/,
]

const call = httpsCallable<{ path: string }, { translated: number }>(functions, 'autoTranslateDoc', { timeout: 120_000 })

/**
 * Después de guardar en el panel: el servidor traduce a todos los idiomas de la app lo que falte.
 * Va en segundo plano; si falla, se pone al día en la siguiente publicación de la app.
 */
export function autoTranslate(path: string) {
  if (TRANSLATABLE.some((re) => re.test(path))) call({ path }).catch(() => {})
}
