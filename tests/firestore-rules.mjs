/**
 * Pruebas de las reglas de seguridad de Firestore (firestore.rules) contra el Firebase de pruebas local.
 *
 * Uso:
 *   1. npm run emulators                       (en otra terminal)
 *   2. npm run seed:emulator -- --admin-email=admin@prueba.test --admin-password=Admin1234 \
 *        --client-email=jansen@prueba.test --client-password=Prueba1234
 *   3. npm run test:rules
 *
 * Personas: Jansen y Lindqvist (clientes), el admin, una cuenta no invitada,
 * dos negocios (La Terraza del Puerto y el golf) y la pareja de Jansen (misma cuenta familiar).
 */
const A = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1', F = 'http://127.0.0.1:8080/v1/projects/cj-club/databases/(default)/documents'
const H = { 'content-type': 'application/json' }
let pass = 0, fail = 0
const ok = (got, want, m) => { got === want ? pass++ : (fail++, console.log(`FAIL ${m} → ${got} (esperado ${want})`)) }
const signUp = (email, password) => fetch(`${A}/accounts:signUp?key=demo-key`, { method: 'POST', headers: H, body: JSON.stringify({ email, password, returnSecureToken: true }) }).then(r => r.json())
const signIn = (email, password) => fetch(`${A}/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: H, body: JSON.stringify({ email, password, returnSecureToken: true }) }).then(r => r.json())
const req = (t, path, method = 'GET', body) => fetch(`${F}/${path}`, { method, headers: { ...H, ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: body && JSON.stringify(body) }).then(r => r.status)
const ownerPatch = (path, fields) => fetch(`${F}/${path}`, { method: 'PATCH', headers: { ...H, authorization: 'Bearer owner' }, body: JSON.stringify({ fields }) })
const str = (s) => ({ stringValue: s })
const bool = (b) => ({ booleanValue: b })
const num = (n) => ({ integerValue: String(n) })
const patch = (t, path, fields) => req(t, `${path}?${Object.keys(fields).map(k => 'updateMask.fieldPaths=' + k).join('&')}`, 'PATCH', { fields })
const runQuery = (t, structuredQuery) => fetch(`${F}:runQuery`, { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t }, body: JSON.stringify({ structuredQuery }) }).then(r => r.status)
const runQueryAt = (t, parent, structuredQuery) => fetch(`${F}/${parent}:runQuery`, { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t }, body: JSON.stringify({ structuredQuery }) }).then(r => r.status)

// Cuenta no invitada (se registra sin ficha en users) y Lindqvist, segunda familia con acceso
await signUp('intruso@prueba.test', 'Intruso1234')
let l = await signUp('lindqvist@prueba.test', 'Prueba1234')
if (!l.localId) l = await signIn('lindqvist@prueba.test', 'Prueba1234')
await ownerPatch(`users/${l.localId}`, { role: str('client'), name: str('Familia Lindqvist'), email: str('lindqvist@prueba.test'), language: str('en'), clientId: str('lindqvist') })
let b = await signUp('terraza@prueba.test', 'Negocio1234')
if (!b.localId) b = await signIn('terraza@prueba.test', 'Negocio1234')
await ownerPatch(`users/${b.localId}`, { role: str('business'), name: str('Ana Torres'), email: str('terraza@prueba.test'), language: str('es'), placeId: str('rest-la-terraza') })
let g = await signUp('golf@prueba.test', 'Negocio1234')
if (!g.localId) g = await signIn('golf@prueba.test', 'Negocio1234')
await ownerPatch(`users/${g.localId}`, { role: str('business'), name: str('Golf'), email: str('golf@prueba.test'), language: str('es'), placeId: str('golf-pinar') })
const j = await signIn('jansen@prueba.test', 'Prueba1234'), a = await signIn('admin@prueba.test', 'Admin1234'), x = await signIn('intruso@prueba.test', 'Intruso1234')
let pareja = await signUp('pareja@prueba.test', 'Prueba1234')
if (!pareja.localId) pareja = await signIn('pareja@prueba.test', 'Prueba1234')
await ownerPatch(`users/${pareja.localId}`, { role: str('client'), name: str('Pareja Jansen'), email: str('pareja@prueba.test'), language: str('es'), clientId: str('jansen') })
const J = j.idToken, L = l.idToken, AD = a.idToken, X = x.idToken, B = b.idToken, G = g.idToken, P = pareja.idToken
const dealUse = (cid, did) => ({ fields: { clientId: str(cid), dealId: str(did), date: { timestampValue: new Date().toISOString() } } })

// Sin sesión / sin invitación: nada
for (const p of ['users/' + j.localId, 'clients/jansen', 'partners/lawyer-ruiz', 'partnerCategories/lawyer', 'generalContacts/emergencias', 'places/golf-pinar', 'deals/deal-golf', 'settings/tipOfTheWeek', 'dealUses', 'reservationClicks', 'reservationConfirms', 'reservationReports/rest-la-terraza_2026-10']) {
  ok(await req(null, p), 403, 'anónimo lee ' + p)
  ok(await req(X, p), 403, 'no invitado lee ' + p)
}
ok(await req(X, 'users/' + x.localId, 'PATCH', { fields: { role: str('admin'), clientId: str('jansen') } }), 403, 'no invitado se crea ficha de admin')
ok(await req(X, 'users/' + x.localId, 'PATCH', { fields: { role: str('client'), clientId: str('jansen') } }), 403, 'no invitado se crea ficha de cliente')

// users
ok(await req(J, 'users/' + j.localId), 200, 'cliente lee su usuario')
ok(await req(J, 'users/' + l.localId), 403, 'cliente lee usuario de otra familia')
ok(await req(J, 'users/' + a.localId), 403, 'cliente lee usuario del admin')
ok(await runQuery(J, { from: [{ collectionId: 'users' }] }), 403, 'cliente lista usuarios')
ok(await patch(J, 'users/' + j.localId, { language: str('en') }), 200, 'cliente cambia idioma')
ok(await patch(J, 'users/' + j.localId, { language: str('xx') }), 403, 'cliente pone idioma no válido')
for (const code of ['nl', 'sv', 'de', 'fr']) ok(await patch(J, 'users/' + j.localId, { language: str(code) }), 200, 'cliente elige ' + code)
ok(await patch(J, 'users/' + j.localId, { favorites: { arrayValue: { values: [str('golf-pinar')] } } }), 200, 'cliente cambia favoritos')
ok(await patch(J, 'users/' + j.localId, { role: str('admin') }), 403, 'cliente se hace admin')
ok(await patch(J, 'users/' + j.localId, { clientId: str('lindqvist') }), 403, 'cliente cambia su clientId')
ok(await patch(J, 'users/' + j.localId, { name: str('Otro') }), 403, 'cliente cambia su nombre')
ok(await patch(J, 'users/' + j.localId, { email: str('otro@x.com') }), 403, 'cliente cambia su correo')
ok(await patch(J, 'users/' + l.localId, { language: str('es') }), 403, 'cliente cambia idioma de otra familia')
ok(await req(J, 'users/' + j.localId, 'DELETE'), 403, 'cliente borra su usuario')
ok(await req(J, 'users/nuevo', 'PATCH', { fields: { role: str('client') } }), 403, 'cliente crea usuarios')
ok(await patch(AD, 'users/' + a.localId, { role: str('client') }), 403, 'admin se cambia su propio rol')
ok(await req(AD, 'users/' + a.localId, 'DELETE'), 403, 'admin se borra a sí mismo')
ok(await patch(AD, 'users/' + a.localId, { name: str('Christoffer') }), 200, 'admin cambia su nombre')
ok(await patch(AD, 'users/' + l.localId, { language: str('es') }), 200, 'admin cambia idioma de un cliente')
ok(await patch(AD, 'users/' + l.localId, { role: str('superadmin') }), 403, 'admin pone un rol que no existe')
ok(await runQuery(AD, { from: [{ collectionId: 'users' }] }), 200, 'admin lista usuarios')

// clients
ok(await req(J, 'clients/jansen'), 200, 'cliente lee su ficha')
ok(await req(J, 'clients/lindqvist'), 403, 'cliente lee ficha de otra familia')
ok(await req(L, 'clients/lindqvist'), 200, 'Lindqvist lee su ficha')
ok(await req(L, 'clients/jansen'), 403, 'Lindqvist lee la ficha de Jansen')
ok(await runQuery(J, { from: [{ collectionId: 'clients' }] }), 403, 'cliente lista fichas')
ok(await patch(J, 'clients/jansen', { agentPhone: str('1') }), 403, 'cliente modifica su ficha')
ok(await patch(J, 'clients/jansen', { 'contacts': { mapValue: { fields: { lawyer: str('gestoria-vega') } } } }), 403, 'cliente se asigna colaboradores')
ok(await req(AD, 'clients/lindqvist'), 200, 'admin lee fichas')

// partners
ok(await req(J, 'partners/lawyer-ruiz'), 200, 'Jansen lee su abogado')
ok(await req(J, 'partners/gestoria-vega'), 403, 'Jansen lee la gestoría de Lindqvist')
ok(await req(L, 'partners/gestoria-vega'), 200, 'Lindqvist lee su gestoría')
ok(await req(L, 'partners/pool-azul'), 403, 'Lindqvist lee la piscina de Jansen')
ok(await runQuery(J, { from: [{ collectionId: 'partners' }] }), 403, 'cliente lista colaboradores')
ok(await runQuery(J, { from: [{ collectionId: 'partners' }], where: { fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: str('lawyer') } } }), 403, 'cliente busca colaboradores por categoría')
ok(await patch(J, 'partners/lawyer-ruiz', { phone: str('1') }), 403, 'cliente modifica colaborador')
ok(await runQuery(AD, { from: [{ collectionId: 'partners' }] }), 200, 'admin lista colaboradores')

// partnerCategories: servicios de los colaboradores
const limpieza = { fields: { name_es: str('Limpieza'), name_en: str('Cleaning'), icon: str('default'), order: { integerValue: '8' }, active: { booleanValue: true } } }
ok(await req(J, 'partnerCategories/limpieza', 'PATCH', limpieza), 403, 'cliente crea un servicio')
ok(await req(X, 'partnerCategories/limpieza'), 403, 'no invitado lee un servicio')
ok(await req(AD, 'partnerCategories/limpieza', 'PATCH', limpieza), 200, 'admin crea un servicio')
ok(await req(J, 'partnerCategories/limpieza'), 200, 'cliente lee un servicio')
ok(await runQuery(J, { from: [{ collectionId: 'partnerCategories' }] }), 200, 'cliente lista servicios')
ok(await runQuery(X, { from: [{ collectionId: 'partnerCategories' }] }), 403, 'no invitado lista servicios')
ok(await patch(J, 'partnerCategories/limpieza', { name_es: str('Otro') }), 403, 'cliente modifica un servicio')
ok(await req(J, 'partnerCategories/limpieza', 'DELETE'), 403, 'cliente borra un servicio')
ok(await patch(AD, 'partnerCategories/limpieza', { name_es: str('Limpieza del hogar') }), 200, 'admin renombra un servicio')
ok(await req(AD, 'partnerCategories/limpieza', 'DELETE'), 200, 'admin borra un servicio')

// contenido común
for (const [col, id] of [['generalContacts', 'emergencias'], ['places', 'golf-pinar'], ['deals', 'deal-golf'], ['settings', 'tipOfTheWeek']]) {
  ok(await req(J, `${col}/${id}`), 200, `cliente lee ${col}`)
  ok(await runQuery(J, { from: [{ collectionId: col }] }), 200, `cliente lista ${col}`)
  ok(await patch(J, `${col}/${id}`, { x: str('1') }), 403, `cliente escribe en ${col}`)
  ok(await req(J, `${col}/${id}`, 'DELETE'), 403, `cliente borra en ${col}`)
  ok(await req(J, `${col}/nuevo`, 'PATCH', { fields: { x: str('1') } }), 403, `cliente crea en ${col}`)
  ok(await patch(AD, `${col}/${id}`, { x: str('1') }), 200, `admin escribe en ${col}`)
}

// dealUses
ok(await req(J, 'dealUses', 'POST', dealUse('lindqvist', 'deal-golf')), 403, 'cliente registra uso a nombre de otra familia')
ok(await req(J, 'dealUses', 'POST', dealUse('jansen', 'no-existe')), 403, 'cliente registra uso de descuento inexistente')
ok(await req(J, 'dealUses', 'POST', dealUse('jansen', 'deal-golf')), 403, 'cliente registra uso con fecha inventada')
ok(await req(J, 'dealUses', 'POST', { fields: { ...dealUse('jansen', 'deal-golf').fields, extra: str('x') } }), 403, 'cliente añade campos extra')
ok(await req(AD, 'dealUses', 'POST', dealUse('jansen', 'deal-golf')), 403, 'admin registra usos como si fuera cliente')
// creación válida con la hora del servidor (commit con transformación)
const commit = (t, cid) => fetch(`${F}:commit`, { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t }, body: JSON.stringify({ writes: [{ update: { name: `projects/cj-club/databases/(default)/documents/dealUses/u-${cid}-${Date.now()}`, fields: { clientId: str(cid), dealId: str('deal-golf') } }, updateTransforms: [{ fieldPath: 'date', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] }) }).then(r => r.status)
ok(await commit(J, 'jansen'), 200, 'cliente registra su uso con la hora del servidor')
ok(await commit(L, 'jansen'), 403, 'Lindqvist registra uso a nombre de Jansen')
ok(await runQuery(J, { from: [{ collectionId: 'dealUses' }] }), 403, 'cliente lee registros de uso')
ok(await runQuery(AD, { from: [{ collectionId: 'dealUses' }] }), 200, 'admin lee registros de uso')

// conversations y mensajes
// Escritura con la hora del servidor; mask = solo esos campos (como un update parcial)
const serverTime = (t, path, fields, timeFields, exists, mask) => fetch(`${F}:commit`, { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t }, body: JSON.stringify({ writes: [{ update: { name: `projects/cj-club/databases/(default)/documents/${path}`, fields }, ...(mask ? { updateMask: { fieldPaths: mask } } : {}), updateTransforms: timeFields.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' })), ...(exists === undefined ? {} : { currentDocument: { exists } }) }] }) }).then(r => r.status)
const msg = (sender, uid, text = 'Hola') => ({ text: str(text), sender: str(sender), authorUid: str(uid), authorName: str('X') })
ok(await serverTime(J, 'conversations/jansen/messages/t1', msg('client', j.localId), ['createdAt']), 200, 'cliente escribe en su conversación')
ok(await serverTime(J, 'conversations/lindqvist/messages/t2', msg('client', j.localId), ['createdAt']), 403, 'cliente escribe en la conversación de otra familia')
ok(await serverTime(J, 'conversations/jansen/messages/t3', msg('cj', j.localId), ['createdAt']), 403, 'cliente se hace pasar por CJ')
ok(await serverTime(J, 'conversations/jansen/messages/t4', msg('client', l.localId), ['createdAt']), 403, 'cliente firma como otra persona')
ok(await serverTime(J, 'conversations/jansen/messages/t5', msg('client', j.localId, ''), ['createdAt']), 403, 'mensaje vacío')
ok(await serverTime(J, 'conversations/jansen/messages/t6', msg('client', j.localId, 'x'.repeat(2001)), ['createdAt']), 403, 'mensaje demasiado largo')
ok(await req(J, 'conversations/jansen/messages/t7', 'PATCH', { fields: { ...msg('client', j.localId), createdAt: { timestampValue: new Date().toISOString() } } }), 403, 'mensaje con hora inventada')
ok(await patch(J, 'conversations/jansen/messages/t1', { text: str('editado') }), 403, 'cliente edita un mensaje')
ok(await req(J, 'conversations/jansen/messages/t1', 'DELETE'), 403, 'cliente borra un mensaje')
const conv = (fam, sender) => ({ clientId: str('jansen'), familyName: str(fam), lastMessageText: str('Hola'), lastSender: str(sender) })
const convMask = ['clientId', 'familyName', 'lastMessageText', 'lastSender']
ok(await serverTime(J, 'conversations/jansen', conv('Familia Jansen', 'client'), ['lastMessageAt', 'clientReadAt'], true, convMask), 200, 'cliente actualiza el resumen de su conversación')
ok(await serverTime(J, 'conversations/jansen', conv('Familia Jansen', 'client'), ['lastMessageAt']), 403, 'cliente borra la marca de leído de CJ al reescribir la conversación')
ok(await serverTime(J, 'conversations/jansen', conv('Familia Inventada', 'client'), ['lastMessageAt'], true, convMask), 403, 'cliente cambia el nombre de su familia en la conversación')
ok(await serverTime(J, 'conversations/jansen', conv('Familia Jansen', 'cj'), ['lastMessageAt'], true, convMask), 403, 'cliente marca el último mensaje como de CJ')
ok(await serverTime(J, 'conversations/jansen', { ...conv('Familia Jansen', 'client'), cjReadAt: { timestampValue: '2030-01-01T00:00:00Z' } }, ['lastMessageAt'], true, [...convMask, 'cjReadAt']), 403, 'cliente marca como leído por CJ')
ok(await serverTime(J, 'conversations/jansen', {}, ['clientReadAt'], true, []), 200, 'cliente marca su conversación como leída')
ok(await req(J, 'conversations/jansen'), 200, 'cliente lee su conversación')
ok(await req(J, 'conversations/jansen/messages/t1'), 200, 'cliente lee sus mensajes')
ok(await req(L, 'conversations/jansen'), 403, 'Lindqvist lee la conversación de Jansen')
ok(await req(L, 'conversations/jansen/messages/t1'), 403, 'Lindqvist lee mensajes de Jansen')
ok(await runQuery(J, { from: [{ collectionId: 'conversations' }] }), 403, 'cliente lista todas las conversaciones')
ok(await serverTime(AD, 'conversations/jansen/messages/t8', msg('cj', a.localId), ['createdAt']), 200, 'CJ responde')
ok(await serverTime(AD, 'conversations/jansen/messages/t9', msg('client', a.localId), ['createdAt']), 403, 'CJ se hace pasar por el cliente')
ok(await runQuery(AD, { from: [{ collectionId: 'conversations' }] }), 200, 'CJ lista conversaciones')

// requests
const rq = (cid, fam, extra = {}) => ({ clientId: str(cid), familyName: str(fam), type: str('repair'), description: str('Gotea un grifo'), status: str('new'), createdByUid: str(j.localId), ...extra })
ok(await serverTime(J, 'requests/q1', rq('jansen', 'Familia Jansen'), ['createdAt', 'updatedAt'], false), 200, 'cliente crea una petición')
ok(await serverTime(J, 'requests/q2', rq('lindqvist', 'Familia Lindqvist'), ['createdAt', 'updatedAt'], false), 403, 'cliente crea una petición a nombre de otra familia')
ok(await serverTime(J, 'requests/q3', rq('jansen', 'Familia Jansen', { status: str('done') }), ['createdAt', 'updatedAt'], false), 403, 'cliente crea una petición ya hecha')
ok(await serverTime(J, 'requests/q4', rq('jansen', 'Familia Jansen', { type: str('limusina') }), ['createdAt', 'updatedAt'], false), 403, 'tipo de petición no válido')
ok(await serverTime(J, 'requests/q5', rq('jansen', 'Familia Jansen', { cjNote: str('aprobado') }), ['createdAt', 'updatedAt'], false), 403, 'cliente escribe la nota de CJ')
ok(await req(J, 'requests/q1'), 200, 'cliente lee su petición')
ok(await req(L, 'requests/q1'), 403, 'Lindqvist lee la petición de Jansen')
ok(await runQuery(J, { from: [{ collectionId: 'requests' }], where: { fieldFilter: { field: { fieldPath: 'clientId' }, op: 'EQUAL', value: str('jansen') } } }), 200, 'cliente lista sus peticiones')
ok(await runQuery(J, { from: [{ collectionId: 'requests' }] }), 403, 'cliente lista todas las peticiones')
ok(await patch(J, 'requests/q1', { status: str('done') }), 403, 'cliente marca su petición como hecha')
ok(await serverTime(J, 'requests/q1', { status: str('cancelled') }, ['updatedAt'], true, ['status']), 200, 'cliente cancela su petición nueva')
ok(await serverTime(J, 'requests/q1', { status: str('new') }, ['updatedAt'], true, ['status']), 403, 'cliente reabre una petición cancelada')
ok(await patch(AD, 'requests/q1', { status: str('in_progress'), cjNote: str('Mañana') }), 200, 'CJ cambia estado y nota')

// reservas de restaurantes
await patch('owner', 'places/rest-la-terraza', { reservationChannel: str('link'), reservationTarget: str('https://example.com/reservar') })
const clickFields = (cid, uid, place, channel) => ({ placeId: str(place), clientId: str(cid), uid: str(uid), channel: str(channel) })
ok(await serverTime(J, 'reservationClicks/c1', clickFields('jansen', j.localId, 'rest-la-terraza', 'link'), ['createdAt'], false), 200, 'cliente registra un pinchazo en Reservar')
ok(await serverTime(J, 'reservationClicks/c2', clickFields('lindqvist', j.localId, 'rest-la-terraza', 'link'), ['createdAt'], false), 403, 'cliente registra pinchazo a nombre de otra familia')
ok(await serverTime(L, 'reservationClicks/c3', clickFields('jansen', l.localId, 'rest-la-terraza', 'link'), ['createdAt'], false), 403, 'Lindqvist registra pinchazo a nombre de Jansen')
ok(await serverTime(J, 'reservationClicks/c4', clickFields('jansen', l.localId, 'rest-la-terraza', 'link'), ['createdAt'], false), 403, 'cliente firma el pinchazo como otra persona')
ok(await serverTime(J, 'reservationClicks/c5', clickFields('jansen', j.localId, 'no-existe', 'link'), ['createdAt'], false), 403, 'pinchazo de restaurante inexistente')
ok(await serverTime(J, 'reservationClicks/c6', clickFields('jansen', j.localId, 'golf-pinar', 'link'), ['createdAt'], false), 403, 'pinchazo en un lugar que no es restaurante')
ok(await serverTime(J, 'reservationClicks/c7', clickFields('jansen', j.localId, 'rest-casa-olivo', 'whatsapp'), ['createdAt'], false), 403, 'pinchazo en un restaurante sin reserva configurada')
ok(await serverTime(J, 'reservationClicks/c8', clickFields('jansen', j.localId, 'rest-la-terraza', 'phone'), ['createdAt'], false), 403, 'el canal no coincide con el del restaurante')
ok(await req(J, 'reservationClicks/c9', 'PATCH', { fields: { ...clickFields('jansen', j.localId, 'rest-la-terraza', 'link'), createdAt: { timestampValue: new Date().toISOString() } } }), 403, 'pinchazo con hora inventada')
ok(await serverTime(J, 'reservationClicks/c10', { ...clickFields('jansen', j.localId, 'rest-la-terraza', 'link'), extra: str('x') }, ['createdAt'], false), 403, 'pinchazo con campos extra')
ok(await serverTime(AD, 'reservationClicks/c11', clickFields('jansen', a.localId, 'rest-la-terraza', 'link'), ['createdAt'], false), 403, 'admin registra pinchazos como si fuera cliente')
ok(await runQuery(J, { from: [{ collectionId: 'reservationClicks' }] }), 403, 'cliente lee pinchazos')
ok(await req(J, 'reservationClicks/c1'), 403, 'cliente lee un pinchazo')
ok(await patch(J, 'reservationClicks/c1', { channel: str('phone') }), 403, 'cliente cambia un pinchazo')
ok(await req(J, 'reservationClicks/c1', 'DELETE'), 403, 'cliente borra un pinchazo')
ok(await req(AD, 'reservationClicks/c1', 'DELETE'), 403, 'admin no borra pinchazos desde la app')
ok(await runQuery(AD, { from: [{ collectionId: 'reservationClicks' }] }), 200, 'admin lee pinchazos')

const confirmFields = (cid, uid, place) => ({ placeId: str(place), clientId: str(cid), uid: str(uid) })
ok(await serverTime(J, 'reservationConfirms/f1', confirmFields('jansen', j.localId, 'rest-la-terraza'), ['createdAt'], false), 200, 'cliente confirma que reservó')
ok(await serverTime(J, 'reservationConfirms/f2', confirmFields('lindqvist', j.localId, 'rest-la-terraza'), ['createdAt'], false), 403, 'cliente confirma a nombre de otra familia')
ok(await serverTime(J, 'reservationConfirms/f3', confirmFields('jansen', j.localId, 'golf-pinar'), ['createdAt'], false), 403, 'cliente confirma una reserva en un lugar que no es restaurante')
ok(await runQuery(J, { from: [{ collectionId: 'reservationConfirms' }] }), 403, 'cliente lee confirmaciones')
ok(await runQuery(AD, { from: [{ collectionId: 'reservationConfirms' }] }), 200, 'admin lee confirmaciones')
ok(await req(AD, 'reservationConfirms/f1', 'DELETE'), 403, 'admin no borra confirmaciones desde la app')

const reportFields = (place, month, count) => ({ placeId: str(place), month: str(month), count: { integerValue: String(count) } })
ok(await req(J, 'reservationReports/rest-la-terraza_2026-10'), 403, 'cliente lee el número anotado')
ok(await serverTime(J, 'reservationReports/rest-la-terraza_2026-10', reportFields('rest-la-terraza', '2026-10', 3), ['updatedAt'], false), 403, 'cliente anota reservas')
ok(await serverTime(AD, 'reservationReports/rest-la-terraza_2026-10', reportFields('rest-la-terraza', '2026-10', 4), ['updatedAt'], false), 200, 'admin anota las reservas del mes')
ok(await serverTime(AD, 'reservationReports/rest-la-terraza_2026-10', reportFields('rest-la-terraza', '2026-10', 5), ['updatedAt'], true, ['placeId', 'month', 'count']), 200, 'admin corrige el número')
ok(await serverTime(AD, 'reservationReports/otro_2026-10', reportFields('rest-la-terraza', '2026-10', 4), ['updatedAt'], false), 403, 'el id del informe no coincide con el restaurante y el mes')
ok(await serverTime(AD, 'reservationReports/rest-la-terraza_2026-13', reportFields('rest-la-terraza', '2026-13', 4), ['updatedAt'], false), 403, 'mes no válido')
ok(await serverTime(AD, 'reservationReports/rest-la-terraza_2026-11', reportFields('rest-la-terraza', '2026-11', -1), ['updatedAt'], false), 403, 'número negativo')
ok(await serverTime(AD, 'reservationReports/golf-pinar_2026-10', reportFields('golf-pinar', '2026-10', 1), ['updatedAt'], false), 403, 'informe de un lugar que no es restaurante')
ok(await req(AD, 'reservationReports/rest-la-terraza_2026-10', 'DELETE'), 403, 'admin no borra el informe desde la app')
ok(await req(AD, 'reservationReports/rest-la-terraza_2026-10'), 200, 'admin lee el informe')
ok(await runQuery(J, { from: [{ collectionId: 'reservationReports' }] }), 403, 'cliente lista informes')

// negocios: solo sus descuentos y su ficha; nunca datos de clientes ni de otros negocios
ok(await req(B, 'users/' + b.localId), 200, 'negocio lee su ficha')
ok(await req(B, 'users/' + j.localId), 403, 'negocio lee la ficha de un cliente')
ok(await runQuery(B, { from: [{ collectionId: 'users' }] }), 403, 'negocio lista usuarios')
ok(await patch(B, 'users/' + b.localId, { language: str('en') }), 200, 'negocio cambia idioma')
ok(await patch(B, 'users/' + b.localId, { language: str('xx') }), 403, 'negocio pone un idioma no válido')
ok(await patch(B, 'users/' + b.localId, { role: str('admin') }), 403, 'negocio se hace admin')
ok(await patch(B, 'users/' + b.localId, { placeId: str('golf-pinar') }), 403, 'negocio cambia de lugar')
ok(await patch(B, 'users/' + b.localId, { name: str('Otro') }), 403, 'negocio cambia su nombre')
ok(await patch(B, 'users/' + b.localId, { favorites: { arrayValue: { values: [str('x')] } } }), 403, 'negocio cambia favoritos')
ok(await patch(AD, 'users/' + l.localId, { role: str('business') }), 403, 'admin convierte un cliente en negocio sin lugar')
ok(await req(AD, 'users/negocio-nuevo', 'PATCH', { fields: { role: str('business'), name: str('Ana'), email: str('ana@negocio.test'), language: str('es'), placeId: str('rest-la-terraza') } }), 200, 'admin crea ficha de negocio')
ok(await req(AD, 'users/negocio-malo', 'PATCH', { fields: { role: str('business'), name: str('Ana'), email: str('ana@negocio.test'), language: str('es') } }), 403, 'admin crea negocio sin lugar')
ok(await req(AD, 'users/negocio-falso', 'PATCH', { fields: { role: str('business'), name: str('Ana'), email: str('ana@negocio.test'), language: str('es'), placeId: str('no-existe') } }), 403, 'admin vincula un negocio a un lugar que no existe')
ok(await patch(AD, 'users/' + b.localId, { placeId: str('no-existe') }), 403, 'admin cambia el negocio a un lugar que no existe')
ok(await req(B, 'clients/jansen'), 403, 'negocio lee fichas de clientes')
ok(await req(B, 'conversations/jansen'), 403, 'negocio lee conversaciones')
ok(await req(B, 'requests/q1'), 403, 'negocio lee peticiones')
ok(await runQuery(B, { from: [{ collectionId: 'dealUses' }] }), 403, 'negocio lee usos de descuentos')
ok(await req(B, 'reservationClicks/c1'), 403, 'negocio lee pinchazos de clientes')
ok(await runQuery(B, { from: [{ collectionId: 'reservationClicks' }], where: { fieldFilter: { field: { fieldPath: 'placeId' }, op: 'EQUAL', value: str('rest-la-terraza') } } }), 403, 'negocio lista los pinchazos de su restaurante')
ok(await runQuery(B, { from: [{ collectionId: 'reservationConfirms' }] }), 403, 'negocio lee confirmaciones de reserva')
ok(await req(B, 'reservationReports/rest-la-terraza_2026-10'), 403, 'negocio lee el número anotado por CJ')
ok(await req(B, 'partners/lawyer-ruiz'), 403, 'negocio lee colaboradores')
ok(await req(B, 'partnerCategories/lawyer'), 403, 'negocio lee servicios de colaboradores')
ok(await runQuery(B, { from: [{ collectionId: 'partnerCategories' }] }), 403, 'negocio lista servicios de colaboradores')
ok(await req(B, 'partnerCategories/limpieza', 'PATCH', { fields: { name_es: str('X') } }), 403, 'negocio crea un servicio')
ok(await req(B, 'generalContacts/emergencias'), 403, 'negocio lee contactos generales')
ok(await req(B, 'settings/tipOfTheWeek'), 403, 'negocio lee ajustes')
ok(await req(B, 'places/rest-la-terraza'), 200, 'negocio lee su lugar')
ok(await req(B, 'places/golf-pinar'), 403, 'negocio lee otro lugar')
ok(await runQuery(B, { from: [{ collectionId: 'places' }] }), 403, 'negocio lista lugares')
ok(await patch(B, 'places/rest-la-terraza', { name: str('Otro') }), 403, 'negocio modifica su lugar')

const wipe = (path) => fetch(`${F}/${path}`, { method: 'DELETE', headers: { ...H, authorization: 'Bearer owner' } })
const dealFields = (over = {}) => ({
  title: str('10% entre semana'),
  conditions_es: str('De lunes a jueves'),
  conditions_en: str('Monday to Thursday'),
  discountLabel: str('10%'),
  code: str('CJ10'),
  active: bool(true),
  order: num(1),
  placeId: str('rest-la-terraza'),
  businessName: str('La Terraza del Puerto'),
  description_es: str('En la cuenta'),
  description_en: str('On the bill'),
  validFrom: str(''),
  validUntil: str(''),
  source: str('business'),
  createdByUid: str(b.localId),
  hiddenByAdmin: bool(false),
  ...over,
})
await wipe('deals/oferta-terraza')
await wipe('deals/oferta-golf')
await wipe('deals/oferta-borrar')
await wipe('deals/oferta-admin')
ok(await req(B, 'deals/oferta-terraza', 'PATCH', { fields: dealFields() }), 200, 'negocio crea su descuento')
ok(await req(B, 'deals/oferta-ajena', 'PATCH', { fields: dealFields({ placeId: str('golf-pinar'), businessName: str('Club de Golf El Pinar') }) }), 403, 'negocio crea un descuento de otro lugar')
ok(await req(B, 'deals/nombre-falso', 'PATCH', { fields: dealFields({ businessName: str('Otro nombre') }) }), 403, 'negocio firma el descuento con otro nombre')
ok(await req(B, 'deals/extra', 'PATCH', { fields: { ...dealFields(), note: str('x') } }), 403, 'negocio añade campos de más')
ok(await req(B, 'deals/como-cj', 'PATCH', { fields: dealFields({ source: str('cj') }) }), 403, 'negocio crea un descuento como si fuera de CJ')
ok(await req(B, 'deals/ya-oculto', 'PATCH', { fields: dealFields({ hiddenByAdmin: bool(true) }) }), 403, 'negocio crea un descuento ya oculto')
ok(await req(B, 'deals/firma', 'PATCH', { fields: dealFields({ createdByUid: str(a.localId) }) }), 403, 'negocio firma el descuento como otra persona')
ok(await req(B, 'deals/vacio', 'PATCH', { fields: dealFields({ title: str('') }) }), 403, 'descuento sin título')
ok(await req(B, 'deals/fecha-mala', 'PATCH', { fields: dealFields({ validFrom: str('mañana') }) }), 403, 'fecha de descuento no válida')
ok(await req(B, 'deals/fecha-orden', 'PATCH', { fields: dealFields({ validFrom: str('2026-12-01'), validUntil: str('2026-11-01') }) }), 403, 'la fecha de fin es anterior')
ok(await req(AD, 'deals/creado-por-cj', 'PATCH', { fields: { title: str('X'), active: bool(true) } }), 403, 'admin crea un descuento')
ok(await req(B, 'deals/oferta-terraza'), 200, 'negocio lee su descuento')
ok(await req(B, 'deals/deal-golf'), 403, 'negocio lee un descuento antiguo de CJ')
ok(await req(J, 'deals/oferta-terraza'), 200, 'cliente lee el descuento del negocio')
ok(await runQuery(B, { from: [{ collectionId: 'deals' }], where: { fieldFilter: { field: { fieldPath: 'placeId' }, op: 'EQUAL', value: str('rest-la-terraza') } } }), 200, 'negocio lista sus descuentos')
ok(await runQuery(B, { from: [{ collectionId: 'deals' }] }), 403, 'negocio lista todos los descuentos')
ok(await runQuery(B, { from: [{ collectionId: 'deals' }], where: { fieldFilter: { field: { fieldPath: 'active' }, op: 'EQUAL', value: bool(true) } } }), 403, 'negocio busca descuentos por activo')
ok(await patch(B, 'deals/oferta-terraza', { title: str('20% entre semana') }), 200, 'negocio edita su descuento')
ok(await patch(B, 'deals/oferta-terraza', { validFrom: str('2026-11-01'), validUntil: str('2026-12-01') }), 200, 'negocio pone la vigencia')
ok(await patch(B, 'deals/oferta-terraza', { placeId: str('golf-pinar') }), 403, 'negocio mueve el descuento a otro lugar')
ok(await patch(B, 'deals/oferta-terraza', { source: str('cj') }), 403, 'negocio cambia el origen')
ok(await patch(B, 'deals/oferta-terraza', { createdByUid: str(a.localId) }), 403, 'negocio cambia el autor')
ok(await patch(B, 'deals/oferta-terraza', { hiddenByAdmin: bool(true) }), 403, 'negocio oculta su descuento como si fuera CJ')
ok(await patch(AD, 'deals/oferta-terraza', { title: str('Otro') }), 403, 'admin reescribe un descuento del negocio')
ok(await patch(AD, 'deals/oferta-terraza', { active: bool(false) }), 403, 'admin pausa un descuento del negocio')
ok(await patch(AD, 'deals/oferta-terraza', { hiddenByAdmin: bool(true) }), 200, 'admin oculta un descuento del negocio')
ok(await patch(B, 'deals/oferta-terraza', { hiddenByAdmin: bool(false) }), 403, 'negocio vuelve a mostrar un descuento oculto por CJ')
ok(await patch(B, 'deals/oferta-terraza', { active: bool(false) }), 200, 'negocio pausa su descuento')
await wipe('deals/oferta-golf')
ok(await req(G, 'deals/oferta-golf', 'PATCH', { fields: dealFields({ placeId: str('golf-pinar'), businessName: str('Club de Golf El Pinar'), createdByUid: str(g.localId), title: str('Green fee') }) }), 200, 'el golf crea su descuento')
ok(await req(B, 'deals/oferta-golf'), 403, 'un negocio lee el descuento de otro')
ok(await req(G, 'deals/oferta-terraza'), 403, 'el golf lee el descuento de la terraza')
ok(await runQuery(B, { from: [{ collectionId: 'deals' }], where: { fieldFilter: { field: { fieldPath: 'placeId' }, op: 'EQUAL', value: str('golf-pinar') } } }), 403, 'negocio lista descuentos de otro')
await wipe('deals/oferta-borrar')
ok(await req(B, 'deals/oferta-borrar', 'PATCH', { fields: dealFields() }), 200, 'negocio crea otro descuento')
ok(await req(G, 'deals/oferta-borrar', 'DELETE'), 403, 'otro negocio borra el descuento')
ok(await req(J, 'deals/oferta-borrar', 'DELETE'), 403, 'cliente borra un descuento del negocio')
ok(await req(B, 'deals/deal-golf', 'DELETE'), 403, 'negocio borra un descuento de CJ')
ok(await req(B, 'deals/oferta-borrar', 'DELETE'), 200, 'negocio retira su descuento')
await wipe('deals/oferta-admin')
ok(await req(B, 'deals/oferta-admin', 'PATCH', { fields: dealFields() }), 200, 'negocio crea un descuento que CJ retirará')
ok(await req(AD, 'deals/oferta-admin', 'DELETE'), 200, 'admin retira un descuento del negocio')
// contactos propios y notas de la casa (privados; CJ solo ve la copia compartida)
const contact = (extra = {}) => ({
  name: str('Juan el jardinero'),
  service: str('garden'),
  serviceOther: str(''),
  phone: str('+34 600 111 222'),
  email: str('juan@jardin.test'),
  notes: str('Viene los martes'),
  shareWithCj: bool(false),
  ...extra,
})
const contactMask = ['name', 'service', 'serviceOther', 'phone', 'email', 'notes', 'shareWithCj']
ok(await serverTime(J, 'clients/jansen/ownContacts/c1', contact(), ['createdAt', 'updatedAt'], false), 200, 'cliente crea un contacto privado')
ok(await serverTime(J, 'clients/lindqvist/ownContacts/c2', contact(), ['createdAt', 'updatedAt'], false), 403, 'cliente crea un contacto en otra familia')
ok(await serverTime(J, 'clients/jansen/ownContacts/c3', contact({ name: str('') }), ['createdAt', 'updatedAt'], false), 403, 'contacto sin nombre')
ok(await serverTime(J, 'clients/jansen/ownContacts/c4', contact({ service: str('limusina') }), ['createdAt', 'updatedAt'], false), 403, 'servicio de contacto no válido')
const placas = { fields: { name_es: str('Placas solares'), name_en: str('Solar panels'), icon: str('sun'), order: num(9), active: bool(true) } }
ok(await req(AD, 'partnerCategories/placas-solares', 'PATCH', placas), 200, 'CJ crea el servicio Placas solares')
ok(await serverTime(J, 'clients/jansen/ownContacts/c12', contact({ service: str('placas-solares') }), ['createdAt', 'updatedAt'], false), 200, 'contacto con un servicio creado por CJ')
ok(await serverTime(J, 'clients/jansen/ownContacts/c13', contact({ service: str('placas-solares'), serviceOther: str('extra') }), ['createdAt', 'updatedAt'], false), 403, 'un servicio de la lista no lleva texto libre')
ok(await patch(AD, 'partnerCategories/placas-solares', { active: bool(false) }), 200, 'CJ oculta el servicio')
ok(await serverTime(J, 'clients/jansen/ownContacts/c15', contact({ service: str('placas-solares') }), ['createdAt', 'updatedAt'], false), 200, 'un servicio oculto sigue valiendo mientras exista')
await wipe('partnerCategories/placas-solares')
ok(await serverTime(J, 'clients/jansen/ownContacts/c12', { phone: str('+34 611 000 000') }, ['updatedAt'], true, ['phone']), 200, 'se puede corregir el contacto aunque CJ haya quitado ese servicio')
ok(await serverTime(J, 'clients/jansen/ownContacts/c14', contact({ service: str('placas-solares') }), ['createdAt', 'updatedAt'], false), 403, 'un servicio que ya no existe no vale para un contacto nuevo')
ok(await serverTime(J, 'clients/jansen/ownContacts/c5', contact({ service: str('other'), serviceOther: str('') }), ['createdAt', 'updatedAt'], false), 403, 'Otro sin texto libre')
ok(await serverTime(J, 'clients/jansen/ownContacts/c6', contact({ service: str('other'), serviceOther: str('Placas solares') }), ['createdAt', 'updatedAt'], false), 200, 'contacto Otro con texto libre')
ok(await serverTime(J, 'clients/jansen/ownContacts/c7', contact({ email: str('no-es-correo') }), ['createdAt', 'updatedAt'], false), 403, 'correo de contacto no válido')
ok(await serverTime(J, 'clients/jansen/ownContacts/c8', contact({ shareWithCj: bool(true) }), ['createdAt', 'updatedAt'], false), 403, 'un contacto privado no puede nacer ya compartido')
ok(await serverTime(J, 'clients/jansen/ownContacts/c9', { ...contact(), extra: str('x') }, ['createdAt', 'updatedAt'], false), 403, 'contacto con campos de más')
ok(await serverTime(AD, 'clients/jansen/ownContacts/c10', contact(), ['createdAt', 'updatedAt'], false), 403, 'CJ no crea contactos del cliente')
ok(await serverTime(B, 'clients/jansen/ownContacts/c11', contact(), ['createdAt', 'updatedAt'], false), 403, 'un negocio no crea contactos del cliente')
ok(await req(J, 'clients/jansen/ownContacts/c1'), 200, 'cliente lee su contacto')
ok(await req(P, 'clients/jansen/ownContacts/c1'), 200, 'otra persona de la misma cuenta lee el contacto')
ok(await req(L, 'clients/jansen/ownContacts/c1'), 403, 'otra familia lee el contacto')
ok(await req(AD, 'clients/jansen/ownContacts/c1'), 403, 'CJ no lee un contacto privado')
ok(await req(B, 'clients/jansen/ownContacts/c1'), 403, 'un negocio no lee un contacto privado')
ok(await req(X, 'clients/jansen/ownContacts/c1'), 403, 'una cuenta sin invitación no lee contactos')
ok(await req(null, 'clients/jansen/ownContacts/c1'), 403, 'anónimo no lee contactos')
ok(await runQueryAt(J, 'clients/jansen', { from: [{ collectionId: 'ownContacts' }] }), 200, 'cliente lista sus contactos privados')
ok(await runQueryAt(AD, 'clients/jansen', { from: [{ collectionId: 'ownContacts' }] }), 403, 'CJ no lista contactos privados')
ok(await runQueryAt(B, 'clients/jansen', { from: [{ collectionId: 'ownContacts' }] }), 403, 'un negocio no lista contactos privados')
ok(await runQuery(J, { from: [{ collectionId: 'ownContacts', allDescendants: true }] }), 403, 'cliente no lista contactos privados de todas las familias')
ok(await runQuery(AD, { from: [{ collectionId: 'ownContacts', allDescendants: true }] }), 403, 'CJ no lista contactos privados de todas las familias')
ok(await serverTime(J, 'clients/jansen/ownContacts/c1', { phone: str('+34 600 000 000') }, ['updatedAt'], true, ['phone']), 200, 'cliente edita su contacto')
ok(await serverTime(J, 'clients/jansen/ownContacts/c1', { shareWithCj: bool(true) }, ['updatedAt'], true, ['shareWithCj']), 403, 'no se comparte sin moverlo a la colección compartida')
ok(await serverTime(J, 'clients/jansen/ownContacts/c1', { createdAt: { timestampValue: '2020-01-01T00:00:00Z' } }, ['updatedAt'], true, ['createdAt']), 403, 'cliente cambia la fecha de alta del contacto')
ok(await serverTime(L, 'clients/jansen/ownContacts/c1', { phone: str('1') }, ['updatedAt'], true, ['phone']), 403, 'otra familia edita el contacto')
ok(await serverTime(AD, 'clients/jansen/ownContacts/c1', { phone: str('1') }, ['updatedAt'], true, ['phone']), 403, 'CJ edita un contacto privado')
ok(await req(AD, 'clients/jansen/ownContacts/c1', 'DELETE'), 403, 'CJ borra un contacto privado')
ok(await req(L, 'clients/jansen/ownContacts/c1', 'DELETE'), 403, 'otra familia borra el contacto')
// Aunque alguien escribiera shareWithCj dentro de la colección privada, CJ sigue sin poder leerla
await ownerPatch('clients/jansen/ownContacts/plantado', { ...contact(), shareWithCj: bool(true), createdAt: { timestampValue: new Date().toISOString() }, updatedAt: { timestampValue: new Date().toISOString() } })
ok(await req(AD, 'clients/jansen/ownContacts/plantado'), 403, 'CJ no lee un contacto privado aunque lleve la marca de compartido')

ok(await serverTime(J, 'clients/jansen/sharedContacts/s1', contact({ shareWithCj: bool(true) }), ['createdAt', 'updatedAt'], false), 200, 'cliente comparte un contacto con CJ')
ok(await serverTime(J, 'clients/jansen/sharedContacts/s2', contact(), ['createdAt', 'updatedAt'], false), 403, 'la colección compartida no admite un contacto privado')
ok(await req(AD, 'clients/jansen/sharedContacts/s1'), 200, 'CJ lee el contacto compartido')
ok(await req(P, 'clients/jansen/sharedContacts/s1'), 200, 'la misma cuenta lee el contacto compartido')
ok(await req(L, 'clients/jansen/sharedContacts/s1'), 403, 'otra familia lee el contacto compartido')
ok(await req(B, 'clients/jansen/sharedContacts/s1'), 403, 'un negocio no lee el contacto compartido')
ok(await runQueryAt(AD, 'clients/jansen', { from: [{ collectionId: 'sharedContacts' }] }), 200, 'CJ lista los contactos compartidos')
ok(await runQueryAt(J, 'clients/jansen', { from: [{ collectionId: 'sharedContacts' }] }), 200, 'cliente lista sus contactos compartidos')
ok(await runQueryAt(B, 'clients/jansen', { from: [{ collectionId: 'sharedContacts' }] }), 403, 'un negocio no lista contactos compartidos')
ok(await runQuery(L, { from: [{ collectionId: 'sharedContacts', allDescendants: true }] }), 403, 'otra familia no lista todos los contactos compartidos')
ok(await runQuery(AD, { from: [{ collectionId: 'sharedContacts', allDescendants: true }] }), 403, 'CJ no lista de una vez los contactos compartidos de todas las familias')
ok(await serverTime(AD, 'clients/jansen/sharedContacts/s1', { phone: str('1') }, ['updatedAt'], true, ['phone']), 403, 'CJ no edita un contacto compartido')
ok(await req(AD, 'clients/jansen/sharedContacts/s1', 'DELETE'), 403, 'CJ no borra un contacto compartido desde la app')
ok(await serverTime(J, 'clients/jansen/sharedContacts/s1', contact({ name: str('Juan actualizado'), shareWithCj: bool(true) }), ['updatedAt'], true, contactMask), 200, 'cliente edita el contacto compartido')
ok(await req(J, 'clients/jansen/ownContacts/c1', 'DELETE'), 200, 'cliente borra su contacto privado')
ok(await req(P, 'clients/jansen/sharedContacts/s1', 'DELETE'), 200, 'la misma cuenta borra el contacto compartido')
ok(await req(B, 'clients/jansen/ownContacts/c6', 'DELETE'), 403, 'un negocio no borra contactos')

const note = (extra = {}) => ({
  section: str('wifi'),
  title: str('Wifi de casa'),
  body: str('Red: CasaJansen'),
  secret: str('clave-secreta'),
  shareWithCj: bool(false),
  ...extra,
})
const noteMask = ['section', 'title', 'body', 'secret', 'shareWithCj']
ok(await serverTime(J, 'clients/jansen/houseNotes/n1', note(), ['createdAt', 'updatedAt'], false), 200, 'cliente crea una nota privada de la casa')
ok(await serverTime(J, 'clients/lindqvist/houseNotes/n2', note(), ['createdAt', 'updatedAt'], false), 403, 'cliente crea una nota en otra familia')
ok(await serverTime(J, 'clients/jansen/houseNotes/n3', note({ title: str('') }), ['createdAt', 'updatedAt'], false), 403, 'nota sin título')
ok(await serverTime(J, 'clients/jansen/houseNotes/n4', note({ section: str('piscina') }), ['createdAt', 'updatedAt'], false), 403, 'apartado de nota no válido')
ok(await serverTime(J, 'clients/jansen/houseNotes/n5', note({ body: str(''), secret: str('') }), ['createdAt', 'updatedAt'], false), 403, 'nota vacía')
ok(await serverTime(J, 'clients/jansen/houseNotes/n6', note({ body: str(''), secret: str('solo-clave') }), ['createdAt', 'updatedAt'], false), 200, 'nota que solo guarda una contraseña')
ok(await serverTime(J, 'clients/jansen/houseNotes/n7', note({ shareWithCj: bool(true) }), ['createdAt', 'updatedAt'], false), 403, 'una nota privada no puede nacer ya compartida')
ok(await serverTime(B, 'clients/jansen/houseNotes/n8', note(), ['createdAt', 'updatedAt'], false), 403, 'un negocio no crea notas de la casa')
ok(await req(J, 'clients/jansen/houseNotes/n1'), 200, 'cliente lee su nota')
ok(await req(P, 'clients/jansen/houseNotes/n1'), 200, 'la misma cuenta lee la nota')
ok(await req(L, 'clients/jansen/houseNotes/n1'), 403, 'otra familia lee la nota')
ok(await req(AD, 'clients/jansen/houseNotes/n1'), 403, 'CJ no lee una nota privada')
ok(await req(B, 'clients/jansen/houseNotes/n1'), 403, 'un negocio no lee una nota privada')
ok(await req(X, 'clients/jansen/houseNotes/n1'), 403, 'una cuenta sin invitación no lee notas')
ok(await runQueryAt(J, 'clients/jansen', { from: [{ collectionId: 'houseNotes' }] }), 200, 'cliente lista sus notas privadas')
ok(await runQueryAt(AD, 'clients/jansen', { from: [{ collectionId: 'houseNotes' }] }), 403, 'CJ no lista notas privadas')
ok(await runQueryAt(B, 'clients/jansen', { from: [{ collectionId: 'houseNotes' }] }), 403, 'un negocio no lista notas privadas')
ok(await runQuery(AD, { from: [{ collectionId: 'houseNotes', allDescendants: true }] }), 403, 'CJ no lista notas privadas de todas las familias')
ok(await runQuery(J, { from: [{ collectionId: 'houseNotes', allDescendants: true }] }), 403, 'cliente no lista notas privadas de todas las familias')
ok(await serverTime(J, 'clients/jansen/houseNotes/n1', { secret: str('clave-nueva') }, ['updatedAt'], true, ['secret']), 200, 'cliente cambia la contraseña de la nota')
ok(await serverTime(AD, 'clients/jansen/houseNotes/n1', { secret: str('robada') }, ['updatedAt'], true, ['secret']), 403, 'CJ no cambia una nota privada')
ok(await req(AD, 'clients/jansen/houseNotes/n1', 'DELETE'), 403, 'CJ no borra una nota privada')
await ownerPatch('clients/jansen/houseNotes/plantada', { ...note(), shareWithCj: bool(true), createdAt: { timestampValue: new Date().toISOString() }, updatedAt: { timestampValue: new Date().toISOString() } })
ok(await req(AD, 'clients/jansen/houseNotes/plantada'), 403, 'CJ no lee una nota privada aunque lleve la marca de compartido')

ok(await serverTime(J, 'clients/jansen/sharedHouseNotes/h1', note({ shareWithCj: bool(true), section: str('alarm'), title: str('Alarma') }), ['createdAt', 'updatedAt'], false), 200, 'cliente comparte una nota con CJ')
ok(await serverTime(J, 'clients/jansen/sharedHouseNotes/h2', note(), ['createdAt', 'updatedAt'], false), 403, 'la colección compartida no admite una nota privada')
ok(await req(AD, 'clients/jansen/sharedHouseNotes/h1'), 200, 'CJ lee la nota compartida')
ok(await req(B, 'clients/jansen/sharedHouseNotes/h1'), 403, 'un negocio no lee la nota compartida')
ok(await req(L, 'clients/jansen/sharedHouseNotes/h1'), 403, 'otra familia lee la nota compartida')
ok(await runQueryAt(AD, 'clients/jansen', { from: [{ collectionId: 'sharedHouseNotes' }] }), 200, 'CJ lista las notas compartidas')
ok(await runQueryAt(B, 'clients/jansen', { from: [{ collectionId: 'sharedHouseNotes' }] }), 403, 'un negocio no lista notas compartidas')
ok(await runQuery(L, { from: [{ collectionId: 'sharedHouseNotes', allDescendants: true }] }), 403, 'otra familia no lista todas las notas compartidas')
ok(await serverTime(AD, 'clients/jansen/sharedHouseNotes/h1', { secret: str('robada') }, ['updatedAt'], true, ['secret']), 403, 'CJ no edita una nota compartida')
ok(await req(AD, 'clients/jansen/sharedHouseNotes/h1', 'DELETE'), 403, 'CJ no borra una nota compartida desde la app')
ok(await serverTime(P, 'clients/jansen/sharedHouseNotes/h1', note({ shareWithCj: bool(true), section: str('alarm'), title: str('Alarma actualizada') }), ['updatedAt'], true, noteMask), 200, 'la misma cuenta edita la nota compartida')
ok(await req(J, 'clients/jansen/houseNotes/n1', 'DELETE'), 200, 'cliente borra su nota privada')
ok(await req(J, 'clients/jansen/sharedHouseNotes/h1', 'DELETE'), 200, 'cliente borra la nota compartida')
ok(await req(B, 'clients/jansen/houseNotes/n6', 'DELETE'), 403, 'un negocio no borra notas')
for (const path of [
  'clients/jansen/ownContacts/c6',
  'clients/jansen/ownContacts/c12',
  'clients/jansen/ownContacts/c15',
  'clients/jansen/ownContacts/plantado',
  'clients/jansen/houseNotes/n6',
  'clients/jansen/houseNotes/plantada',
  'partnerCategories/placas-solares',
]) await wipe(path)


// mailLog: registro de correos del servidor
ok(await runQuery(AD, { from: [{ collectionId: 'mailLog' }] }), 200, 'CJ lee el registro de correos')
ok(await runQuery(J, { from: [{ collectionId: 'mailLog' }] }), 403, 'cliente lee el registro de correos')
ok(await req(AD, 'mailLog/x', 'PATCH', { fields: { to: str('a@b.c') } }), 403, 'nadie escribe en el registro de correos desde la app')

// colecciones no previstas
ok(await req(B, 'secretos/x'), 403, 'negocio lee colección no prevista')
ok(await req(AD, 'secretos/x', 'PATCH', { fields: { a: str('1') } }), 403, 'admin escribe en colección no prevista')
ok(await req(J, 'secretos/x'), 403, 'cliente lee colección no prevista')

console.log(`Reglas de seguridad: ${pass} OK, ${fail} FAIL`)
if (fail) process.exit(1)
