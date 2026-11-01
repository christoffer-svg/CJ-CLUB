/**
 * Pruebas de los archivos de Mi reforma (fotos y PDF) contra el Firebase de pruebas local.
 * Nadie lee ni escribe el almacén directamente (storage.rules lo cierra todo): los archivos
 * los sube la función uploadProjectFile, que comprueba quién es cada persona en la obra.
 * Mismos pasos previos que tests/firestore-rules.mjs (emuladores y datos de ejemplo con constructor).
 */
const A = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1', H = { 'content-type': 'application/json' }
const ST = 'http://127.0.0.1:9199/v0/b/cj-club.firebasestorage.app/o'
const FN = 'http://127.0.0.1:5001/cj-club/europe-southwest1/uploadProjectFile'
let pass = 0, fail = 0
const ok = (got, want, m) => { got === want ? pass++ : (fail++, console.log(`FAIL ${m} → ${got} (esperado ${want})`)) }
const signIn = (email, password) => fetch(`${A}/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: H, body: JSON.stringify({ email, password, returnSecureToken: true }) }).then(r => r.json()).then(r => r.idToken)
const signUp = (email, password) => fetch(`${A}/accounts:signUp?key=demo-key`, { method: 'POST', headers: H, body: JSON.stringify({ email, password, returnSecureToken: true }) }).then(r => r.json())
const direct = (t, path) => fetch(`${ST}?name=${encodeURIComponent(path)}`, { method: 'POST', headers: { 'content-type': 'image/jpeg', ...(t ? { authorization: 'Firebase ' + t } : {}) }, body: new Uint8Array(100) }).then(r => r.status)
const readDirect = (t, path) => fetch(`${ST}/${encodeURIComponent(path)}?alt=media`, { headers: t ? { authorization: 'Firebase ' + t } : {} }).then(r => r.status)
const b64 = (n) => Buffer.alloc(n, 7).toString('base64')
// Llama a la función; devuelve 'ok' con los datos o el código de error
async function up(t, d) {
  const r = await fetch(FN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { projectId: 'p-jansen-cocina', index: 1, name: 'foto.jpg', contentType: 'image/jpeg', data: b64(2048), ...d } }) })
  const j = await r.json()
  return j.error ? j.error.status : { ...j.result, ok: 'ok' }
}
const code = (x) => (typeof x === 'string' ? x : x.ok)

const J = await signIn('jansen@prueba.test', 'Prueba1234')
const AD = await signIn('admin@prueba.test', 'Admin1234')
const B = await signIn('constructor@prueba.test', 'Obra1234')
let L = await signIn('lindqvist@prueba.test', 'Prueba1234')
if (!L) L = (await signUp('sin-ficha@prueba.test', 'Prueba1234')).idToken
const X = (await signUp(`intruso${Date.now()}@prueba.test`, 'Intruso1234')).idToken
const e = `s${Date.now()}`

const foto = await up(B, { kind: 'updates', entryId: e + 'u1' })
ok(code(foto), 'ok', 'constructor sube una foto a un avance')
ok(code(await up(AD, { kind: 'updates', entryId: e + 'u2' })), 'ok', 'CJ sube una foto a un avance')
ok(code(await up(J, { kind: 'updates', entryId: e + 'u3' })), 'PERMISSION_DENIED', 'cliente sube fotos a un avance')
const pdf = await up(J, { kind: 'payments', entryId: e + 'p1', name: 'recibo.pdf', contentType: 'application/pdf' })
ok(code(pdf), 'ok', 'cliente sube un justificante en PDF')
ok(code(await up(B, { kind: 'payments', entryId: e + 'p2' })), 'ok', 'constructor sube un justificante')
ok(code(await up(L, { kind: 'payments', entryId: e + 'p3' })), 'PERMISSION_DENIED', 'otra familia sube a la obra')
ok(code(await up(X, { kind: 'payments', entryId: e + 'p4' })), 'PERMISSION_DENIED', 'no invitado sube a la obra')
ok(code(await up(null, { kind: 'payments', entryId: e + 'p5' })), 'UNAUTHENTICATED', 'anónimo sube a la obra')
ok(code(await up(B, { kind: 'updates', entryId: e + 'u4', name: 'virus.exe', contentType: 'application/octet-stream' })), 'INVALID_ARGUMENT', 'solo fotos y PDF')
ok(code(await up(B, { kind: 'updates', entryId: e + 'u5', data: b64(11 * 1024 * 1024) })), 'INVALID_ARGUMENT', 'más de 10 MB')
ok(code(await up(B, { kind: 'updates', entryId: e + 'u1' })), 'ALREADY_EXISTS', 'no se puede reemplazar un archivo ya subido')
ok(code(await up(B, { projectId: 'otra-obra', kind: 'updates', entryId: e + 'u6' })), 'PERMISSION_DENIED', 'constructor sube a una obra que no existe o no es suya')
ok(code(await up(B, { kind: 'otra-carpeta', entryId: e + 'u7' })), 'INVALID_ARGUMENT', 'nadie sube fuera de las carpetas previstas')
ok(code(await up(B, { kind: 'updates', entryId: '../../x' })), 'INVALID_ARGUMENT', 'nombre de entrada no válido')

ok(code(await up(B, { kind: 'budget', entryId: e + 'b1' })), 'ok', 'constructor sube la foto de una línea del presupuesto')
ok(code(await up(AD, { kind: 'budget', entryId: e + 'b2', index: 7 })), 'ok', 'CJ añade una foto más a una línea')
ok(code(await up(J, { kind: 'budget', entryId: e + 'b3' })), 'PERMISSION_DENIED', 'cliente sube fotos al presupuesto')
ok(code(await up(B, { projectId: 'p-firmas', kind: 'budget', entryId: e + 'b4' })), 'FAILED_PRECONDITION', 'presupuesto ya firmado: no se suben fotos (requiere haber pasado firestore-rules.mjs)')
ok(code(await up(AD, { projectId: 'p-firmas', kind: 'selections', entryId: e + 's1' })), 'ok', 'CJ sube la foto de una elección (presupuesto firmado)')
ok(code(await up(J, { projectId: 'p-firmas', kind: 'selections', entryId: e + 's2' })), 'PERMISSION_DENIED', 'el cliente no sube fotos de elecciones')
ok(code(await up(B, { kind: 'selections', entryId: e + 's3' })), 'FAILED_PRECONDITION', 'sin presupuesto firmado no hay fotos de elecciones')
ok(typeof foto.url === 'string' && foto.url.includes('token='), true, 'la foto tiene enlace privado')
ok(foto.path?.startsWith(`projects/p-jansen-cocina/updates/${e}u1/1-`), true, 'la foto queda en la carpeta de su avance')
ok(await fetch(foto.url).then(r => r.status), 200, 'el enlace privado abre la foto')
ok(await fetch(foto.url.replace(/token=[^&]+/, 'token=adivinado')).then(r => r.status) !== 200, true, 'un enlace inventado no abre nada')

ok(await direct(AD, `projects/p-jansen-cocina/updates/${e}d/1.jpg`), 403, 'nadie sube directamente al almacén (ni CJ)')
ok(await direct(J, `projects/p-jansen-cocina/payments/${e}d/1.jpg`), 403, 'cliente no sube directamente')
ok(await readDirect(L, pdf.path), 403, 'otra familia no lee el almacén sin enlace')
ok(await readDirect(null, pdf.path), 403, 'anónimo no lee el almacén sin enlace')

console.log(`Archivos: ${pass} OK, ${fail} FAIL`)
if (fail) process.exit(1)
