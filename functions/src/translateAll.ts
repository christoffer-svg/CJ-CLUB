/**
 * Pone al día las traducciones automáticas de todo el contenido. Lo ejecuta la publicación
 * (GitHub Actions) con la cuenta de publicación; solo traduce lo que aún no está traducido.
 * Uso: node lib/translateAll.js
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { translateEverything } from './autoTranslate.js'

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'cj-club' })
translateEverything(getFirestore())
  .then((n) => console.log(`Traducciones automáticas: ${n} textos nuevos.`))
  .catch((e) => {
    console.error('No se pudieron poner al día las traducciones:', e)
    process.exit(1)
  })
