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

// Fotos de Social (función uploadSocialPhoto)
const SFN = FN.replace('uploadProjectFile', 'uploadSocialPhoto')
const upSocial = async (t, d) => {
  const r = await fetch(SFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { postId: 'nuevoPost1234567', name: 'playa.jpg', contentType: 'image/jpeg', data: b64(2048), ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const sp = await upSocial(J, {})
ok(typeof sp === 'object' && sp.path.startsWith('social/jansen/nuevoPost1234567/'), true, 'el cliente sube la foto de una publicación a la carpeta de su casa')
ok(await upSocial(J, { postId: '../../otra' }), 'INVALID_ARGUMENT', 'nombre de publicación no válido')
ok(await upSocial(BZ, {}), 'PERMISSION_DENIED', 'un negocio no sube fotos a Social')
const cjp = await upSocial(AD, { postId: 'cjPost1234567890' })
ok(typeof cjp === 'object' && cjp.path.startsWith('social/cj/cjPost1234567890/'), true, 'CJ sube fotos de sus recomendaciones a la carpeta de CJ')
ok(await upSocial(J, { contentType: 'application/pdf' }), 'INVALID_ARGUMENT', 'en Social solo fotos')

// Foto de perfil de la casa (función setClientPhoto)
const CFN = FN.replace('uploadProjectFile', 'setClientPhoto')
const setPhoto = async (t, d) => {
  const r = await fetch(CFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { name: 'familia.jpg', contentType: 'image/jpeg', data: b64(2048), ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const ph1 = await setPhoto(J, {})
ok(ph1?.photo?.path?.startsWith('clients/jansen/photo/'), true, 'el cliente pone la foto de su casa')
const prof = await fsGet('socialProfiles/jansen')
ok(prof.fields?.familyName?.stringValue === 'Familia Jansen' && prof.fields?.photo?.mapValue?.fields?.url?.stringValue === ph1.photo.url, true, 'la foto se ve en Social con el nombre de la familia')
const ph2 = await setPhoto(J, { name: 'casa.jpg' })
ok(await fetch(ph1.photo.url).then(r => r.status) !== 200 && await fetch(ph2.photo.url).then(r => r.status) === 200, true, 'al cambiarla se borra la anterior')
ok((await setPhoto(J, { remove: true }))?.photo, null, 'el cliente quita su foto')
ok((await fsGet('clients/jansen')).fields?.photo?.nullValue, null, 'la ficha queda sin foto')
ok(await setPhoto(BZ, {}), 'PERMISSION_DENIED', 'un negocio no pone fotos de perfil de casas')
ok(await setPhoto(J, { contentType: 'application/pdf' }), 'INVALID_ARGUMENT', 'la foto de perfil solo puede ser una imagen')

// Traducción de Social (función translateSocial; en pruebas se simula con "[idioma] texto")
const TFN = FN.replace('uploadProjectFile', 'translateSocial')
const tr = async (t, d) => {
  const r = await fetch(TFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { target: 'pl', ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const tp = await tr(J, { postId: 'sp-golf' })
ok(tp?.texts?.[0] === '[pl] Golf en La Sella' && tp.texts[2].startsWith('[pl] Estaremos') && tp.same === false, true, 'el cliente traduce una publicación al polaco')
const cacheCount = async () => ((await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/translationCache?pageSize=300', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())).documents ?? []).length
const before = await cacheCount()
ok((await tr(J, { postId: 'sp-golf' }))?.texts?.[0], '[pl] Golf en La Sella', 'la segunda vez sale de lo ya traducido')
ok(await cacheCount(), before, 'no se vuelve a pagar por el mismo texto')
ok(await tr(J, { postId: 'sp-golf', target: 'xx' }), 'INVALID_ARGUMENT', 'solo idiomas de la app')
ok(await tr(BZ, { postId: 'sp-golf' }), 'PERMISSION_DENIED', 'un negocio no usa la traducción de Social')
ok(await tr(null, { postId: 'sp-golf' }), 'UNAUTHENTICATED', 'sin sesión no se traduce')
ok(await tr(J, { postId: 'noExiste' }), 'NOT_FOUND', 'publicación que no existe')
const tm = await tr(J, { chatId: 'sp1_jansen', messageId: 'm2' })
ok(tm?.texts?.[0], '[pl] A las 9, mi móvil es 600 000 000', 'una casa del chat traduce un mensaje')
ok(await tr(AD, { chatId: 'sp1_jansen', messageId: 'm2' }), 'PERMISSION_DENIED', 'CJ no puede traducir (ni leer) los chats privados')
ok(await tr(X, { chatId: 'sp1_jansen', messageId: 'm2' }), 'PERMISSION_DENIED', 'alguien de fuera no traduce mensajes')
ok(await cacheCount(), before, 'los mensajes de chat no se guardan traducidos')

// Traducción automática de la información de los negocios (función autoTranslateDoc)
const AFN = FN.replace('uploadProjectFile', 'autoTranslateDoc')
const autoTr = async (t, path) => {
  const r = await fetch(AFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { path } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const autoList = async (lang) => ((await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents:runQuery', { method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'autoTranslations' }], where: { fieldFilter: { field: { fieldPath: 'lang' }, op: 'EQUAL', value: { stringValue: lang } } } } }) }).then(r => r.json())).filter(x => x.document).map(x => x.document.fields))
const first = await autoTr(BZ, 'places/rest-la-terraza')
ok(typeof first?.translated === 'number' && first.translated > 0, true, 'el negocio guarda su ficha y se traduce sola')
const pl = await autoList('pl')
const terraza = await fsGet('places/rest-la-terraza')
const aboutEs = terraza.fields?.about_es?.stringValue ?? ''
ok(pl.some(d => d.src.stringValue === aboutEs.trim() && d.text.stringValue === '[pl] ' + aboutEs.trim()), true, 'la presentación queda traducida al polaco')
ok((await autoTr(BZ, 'places/rest-la-terraza'))?.translated, 0, 'lo ya traducido no se vuelve a pagar')
const en = await autoList('en')
const aboutEn = terraza.fields?.about_en?.stringValue ?? ''
ok(!aboutEn || !en.some(d => d.src.stringValue === aboutEs.trim()), true, 'lo que el negocio escribió en inglés no se traduce encima')
ok(await autoTr(J, 'places/rest-la-terraza'), 'PERMISSION_DENIED', 'un cliente no pide traducciones de fichas')
ok(await autoTr(null, 'places/rest-la-terraza'), 'UNAUTHENTICATED', 'sin sesión no se traduce')
ok((await autoTr(AD, 'clients/jansen'))?.translated, 0, 'datos privados (clientes) nunca se traducen')
ok(await autoTr(AD, '../x'), 'INVALID_ARGUMENT', 'ruta no válida')
const items = await autoTr(BZ, 'places/rest-la-terraza/orderItems/d1')
ok(items?.translated > 0, true, 'los platos de la carta se traducen')

// Traducción de «Mi reforma» (función translateReform; en pruebas se simula)
const RFN = FN.replace('uploadProjectFile', 'translateReform')
const trRef = async (t, d) => {
  const r = await fetch(RFN, { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data: { projectId: 'p-jansen-cocina', target: 'sv', ...d } }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
const rf1 = await trRef(J, {})
ok(rf1?.translated > 0, true, 'el cliente abre su reforma en sueco y se traduce')
const rdoc = await fsGet('projects/p-jansen-cocina/translations/sv')
const ritems = rdoc.fields?.items?.arrayValue?.values ?? []
const titleR = (await fsGet('projects/p-jansen-cocina')).fields.title.stringValue
ok(ritems.some(v => v.mapValue.fields.s.stringValue === titleR && v.mapValue.fields.t.stringValue.startsWith('[sv')), true, 'el título de la reforma queda traducido')
ok((await trRef(J, {}))?.translated, 0, 'lo ya traducido no se vuelve a pagar')
ok(await trRef(J, { target: 'es' }), 'INVALID_ARGUMENT', 'al español no se traduce (es el original)')
ok(await trRef(BZ, {}), 'PERMISSION_DENIED', 'un negocio no traduce reformas ajenas')
ok(await trRef(X, {}), 'PERMISSION_DENIED', 'alguien de fuera tampoco')
ok(typeof (await trRef(B, {}))?.translated, 'number', 'el constructor de la obra también puede')

// «Formar parte de CJ Club» (función requestMembership, sin sesión)
const JFN = FN.replace('uploadProjectFile', 'requestMembership')
const join = async (d) => {
  const r = await fetch(JFN, { method: 'POST', headers: H, body: JSON.stringify({ data: { name: 'Anna Berg', email: 'anna@prueba.test', phone: '+46 70 123 45 67', country: 'Suecia', message: 'Tenemos casa en Moraira.', consent: true, language: 'sv', ...d } }) })
  const j = await r.json(); return j.error ? j.error.message : j.result
}
ok((await join({}))?.ok, true, 'alguien sin cuenta pide formar parte de CJ Club')
const reqs = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/membershipRequests', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
ok(reqs.documents?.some(d => d.fields.email.stringValue === 'anna@prueba.test' && d.fields.status.stringValue === 'new'), true, 'la solicitud queda en el panel de CJ')
const mails = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/mailLog?pageSize=300', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
ok(mails.documents?.some(d => d.fields.kind?.stringValue === 'join' && d.fields.to?.stringValue === 'info@cjclub.eu' && d.fields.replyTo?.stringValue === 'anna@prueba.test' && d.fields.html?.stringValue.includes('Moraira')), true, 'a CJ le llega el correo con los datos (responder va a la persona)')
ok(await join({ email: 'no-es-correo' }), 'email', 'correo no válido')
ok(await join({ consent: false }), 'consent', 'sin aceptar la privacidad no se envía')
ok(await join({ phone: '12' }), 'phone', 'teléfono no válido')
ok((await join({ website: 'http://spam' }))?.ok, true, 'los robots creen que ha ido bien…')
const reqs2 = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/membershipRequests', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
ok(reqs2.documents.length, reqs.documents.length, '…pero no se guarda nada')
await join({}); await join({})
ok(await join({}), 'limit', 'máximo 3 solicitudes por conexión y día')

// Invitación con enlace propio de CJ Club (24 horas, un solo uso)
const call = async (name, t, data) => {
  const r = await fetch(FN.replace('uploadProjectFile', name), { method: 'POST', headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ data }) })
  const j = await r.json(); return j.error ? j.error.status : j.result
}
ok((await call('sendInvitationEmail', AD, { email: 'lindqvist@prueba.test' }))?.sent, true, 'CJ envía la invitación')
const invMails = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/mailLog?pageSize=300', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
const invHtml = invMails.documents.filter(d => d.fields.kind?.stringValue === 'invitation' && d.fields.to?.stringValue === 'lindqvist@prueba.test' && d.fields.html).map(d => d.fields.html.stringValue).pop() ?? ''
const tok = (invHtml.match(/contrasena\?invite=([A-Za-z0-9_-]+)/) ?? [])[1]
ok(Boolean(tok) && invHtml.includes('24'), true, 'el correo lleva el enlace de CJ Club y dice que vale 24 horas')
const invDocs = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/invites', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
const inv = invDocs.documents.find(d => d.fields.email.stringValue === 'lindqvist@prueba.test')
const hours = (new Date(inv.fields.expiresAt.timestampValue) - Date.now()) / 3600000
ok(hours > 23.9 && hours <= 24, true, 'el enlace caduca dentro de 24 horas')
ok(!inv.name.endsWith(tok), true, 'el código no se guarda tal cual (solo su huella)')
ok((await call('checkInvite', null, { token: tok }))?.email, 'lindqvist@prueba.test', 'la pantalla sabe para qué correo es')
ok(await call('checkInvite', null, { token: 'x'.repeat(43) }), 'NOT_FOUND', 'un código inventado no vale')
ok(await call('completeInvite', null, { token: tok, password: 'corta' }), 'INVALID_ARGUMENT', 'contraseña de menos de 8 caracteres')
ok((await call('completeInvite', null, { token: tok, password: 'Prueba1234' }))?.email, 'lindqvist@prueba.test', 'la persona elige su contraseña')
ok(await call('completeInvite', null, { token: tok, password: 'Otra12345' }), 'NOT_FOUND', 'el enlace solo se puede usar una vez')
ok(typeof (await signIn('lindqvist@prueba.test', 'Prueba1234')), 'string', 'entra con la contraseña elegida')
ok((await call('sendInvitationEmail', AD, { email: 'lindqvist@prueba.test' }))?.sent, true, 'reenviar invitación…')
const invDocs2 = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/invites', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
ok(invDocs2.documents.filter(d => d.fields.email.stringValue === 'lindqvist@prueba.test').length, 1, '…deja una sola invitación válida por persona')
ok(await call('sendInvitationEmail', J, { email: 'lindqvist@prueba.test' }), 'PERMISSION_DENIED', 'solo CJ envía invitaciones')

// Equipo de CJ: empleados de contenido (createTeamMember / removeTeamMember)
ok(await call('createTeamMember', J, { name: 'X', email: 'x@prueba.test' }), 'PERMISSION_DENIED', 'un cliente no crea empleados')
const team = await call('createTeamMember', AD, { name: 'Marta Ruiz', email: 'marta@prueba.test', language: 'es' })
ok(typeof team?.uid, 'string', 'CJ da acceso de contenido a un empleado')
const teamDoc = await fsGet('users/' + team.uid)
ok(teamDoc.fields?.role?.stringValue, 'editor', 'el empleado entra como editor de contenido')
ok(await call('createTeamMember', AD, { name: 'Marta Ruiz', email: 'marta@prueba.test' }), 'ALREADY_EXISTS', 'no se duplica')
ok((await call('sendInvitationEmail', AD, { email: 'marta@prueba.test' }))?.sent, true, 'le llega la invitación')
const teamMails = await fetch('http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents/mailLog?pageSize=300', { headers: { authorization: 'Bearer owner' } }).then(r => r.json())
ok(teamMails.documents.some(d => d.fields.to?.stringValue === 'marta@prueba.test' && (d.fields.html?.stringValue ?? '').includes('equipo de CJ')), true, 'con el texto del equipo de CJ')
ok(await call('removeTeamMember', J, { uid: team.uid }), 'PERMISSION_DENIED', 'un cliente no quita accesos')
ok((await call('removeTeamMember', AD, { uid: team.uid }))?.removed, 'account', 'CJ le quita el acceso')
ok((await fsGet('users/' + team.uid)).error?.code, 404, 'su ficha desaparece')

console.log(`Archivos: ${pass} OK, ${fail} FAIL`)
if (fail) process.exit(1)
