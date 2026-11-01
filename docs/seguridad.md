# Seguridad de CJ Club

Revisión previa a publicar con datos reales. Resumen de lo configurado y lista de comprobación para un desarrollador.

## Lo que está configurado

### Reglas de Firestore (`firestore.rules`)
Todo está denegado salvo lo que se permite expresamente.

| Colección | Cliente (`client`) | Equipo CJ (`admin`) |
|---|---|---|
| `users/{uid}` | Lee solo su ficha. Solo puede cambiar `language`, `favorites` (lista, máx. 200) y `clientId`, este solo a una de sus casas (`clientIds`, que asigna CJ). Un constructor solo cambia `language`. | Lee y gestiona todas. No puede cambiarse su propio rol ni borrarse a sí mismo. Rol limitado a `admin` / `client` / `business` / `builder`. Un negocio tiene que quedar vinculado a un lugar que existe. |
| `clients/{id}` | Lee la casa que está viendo y las demás de sus casas (`clientIds`). No escribe. | Lee y escribe. |
| `partners/{id}` | Lee, de uno en uno, solo los asignados en su mapa `contacts`. No puede listar. | Lee, lista y escribe. |
| `generalContacts`, `settings` | Lee (con sesión e invitación). No escribe. | Lee y escribe. El negocio no los lee. |
| `places` | Lee. No escribe. El negocio solo lee el suyo, de uno en uno, y no lo modifica. | Lee y escribe. |
| `deals` | Lee. No escribe. La app solo muestra los activos, no ocultos y en fecha. | No crea ofertas. En las del negocio solo puede cambiar `hiddenByAdmin` o borrarlas. En las antiguas (sin `source: business`) puede seguir corrigiéndolas. |
| `dealUses/{id}` | Solo crea registros con su `clientId`, de un descuento existente y con la hora del servidor. No lee. | Lee y borra. |
| `reservationClicks/{id}` | Solo crea su pinchazo en Reservar (`clientId` y `uid` propios, canal igual al del restaurante, hora del servidor). No lee, no cambia y no borra. | Lee. No borra desde la app. |
| `reservationConfirms/{id}` | Solo crea su confirmación de «he reservado», de un restaurante con reserva configurada. No lee. | Lee. No borra desde la app. |
| `reservationReports/{id}` | No lee ni escribe. | Lee y anota el número del mes (`{restaurante}_{aaaa-mm}`). No borra desde la app. |
| `conversations/{clientId}` y `messages` | Lee y escribe solo en la suya, firmando como `client` con su uid y la hora del servidor; no puede editar ni borrar mensajes, ni cambiar el nombre de la familia ni la marca de leído de CJ. | Lee todas y responde como `cj`. Puede borrar. |
| `requests/{id}` | Crea peticiones a su nombre (estado `new`, tipo válido, hora del servidor) y lee las suyas. Solo puede cancelarlas mientras son nuevas. No escribe la nota de CJ. | Lee todas, cambia estado y nota, borra. |
| `clients/{id}/ownContacts` y `houseNotes` | La familia (cualquier acceso con ese `clientId`) crea, lee, edita y borra los suyos. Son privados. El servicio del contacto es uno de los seis de siempre, uno que exista en `partnerCategories`, o «Otro» con texto. Si CJ quita ese servicio después, el contacto se puede seguir corrigiendo. | No lee ni escribe. |
| `clients/{id}/sharedContacts` y `sharedHouseNotes` | La familia los crea al marcar «Compartir con CJ», y puede editarlos o borrarlos. | Solo lee. No edita ni borra desde la app. |
| `projects/{id}` (Mi reforma) | Ve las obras de la casa que está viendo. Escribe en la conversación, anota pagos y confirma o discute los de la otra parte, y es **el único que aprueba o rechaza extras**. No publica avances ni propone extras. El **constructor** asignado ve solo sus obras: escribe, publica avances, propone y retira sus extras, anota pagos y confirma o discute los del cliente; no edita la obra. Otro constructor no ve nada. | Crea y edita obras, escribe, publica avances, propone extras, anota y confirma pagos. No puede aprobar extras en nombre del cliente. Nada de lo escrito se edita después; solo CJ puede borrar. |
| Cualquier otra | Denegado. Un negocio colaborador no es ni cliente ni admin: no lee contactos ni notas. | Denegado. |

### Oficios (Mi reforma)
- Cada obra (`projects/{id}`) es un contrato con un profesional (`builderUid`) y su oficio (`trade`: constructor, electricista, fontanero, carpintero, pintor, cristalero u otro). Los contratos de la misma casa con el mismo título forman una reforma y el cliente los ve juntos.
- Cada profesional entra con el papel `builder` y solo ve los contratos donde es `builderUid`: el electricista no ve el contrato del constructor ni al revés. Solo CJ cambia el oficio de un contrato.

### Arquitectos y diseñadores (Mi reforma)
- Papel `designer` (arquitecto o diseñador), con alta por la función `createDesigner` (solo CJ; si el correo ya tiene cuenta, se le añade el acceso).
- `reforms/{id}`: la reforma (contratos de la misma casa con el mismo título), con sus profesionales (`builderUids`) y arquitectos o diseñadores (`designerUids`). Solo la escribe CJ; la leen CJ, el cliente de la casa y sus participantes.
- `reforms/{id}/plans`: planos, diseños y renders (PDF o imágenes). Los suben CJ y los arquitectos o diseñadores de esa reforma (también los archivos, por `uploadProjectFile`); los ven todos los de la reforma. No se editan; solo CJ los borra.
- En cada contrato, `designerUids` les da acceso a la conversación (escriben como «Arquitecto / diseñador») y a los avances. No ven ni tocan el dinero: presupuesto, firmas, plan de pagos, pagos, extras, elecciones ni repasos (`inDeal` en las reglas).

### Presupuesto por líneas y firmas (Mi reforma)
- `projects/{id}/budgetLines`: partidas (`kind: group`, p. ej. «Baño completo», con su precio cerrado sin IVA, que es el que cuenta) y lo que incluye cada una (`kind: item` con `parentId`: grifo, plato de ducha…, con precio de referencia y fotos; es orientativo y no se suma: si el cliente elige algo más caro, la diferencia va como extra). Solo las escriben el constructor de la obra y CJ, y solo mientras nadie haya firmado. El cliente las ve.
- `projects/{id}/signatures/{client|builder}`: cada parte firma solo como sí misma (el cliente de la casa y el constructor asignado; CJ no firma por nadie). La firma guarda el nombre, el dibujo de la firma (PNG), la aceptación, la fecha y hora del servidor, una copia de las líneas firmadas y su huella SHA-256 con el tipo de IVA. Una firma no se edita.
- Con una firma, las líneas quedan congeladas y el IVA de la obra no se puede cambiar. Quien firmó (o CJ) puede retirar su firma solo mientras falte la otra. Con las dos firmas, el presupuesto queda cerrado para siempre; los cambios se hacen como extras.
- `projects/{id}/selections`: elecciones de productos en tienda (producto, tienda, precio con IVA, referencia, fotos y a qué partida corresponde). Solo se anotan con el presupuesto firmado por los dos, y solo CJ o el constructor. El cliente y el constructor dejan constancia una vez de que están conformes (nadie puede hacerlo por otro). No se editan; solo CJ borra una anotada por error.
- Si lo elegido es más caro que la referencia, CJ o el constructor pueden proponer con un botón el extra por la diferencia (precio de tienda sin el IVA de la obra, menos la referencia). Ese extra apunta a la elección (`selectionId`, que debe existir) y el cliente lo aprueba o rechaza como cualquier extra.
- `projects/{id}/plan/main`: plan de pagos (hasta 8 pagos con porcentajes enteros que suman el 90 %; el 10 % final siempre queda retenido). Lo escriben el constructor o CJ mientras nadie haya firmado, y se firma junto con el presupuesto (va en la copia y la huella de la firma).
- `projects/{id}/plan/release`: solo el cliente, con el presupuesto firmado, da por buenos los repasos y libera el 10 % final; no se cambia (CJ solo puede borrarla). Un pago del 10 % final (`milestoneId: final`) solo se puede anotar después.
- `projects/{id}/snags`: lista de repasos. El cliente o CJ los apuntan (con fotos); solo el constructor los marca como arreglados (con fotos); solo el cliente o CJ los dan por buenos o los reabren. Nadie cambia lo apuntado; CJ puede borrar un repaso puesto por error.
- Es una firma electrónica simple: prueba de quién aceptó qué y cuándo, no una firma cualificada.

### Identificación al firmar (Mi reforma)

- Para firmar el presupuesto, el cliente y el profesional suben una foto de su pasaporte, o de su DNI o NIE por las dos caras.
- La sube solo la función `uploadIdentity`. Comprueba que la persona es el cliente o el profesional de ese contrato y que aún no ha firmado. Acepta una o dos fotos o PDF de hasta 10 MB y guarda el resultado en `projects/{id}/identities/{client|builder}`; nadie puede escribir ese documento desde la app. Si se sube un documento nuevo, se borran las fotos del anterior.
- Lo leen solo CJ y la propia persona. La otra parte ve únicamente «Identificado con pasaporte/DNI/NIE», el campo `idType` de la firma.
- La regla de la firma exige que exista el documento de identidad de esa persona (mismo `uid`) y que el tipo coincida.
- Son datos personales sensibles: se borran con el contrato al dar de baja al cliente. Conviene indicarlo en la política de privacidad.

### Varios accesos con un mismo correo
- Una persona puede tener varios accesos con el mismo correo (por ejemplo, cliente y negocio). En `users/{uid}`, `roles` guarda todos los que le ha dado CJ y `role` el que está usando ahora; las fichas antiguas sin `roles` tienen solo su `role`.
- Las reglas miran siempre el acceso que está usando: como cliente no gestiona su negocio, y como negocio no ve su casa.
- La persona solo puede cambiar `role` por otro de sus `roles`, sin tocar nada más. Nadie puede darse accesos a sí mismo; solo CJ los asigna (con las funciones de alta o desde el panel).
- `createClient`, `createBusiness` y `createBuilder`: si el correo ya tiene cuenta, le añaden el acceso (y la casa, el lugar o la empresa) sin crear otra cuenta ni cambiar el acceso que está usando. Un correo lleva como mucho un negocio.
- `deleteClient`: si la persona tiene otros accesos, se le quita solo el de cliente y conserva su cuenta.

### Negocio colaborador (`business`)
Cuenta invitada por CJ y vinculada a un lugar (`users.placeId`). No es un socio.

| Qué | Permiso |
|---|---|
| Sus descuentos (`deals` con su `placeId` y `source == business`) | Crear, leer, corregir, pausar y borrar. El nombre tiene que ser el del lugar. No puede quitar `hiddenByAdmin`, cambiar de lugar ni ver los de otros o los antiguos de CJ. |
| Su lugar | Solo leerlo. |
| Reservas | No lee pinchazos, confirmaciones ni el número que anota CJ (llevan datos de clientes). Una función de servidor le devuelve solo el recuento de pulsaciones de su lugar. |
| `users` | Lee la suya. Solo cambia `language`. |
| Clientes, colaboradores, conversaciones, peticiones, usos, contactos y ajustes | Nada. |

"Con sesión" significa además estar invitado: tener ficha en `users/`. Una cuenta creada por libre no lee nada.

Pruebas: `tests/firestore-rules.mjs` (406 comprobaciones; ver instrucciones en el archivo). Ejecutar antes de cada cambio de reglas.

### Archivos (Firebase Storage, `storage.rules`)
- Todo cerrado: nadie lee ni escribe el almacén directamente desde el navegador. Los archivos los sube la función `uploadProjectFile` y se ven con su enlace privado, que solo conocen quienes pueden leer esa obra en Firestore.
- Pruebas: `tests/storage-rules.mjs` (subidas permitidas y prohibidas, tamaño, tipo, reemplazo, enlaces inventados y acceso directo).

### Funciones de servidor (`functions/`)
- `createClient` (Madrid, `europe-southwest1`): comprueba que quien llama es `admin`, valida los datos, crea la cuenta con contraseña aleatoria, la ficha y el perfil; si algo falla, no deja cuentas sueltas. Límite de 5 instancias.
- `createBusiness`: igual, para el acceso de un negocio vinculado a un lugar que ya existe. Si falla al guardar la ficha, no deja la cuenta suelta.
- `businessReservationSummary`: solo el propio negocio. Cuenta las pulsaciones en Reservar de su lugar y devuelve el número, sin nombres de clientes.
- `deleteClient`: baja de un cliente (derecho de supresión). Solo `admin`; borra sus cuentas de acceso, perfiles, ficha, conversación con mensajes, peticiones, registros de uso, pinchazos y confirmaciones de reserva, contactos propios y notas de la casa (privados y compartidos). Se niega si hay una cuenta del equipo vinculada. No es una función nueva: es la misma baja de siempre.
- `uploadProjectFile`: sube las fotos y PDF de Mi reforma (hasta 6 por avance o pago, 10 MB cada uno, solo fotos y PDF). Comprueba con las mismas normas que `firestore.rules` quién es la persona en esa obra: los avances solo los ilustran el constructor asignado y CJ; los justificantes de pago, cualquiera de los tres. Guarda cada archivo en la carpeta de su avance o pago, no deja reemplazarlo y devuelve un enlace privado con un código imposible de adivinar (token). Firestore solo acepta fichas de archivo de la carpeta de esa misma entrada y con enlace del almacén de Firebase.
- `deleteClient` también borra las fotos y justificantes de las obras de la casa.
- El alta de clientes y de negocios no se puede hacer desde el navegador sin ser del equipo de CJ: no hay registro público en la app.

### Código que descarga el navegador
- Revisado `dist/` tras `npm run build`: sin claves privadas, cuentas de servicio ni tokens.
- Solo contiene la configuración web de Firebase (`apiKey`, `appId`…), que es pública por diseño; la protección real son las reglas y las funciones.
- El modo de pruebas (emuladores) no se incluye en la versión publicada: está en `.env.emulator.local` y solo se usa con `npm run build:emulator` / `dev:emulator`.
- Historial de git revisado: nunca se ha subido una clave privada. `.gitignore` excluye `service-account*.json`, `*-firebase-adminsdk-*.json` y `.env*.local`.
- La clave de administrador para los scripts va en la variable de entorno `FIREBASE_PRIVATE_KEY` del entorno de trabajo (ver `scripts/credentials.ts`), nunca en el repositorio.

### Cabeceras de seguridad (Firebase Hosting, `firebase.json`)
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, `Referrer-Policy`, `Permissions-Policy` (sin cámara, micrófono, ubicación ni pagos) y `Strict-Transport-Security`. Sin caché para `index.html` y `sw.js`, para que las actualizaciones lleguen.

### Textos legales
Páginas `/privacidad` y `/aviso-legal` (español e inglés), enlazadas desde la pantalla de acceso. Son un **borrador** (`src/legal/content.ts`, `draft = true`) pendiente del abogado.

## Lista de comprobación para un desarrollador

Antes de publicar:
1. **Publicar las reglas** (`npm run deploy:rules`) y comprobar en Consola → Firestore → Reglas que coinciden con `firestore.rules`.
2. **Ejecutar las pruebas de reglas** contra el emulador (`npm run test:rules`) y confirmar 0 fallos.
3. **Restringir la clave web** en Google Cloud → APIs y servicios → Credenciales: limitarla a los dominios de la app (`cjclub.eu`, `www.cjclub.eu`, `cj-club.web.app` y `cj-club.firebaseapp.com`) y solo a las APIs necesarias (Identity Toolkit, Token Service, Cloud Firestore, Firebase Installations).
4. **Authentication → Configuración**: desactivar la creación de cuentas por los usuarios ("Enable create (sign-up)"), activar la protección contra enumeración de correos, revisar la política de contraseñas y dejar en "Dominios autorizados" solo los de producción: `cjclub.eu`, `www.cjclub.eu`, `cj-club.web.app` y `cj-club.firebaseapp.com` (quitar `localhost` si no se usa).
5. **App Check** (reCAPTCHA Enterprise) para Firestore, Auth y Functions, primero en modo de supervisión y luego obligatorio. Reduce el abuso con la clave pública.
6. **Plan Blaze y funciones**: al activarlo, crear una alerta de presupuesto; desplegar `functions/` y comprobar que `createClient` rechaza a usuarios que no son admin.
7. **Cuenta de servicio**: una sola clave activa, guardada solo en el entorno; borrar claves antiguas en IAM y rotarla periódicamente.
8. **Cuentas del equipo CJ**: contraseñas fuertes y únicas; valorar la verificación en dos pasos para los `admin` (requiere Identity Platform).
9. **Copias de seguridad**: activar recuperación a un momento dado o copias programadas de Firestore (requiere Blaze).
10. **Dependencias**: `npm audit` en la raíz y en `functions/`.
11. **Textos legales**: el abogado completa los `[corchetes]`, se pone `draft = false` y se acepta el acuerdo de tratamiento de datos de Google en la consola (Configuración del proyecto → Privacidad).

Riesgos menores conocidos (aceptados por ahora):
- Un cliente puede leer lugares y descuentos desactivados si consulta la base de datos directamente (la app solo muestra los activos). No son datos personales.
- Un cliente podría crear muchos registros de uso de descuentos a su nombre; solo afecta a las estadísticas. Se puede limitar con una función si hiciera falta.
- Valorar una Content-Security-Policy completa (scripts, estilos y conexiones permitidos) tras publicar, probándola antes en modo informe.
