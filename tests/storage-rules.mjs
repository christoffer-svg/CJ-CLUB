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
ok(code(await up(J, { kind: 'snags', entryId: e + 'r1' })), 'ok', 'el cliente sube la foto de un repaso')
ok(code(await up(B, { kind: 'snags', entryId: e + 'r1', index: 2 })), 'ok', 'el constructor sube la foto del arreglo')
const DS = await signIn('disenador@prueba.test', 'Diseno1234')
const upPlan = async (t, d) => {
  const r = await fetch(FN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { reformId: 'r-firmas', kind: 'plans', index: 1, name: 'planta.pdf', contentType: 'application/pdf', data: b64(2048), ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : 'ok'
}
ok(await upPlan(DS, { entryId: e + 'p1' }), 'ok', 'la arquitecta sube un plano (requiere haber pasado firestore-rules.mjs)')
ok(await upPlan(AD, { entryId: e + 'p2' }), 'ok', 'CJ sube un plano')
ok(await upPlan(J, { entryId: e + 'p3' }), 'PERMISSION_DENIED', 'el cliente no sube planos')
ok(await upPlan(B, { entryId: e + 'p4' }), 'PERMISSION_DENIED', 'el constructor no sube planos')
ok(code(await up(DS, { kind: 'payments', entryId: e + 'p5' })), 'PERMISSION_DENIED', 'la arquitecta no sube justificantes de pago')
ok(typeof foto.url === 'string' && foto.url.includes('token='), true, 'la foto tiene enlace privado')
ok(foto.path?.startsWith(`projects/p-jansen-cocina/updates/${e}u1/1-`), true, 'la foto queda en la carpeta de su avance')
ok(await fetch(foto.url).then(r => r.status), 200, 'el enlace privado abre la foto')
ok(await fetch(foto.url.replace(/token=[^&]+/, 'token=adivinado')).then(r => r.status) !== 200, true, 'un enlace inventado no abre nada')

ok(await direct(AD, `projects/p-jansen-cocina/updates/${e}d/1.jpg`), 403, 'nadie sube directamente al almacén (ni CJ)')
ok(await direct(J, `projects/p-jansen-cocina/payments/${e}d/1.jpg`), 403, 'cliente no sube directamente')
ok(await readDirect(L, pdf.path), 403, 'otra familia no lee el almacén sin enlace')
ok(await readDirect(null, pdf.path), 403, 'anónimo no lee el almacén sin enlace')

// Documento de identidad para firmar (función uploadIdentity)
const IDFN = FN.replace('uploadProjectFile', 'uploadIdentity')
const upId = async (t, d) => {
  const r = await fetch(IDFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { projectId: 'p-jansen-cocina', docType: 'dni', part: 1, name: 'dni.jpg', contentType: 'image/jpeg', data: b64(2048), ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : 'ok'
}
ok(await upId(J, { part: 2 }), 'FAILED_PRECONDITION', 'la parte trasera no va sin la delantera')
ok(await upId(J, {}), 'ok', 'el cliente sube su DNI por delante')
ok(await upId(J, { part: 2 }), 'ok', 'y por detrás')
ok(await upId(J, { part: 2 }), 'FAILED_PRECONDITION', 'no más de dos fotos')
ok(await upId(J, { docType: 'passport' }), 'ok', 'el cliente lo cambia por su pasaporte')
const idDocR = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/projects/p-jansen-cocina/identities/client', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
ok(idDocR.fields?.docType?.stringValue === 'passport' && idDocR.fields?.files?.arrayValue?.values?.length === 1, true, 'al cambiarlo queda solo el documento nuevo')
const oldFront = idDocR.fields.files.arrayValue.values[0].mapValue.fields
ok(await fetch(oldFront.url.stringValue).then(r => r.status), 200, 'el documento se abre con su enlace privado')
ok(await readDirect(J, oldFront.path.stringValue), 403, 'nadie lee el documento sin el enlace')
ok(await upId(B, { docType: 'nie' }), 'ok', 'el constructor sube su NIE')
ok(await upId(AD, {}), 'PERMISSION_DENIED', 'CJ no se identifica por las partes')
ok(await upId(DS, {}), 'PERMISSION_DENIED', 'la arquitecta no firma')
ok(await upId(L, {}), 'PERMISSION_DENIED', 'otra familia no sube documentos')
ok(await upId(J, { projectId: 'p-firmas' }), 'FAILED_PRECONDITION', 'después de firmar ya no se cambia el documento')
ok(await upId(J, { docType: 'carnet' }), 'INVALID_ARGUMENT', 'solo DNI, NIE o pasaporte')

// Fotos de la presentación de los colaboradores (función uploadProfilePhoto)
const BZ = await signIn('terraza@prueba.test', 'Negocio1234')
const PFN = FN.replace('uploadProjectFile', 'uploadProfilePhoto')
const upPf = async (t, d) => {
  const r = await fetch(PFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { collection: 'places', id: 'rest-la-terraza', name: 'local.jpg', contentType: 'image/jpeg', data: b64(2048), ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const pf = await upPf(BZ, {})
ok(typeof pf === 'object' && pf.path.startsWith('profiles/places/rest-la-terraza/photos/'), true, 'el negocio sube una foto de su presentación')
ok(await fetch(pf.url).then(r => r.status), 200, 'la foto se abre con su enlace')
ok(await upPf(BZ, { id: 'golf-pinar' }), 'PERMISSION_DENIED', 'el negocio no sube fotos a otro negocio')
ok(await upPf(BZ, { collection: 'partners', id: 'lawyer-ruiz' }), 'PERMISSION_DENIED', 'el negocio no sube fotos a un colaborador de servicios')
ok(await upPf(J, {}), 'PERMISSION_DENIED', 'el cliente no sube fotos de presentación')
ok(typeof (await upPf(AD, { collection: 'partners', id: 'lawyer-ruiz' })) === 'object', true, 'CJ sube la foto de un colaborador de servicios')
ok(await upPf(AD, { id: 'no-existe' }), 'NOT_FOUND', 'no se sube a un lugar que no existe')
ok(await upPf(BZ, { name: 'carta.pdf', contentType: 'application/pdf' }), 'INVALID_ARGUMENT', 'en la presentación solo fotos')
const carta = await upPf(BZ, { kind: 'menu', name: 'carta.pdf', contentType: 'application/pdf' })
ok(typeof carta === 'object' && carta.path.startsWith('profiles/places/rest-la-terraza/menu/'), true, 'el negocio sube la carta en PDF')
ok(await upPf(BZ, { kind: 'menu', name: 'virus.exe', contentType: 'application/octet-stream' }), 'INVALID_ARGUMENT', 'la carta solo en fotos o PDF')
ok(await upPf(null, {}), 'UNAUTHENTICATED', 'anónimo no sube fotos')

// Pedidos de comida (función placeOrder): los precios los pone el servidor
const OFN = FN.replace('uploadProjectFile', 'placeOrder')
const order = async (t, d) => {
  const r = await fetch(OFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { placeId: 'rest-la-terraza', name: 'Familia Jansen', phone: '600 111 222', mode: 'pickup', address: '', wanted: 'asap', note: '', lines: [{ itemId: 'd1', qty: 2 }, { itemId: 'd5', qty: 1 }], ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const fsGet = (path) => fetch(`http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/${path}`, { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
const o1 = await order(J, { lines: [{ itemId: 'd1', qty: 2, price: 0.01 }, { itemId: 'd5', qty: 1 }] })
ok(typeof o1 === 'object' && o1.total === 23.5, true, 'pedido para recoger: 2 × 8,50 + 6,50 = 23,50 (el precio enviado por la app no cuenta): ' + JSON.stringify(o1))
const saved = await fsGet(`orders/${o1.id}`)
ok(saved.fields?.status?.stringValue === 'new' && saved.fields?.clientId?.stringValue === 'jansen', true, 'el pedido queda nuevo y a nombre de la casa')
ok((await order(J, { mode: 'delivery', address: 'Calle Mayor 1' }))?.total, 26.5, 'a domicilio suma el envío (3 €)')
ok(await order(J, { mode: 'delivery', address: 'Calle Mayor 1', lines: [{ itemId: 'd5', qty: 1 }] }), 'FAILED_PRECONDITION', 'por debajo del pedido mínimo a domicilio')
ok(await order(J, { mode: 'delivery', address: '' }), 'INVALID_ARGUMENT', 'a domicilio sin dirección')
ok(await order(J, { lines: [{ itemId: 'd4', qty: 1 }] }), 'FAILED_PRECONDITION', 'un plato agotado no se puede pedir')
ok(await order(J, { lines: [{ itemId: 'no-existe', qty: 1 }] }), 'FAILED_PRECONDITION', 'un plato que no existe')
ok(await order(J, { lines: [] }), 'INVALID_ARGUMENT', 'pedido vacío')
ok(await order(J, { lines: [{ itemId: 'd1', qty: 0 }] }), 'INVALID_ARGUMENT', 'cantidad cero')
ok(await order(J, { phone: '12' }), 'INVALID_ARGUMENT', 'sin teléfono válido')
ok(await order(J, { wanted: '25:99' }), 'INVALID_ARGUMENT', 'hora no válida')
ok(await order(J, { placeId: 'golf-pinar' }), 'FAILED_PRECONDITION', 'un golf no recibe pedidos')
ok(await order(BZ, {}), 'PERMISSION_DENIED', 'un negocio no hace pedidos')
ok(await order(null, {}), 'UNAUTHENTICATED', 'anónimo no hace pedidos')

// Avisos por correo al negocio (en pruebas se simulan y quedan en mailLog)
const mailFor = async (refId) => {
  const r = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents:runQuery', { method: 'POST', headers: { ...H, authorization: 'Bearer owner' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'mailLog' }], where: { fieldFilter: { field: { fieldPath: 'refId' }, op: 'EQUAL', value: { stringValue: refId } } } } }) }).then(r => r.json())
  return r.filter(x => x.document).map(x => x.document.fields)
}
const om = await mailFor(o1.id)
ok(om.some(m => m.to.stringValue === 'terraza@prueba.test' && m.status.stringValue === 'sent' && m.subject.stringValue.includes('23,50 €')), true, 'el restaurante recibe un correo con el pedido: ' + JSON.stringify(om.map(m => [m.to?.stringValue, m.status?.stringValue, m.subject?.stringValue])))
ok(om[0]?.html?.stringValue.includes('2 × Croquetas'), true, 'el correo lleva los platos')
const NFN = FN.replace('uploadProjectFile', 'notifyBooking')
const notify = async (t, id) => {
  const r = await fetch(NFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { bookingId: id } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
ok(await notify(L, 'bk1'), 'PERMISSION_DENIED', 'otra familia no provoca avisos de una reserva ajena')
ok((await notify(J, 'bk1'))?.sent, true, 'al pedir reserva, el negocio recibe un correo')
ok((await notify(J, 'bk1'))?.sent, false, 'el aviso de una reserva se envía una sola vez')
const bm = await mailFor('bk1')
ok(bm.length >= 1 && bm.every(m => m.subject.stringValue.startsWith('Solicitud de reserva')) && bm.some(m => m.to.stringValue === 'terraza@prueba.test'), true, 'correo de la solicitud de reserva en mailLog')

console.log(`Archivos: ${pass} OK, ${fail} FAIL`)
if (fail) process.exit(1)
