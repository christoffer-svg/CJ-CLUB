# Seguridad de CJ Club

Revisión previa a publicar con datos reales. Resumen de lo configurado y lista de comprobación para un desarrollador.

## Lo que está configurado

### Reglas de Firestore (`firestore.rules`)
Todo está denegado salvo lo que se permite expresamente.

| Colección | Cliente (`client`) | Equipo CJ (`admin`) |
|---|---|---|
| `users/{uid}` | Lee solo su ficha. Solo puede cambiar `language` y `favorites` (lista, máx. 200). | Lee y gestiona todas. No puede cambiarse su propio rol ni borrarse a sí mismo. Rol limitado a `admin` / `client` / `business`. Un negocio tiene que quedar vinculado a un lugar que existe. |
| `clients/{id}` | Lee solo la suya (`clientId` de su ficha). No escribe. | Lee y escribe. |
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
| Cualquier otra | Denegado. | Denegado. |

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

Pruebas: `tests/firestore-rules.mjs` (238 comprobaciones; ver instrucciones en el archivo). Ejecutar antes de cada cambio de reglas.

### Funciones de servidor (`functions/`)
- `createClient` (Madrid, `europe-southwest1`): comprueba que quien llama es `admin`, valida los datos, crea la cuenta con contraseña aleatoria, la ficha y el perfil; si algo falla, no deja cuentas sueltas. Límite de 5 instancias.
- `createBusiness`: igual, para el acceso de un negocio vinculado a un lugar que ya existe. Si falla al guardar la ficha, no deja la cuenta suelta.
- `businessReservationSummary`: solo el propio negocio. Cuenta las pulsaciones en Reservar de su lugar y devuelve el número, sin nombres de clientes.
- `deleteClient`: baja de un cliente (derecho de supresión). Solo `admin`; borra sus cuentas de acceso, perfiles, ficha, conversación con mensajes, peticiones, registros de uso y sus pinchazos y confirmaciones de reserva. Se niega si hay una cuenta del equipo vinculada. No es una función nueva: es la misma baja de siempre.
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
3. **Restringir la clave web** en Google Cloud → APIs y servicios → Credenciales: limitarla a los dominios de la app (`cj-club.web.app`, `cj-club.firebaseapp.com` y el dominio propio) y solo a las APIs necesarias (Identity Toolkit, Token Service, Cloud Firestore, Firebase Installations).
4. **Authentication → Configuración**: desactivar la creación de cuentas por los usuarios ("Enable create (sign-up)"), activar la protección contra enumeración de correos, revisar la política de contraseñas y dejar en "Dominios autorizados" solo los de producción (quitar `localhost` si no se usa).
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
