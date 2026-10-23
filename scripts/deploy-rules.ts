/**
 * Publica firestore.rules en el proyecto real cj-club.
 * Uso: npm run deploy:rules
 *
 * Usa la API de reglas directamente porque la cuenta de servicio de Firebase no tiene
 * permiso para el paso previo de "firebase deploy" (comprobar las APIs activadas).
 */
import { readFileSync } from 'node:fs'
import { adminCredential } from './credentials'

const project = 'projects/cj-club'
const release = 'projects/cj-club/releases/cloud.firestore'

async function api(path: string, method: string, body?: unknown) {
  const { access_token } = await adminCredential().getAccessToken()
  const res = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, {
    method,
    headers: { authorization: `Bearer ${access_token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  const content = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  const ruleset = await api(`${project}/rulesets`, 'POST', {
    source: { files: [{ name: 'firestore.rules', content }] },
  })
  await api(release, 'PATCH', { release: { name: release, rulesetName: ruleset.name } })
  console.log('Reglas publicadas:', ruleset.name)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
