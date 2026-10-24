/**
 * Pruebas de las reglas de seguridad de Firestore (firestore.rules) contra el Firebase de pruebas local.
 *
 * Uso:
 *   1. npm run emulators                       (en otra terminal)
 *   2. npm run seed:emulator -- --admin-email=admin@prueba.test --admin-password=Admin1234 \
 *        --client-email=jansen@prueba.test --client-password=Prueba1234
 *   3. npm run test:rules
 *
 * Personas: Jansen y Lindqvist (clientes), el admin y una cuenta no invitada.
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
const patch = (t, path, fields) => req(t, `${path}?${Object.keys(fields).map(k => 'updateMask.fieldPaths=' + k).join('&')}`, 'PATCH', { fields })
const runQuery = (t, structuredQuery) => fetch(`${F}:runQuery`, { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t }, body: JSON.stringify({ structuredQuery }) }).then(r => r.status)

// Cuenta no invitada (se registra sin ficha en users) y Lindqvist, segunda familia con acceso
await signUp('intruso@prueba.test', 'Intruso1234')
let l = await signUp('lindqvist@prueba.test', 'Prueba1234')
if (!l.localId) l = await signIn('lindqvist@prueba.test', 'Prueba1234')
await ownerPatch(`users/${l.localId}`, { role: str('client'), name: str('Familia Lindqvist'), email: str('lindqvist@prueba.test'), language: str('en'), clientId: str('lindqvist') })
const j = await signIn('jansen@prueba.test', 'Prueba1234'), a = await signIn('admin@prueba.test', 'Admin1234'), x = await signIn('intruso@prueba.test', 'Intruso1234')
const J = j.idToken, L = l.idToken, AD = a.idToken, X = x.idToken
const use = (cid, did) => ({ fields: { clientId: str(cid), dealId: str(did), date: { timestampValue: new Date().toISOString() } } })

// Sin sesión / sin invitación: nada
for (const p of ['users/' + j.localId, 'clients/jansen', 'partners/lawyer-ruiz', 'generalContacts/emergencias', 'places/golf-pinar', 'deals/deal-golf', 'settings/tipOfTheWeek', 'dealUses']) {
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
ok(await req(J, 'dealUses', 'POST', use('lindqvist', 'deal-golf')), 403, 'cliente registra uso a nombre de otra familia')
ok(await req(J, 'dealUses', 'POST', use('jansen', 'no-existe')), 403, 'cliente registra uso de descuento inexistente')
ok(await req(J, 'dealUses', 'POST', use('jansen', 'deal-golf')), 403, 'cliente registra uso con fecha inventada')
ok(await req(J, 'dealUses', 'POST', { fields: { ...use('jansen', 'deal-golf').fields, extra: str('x') } }), 403, 'cliente añade campos extra')
ok(await req(AD, 'dealUses', 'POST', use('jansen', 'deal-golf')), 403, 'admin registra usos como si fuera cliente')
// creación válida con la hora del servidor (commit con transformación)
const commit = (t, cid) => fetch(`${F}:commit`, { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t }, body: JSON.stringify({ writes: [{ update: { name: `projects/cj-club/databases/(default)/documents/dealUses/u-${cid}-${Date.now()}`, fields: { clientId: str(cid), dealId: str('deal-golf') } }, updateTransforms: [{ fieldPath: 'date', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] }) }).then(r => r.status)
ok(await commit(J, 'jansen'), 200, 'cliente registra su uso con la hora del servidor')
ok(await commit(L, 'jansen'), 403, 'Lindqvist registra uso a nombre de Jansen')
ok(await runQuery(J, { from: [{ collectionId: 'dealUses' }] }), 403, 'cliente lee registros de uso')
ok(await runQuery(AD, { from: [{ collectionId: 'dealUses' }] }), 200, 'admin lee registros de uso')

// colecciones no previstas
ok(await req(AD, 'secretos/x', 'PATCH', { fields: { a: str('1') } }), 403, 'admin escribe en colección no prevista')
ok(await req(J, 'secretos/x'), 403, 'cliente lee colección no prevista')

console.log(`Reglas de seguridad: ${pass} OK, ${fail} FAIL`)
if (fail) process.exit(1)
