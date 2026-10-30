# Correo propio de CJ Club

Cuando el equipo de CJ crea un cliente o un negocio, o pulsa «Reenviar invitación», el servidor envía
un correo **de CJ Club** para elegir la contraseña:

- con el logo y los colores de CJ;
- en el idioma de la persona (español, inglés, neerlandés, sueco, alemán o francés);
- desde una dirección de CJ, por ejemplo `CJ Club <info@cjclub.eu>`;
- con un botón que lleva a elegir la contraseña y, después, a `cjclub.eu`.

Los textos están en `functions/src/email.ts`. El remitente y la dirección de la app, en `functions/.env`.

**Mientras no esté activado**, la app envía el correo estándar de Firebase, como hasta ahora. Nada deja
de funcionar. En la ficha de cada cliente se ve si el último correo de CJ salió bien.

## Qué hace falta (una sola vez)

1. **Plan Blaze en Firebase.** Las funciones del servidor lo necesitan. Ponga antes una alerta de gasto
   (Firebase → Uso y facturación). Con el uso de CJ Club lo normal es pagar 0 € o céntimos.

2. **Cuenta en Resend** (https://resend.com). El plan gratuito permite unos 3.000 correos al mes, de sobra
   para las invitaciones.

3. **Verificar el dominio `cjclub.eu` en Resend.** Resend → Domains → Add domain → `cjclub.eu`, región
   Europa (Irlanda). Resend muestra unos registros DNS (TXT y MX). Hay que añadirlos donde se gestiona el
   dominio (el mismo sitio donde se configuró cjclub.eu para Firebase). Cuando Resend diga «Verified», ya se
   puede enviar desde cualquier dirección `@cjclub.eu`.

4. **Crear una clave en Resend.** Resend → API Keys → Create API key, permiso «Sending access». Se muestra
   una sola vez: no la cierre hasta el paso 5.

5. **Guardar la clave en Google Cloud (Secret Manager)**, nunca en el código ni en el chat:
   - Abra https://console.cloud.google.com/security/secret-manager?project=cj-club
   - **Crear secreto** → Nombre: `RESEND_API_KEY` (exactamente así) → Valor: pegue la clave → Crear.

6. **Permiso para la cuenta que publica.** En Google Cloud → IAM
   (https://console.cloud.google.com/iam-admin/iam?project=cj-club), a la cuenta
   `firebase-adminsdk-fbsvc@cj-club.iam.gserviceaccount.com` añada el rol
   **Administrador de Secret Manager** (Secret Manager Admin). La publicación lo necesita para dar a la
   función acceso a la clave.

7. **Revisar `functions/.env`:**
   - `EMAIL_FROM`: el remitente, por ejemplo `CJ Club <info@cjclub.eu>`. El dominio tiene que ser el
     verificado en el paso 3.
   - `EMAIL_REPLY_TO`: el correo donde quiere recibir las respuestas de los clientes (por ejemplo el de la
     oficina). Si lo deja vacío, las respuestas van al remitente.

8. **Activar el correo propio:** en `functions/.env`, cambie `EMAIL_ENABLED=false` por `EMAIL_ENABLED=true`
   (o pídaselo a Claude). La siguiente publicación sube la función con acceso a la clave.
   Hágalo **solo después** del paso 5: si el secreto no existe, la publicación de las funciones falla.
   Las funciones tienen que estar encendidas (`DEPLOY_FUNCTIONS` = `true`, ver `docs/publicacion.md`).

## Cómo comprobarlo

1. En el panel, abra un cliente de prueba con su propio correo y pulse **Reenviar invitación**.
2. El aviso debe decir «Invitación de CJ Club enviada a …». Si dice «(correo estándar de Firebase)», el
   correo propio no está activo: mire en la ficha el motivo, junto a «Último correo de CJ».
3. Mire también la carpeta de correo no deseado la primera vez.

## Si algo falla

- **«el correo de CJ aún no está configurado»**: `EMAIL_ENABLED` no está en `true` (paso 8), falta el secreto
  `RESEND_API_KEY` (paso 5) o las funciones no se han vuelto a publicar después.
- **«Resend 403 … domain is not verified»**: el dominio del remitente no está verificado (paso 3) o
  `EMAIL_FROM` usa otro dominio.
- **«Resend 401»**: la clave no es válida. Cree otra en Resend y añádala como nueva versión del secreto.
- La publicación de funciones falla nombrando **Secret Manager**: falta el permiso del paso 6, o el secreto
  no existe con el nombre exacto `RESEND_API_KEY`.

## Probarlo sin enviar nada (para desarrolladores)

En el Firebase de pruebas no se envían correos: con `EMAIL_ENABLED=true` (por ejemplo en `functions/.env.local`)
y `functions/.secret.local` conteniendo `RESEND_API_KEY=test` (este archivo no se sube a GitHub), cada invitación se guarda en la colección
`mailLog` con el HTML completo para revisarlo.
