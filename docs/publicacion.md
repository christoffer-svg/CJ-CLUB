# Cómo se publica CJ Club

Cuando un cambio queda guardado en la versión principal del proyecto, la app se publica sola en internet. No hay que ejecutar ningún comando.

La dirección de la app es [https://cj-club.web.app](https://cj-club.web.app). Hoy esa página dice «Site Not Found» porque todavía no se ha publicado nada. La primera publicación que salga bien sustituye ese aviso por la pantalla de acceso.

## Qué ocurre solo

Cada vez que se guarda un cambio en la rama `main` (es lo que hace Claude Code al terminar un cambio), GitHub hace esto, en este orden:

1. Revisa el código.
2. Construye la app.
3. Si los dos pasos anteriores salen bien, publica tres cosas:
   - la web, en [https://cj-club.web.app](https://cj-club.web.app);
   - las normas de seguridad de la base de datos;
   - los índices de la base de datos.

Si el paso 1 o el 2 falla, no se publica nada. Lo que ya estuviera en internet se queda como está.

Las funciones del servidor (dar de alta a un cliente y darle de baja) no se publican. Esas funciones necesitan el plan de pago de Firebase, y todavía no está activado. Más abajo se explica cómo encenderlas el día que lo decida.

También puede lanzar la misma publicación a mano, sin esperar a un cambio nuevo. Los pasos están en «Publicar a mano».

## Lo que hay que hacer una sola vez

Hay que guardar en GitHub la clave de la cuenta que publica. Sin esa clave, la revisión y la construcción se hacen, pero la publicación se detiene y no sube nada.

La cuenta es `firebase-adminsdk-fbsvc@cj-club.iam.gserviceaccount.com`.

Antes de guardar la clave, esa cuenta necesita estos permisos en el proyecto `cj-club` (Google Cloud → [IAM](https://console.cloud.google.com/iam-admin/iam?project=cj-club) → la cuenta → el lápiz):

- **Firebase Admin** (Administrador de Firebase)
- **Service Usage Consumer** (Consumidor de Service Usage)
- **Service Account User** (Usuario de cuentas de servicio)

El tercero no hace falta para la web. Hace falta el día que se enciendan las funciones. Conviene dejarlo puesto ya. Tiene que estar en la lista de IAM del proyecto, no solo dentro de la ficha de la cuenta.

### Crear el archivo de la clave

1. Abra [Cuentas de servicio](https://console.cloud.google.com/iam-admin/serviceaccounts?project=cj-club) con la cuenta de Google dueña del proyecto.
2. Pulse la cuenta `firebase-adminsdk-fbsvc`.
3. Pestaña **Claves** → **Agregar clave** → **Crear clave nueva**.
4. Elija **JSON** y pulse **Crear**. Se descarga un archivo.
5. Ábralo con el bloc de notas. Tiene que empezar por `{` y terminar por `}`.

Ese archivo es una llave del proyecto. Quien lo tenga puede administrar CJ Club. No lo envíe por correo ni lo deje en el escritorio: después de pegarlo en GitHub, bórrelo del ordenador.

### Guardarla en GitHub

1. Abra [Secretos de Actions](https://github.com/christoffer-svg/CJ-CLUB/settings/secrets/actions).
2. **New repository secret**.
3. En **Name**, escriba exactamente: `FIREBASE_SERVICE_ACCOUNT`
4. En **Secret**, pegue el archivo entero, desde `{` hasta `}`.
5. **Add secret**.

El archivo `.env` de la app no es una clave secreta y no hay que copiarlo aquí. Ya viaja con el código. La única clave que va en GitHub es `FIREBASE_SERVICE_ACCOUNT`.

Haga esto antes de aceptar el cambio que añade esta publicación. Si se acepta antes, el primer intento fallará por falta de clave: no pasa nada, no se publica nada, y se puede repetir con el botón de «Publicar a mano» cuando la clave ya esté guardada.

## Publicar a mano

1. Abra [Actions](https://github.com/christoffer-svg/CJ-CLUB/actions).
2. A la izquierda, **Publicar CJ Club**.
3. **Run workflow**.
4. Deje la rama `main`.
5. **Run workflow** otra vez, el botón verde.
6. Espere a que el intento salga en verde. Luego abra [https://cj-club.web.app](https://cj-club.web.app).

## Encender las funciones más adelante

Las funciones dan de alta y de baja a los clientes desde el panel. Hasta que no estén publicadas, esas dos acciones del panel no pueden completarse en la app real.

Cuestan dinero: el proyecto tiene que estar en el plan **Blaze** (pago por uso) de Firebase. Antes de pasarse, ponga una alerta de gasto en [Uso y facturación](https://console.firebase.google.com/project/cj-club/usage/details).

Cuando el plan ya esté activo:

1. Abra [Variables de Actions](https://github.com/christoffer-svg/CJ-CLUB/settings/variables/actions).
2. **New repository variable**.
3. **Name:** `DEPLOY_FUNCTIONS`
4. **Value:** `true` (en minúsculas, sin espacios).
5. Guarde.

A partir del siguiente cambio en `main`, o de una publicación a mano, también se publican las funciones. La web, las reglas y los índices se siguen publicando igual.

Para dejar de actualizarlas, borre esa variable o cambie el valor. Lo que ya estuviera publicado no se apaga solo: simplemente deja de renovarse.

La primera vez puede pedir que se activen servicios de Google (Cloud Build, Artifact Registry, Cloud Run y otros). La publicación no puede activarlos. El informe trae un enlace: ábralo, pulse **Activar**, y vuelva a lanzar la publicación a mano.

Si el informe habla de permisos, a los tres de arriba hay que añadir **Cloud Functions Admin** (Administrador de Cloud Functions). Si nombra Cloud Run, Artifact Registry o Cloud Build, los permisos están en «Permisos solo para las funciones».

## Si algo falla

1. Abra [Actions](https://github.com/christoffer-svg/CJ-CLUB/actions).
2. Entre en el intento con la cruz roja.
3. Abra el paso en rojo y lea las últimas líneas. Un aviso en amarillo no para la publicación. Solo la para un paso en rojo.

Qué suele significar:

- **Falta el secreto FIREBASE_SERVICE_ACCOUNT.** La clave no está guardada, el nombre no coincide, o no se pegó el archivo entero. Repita «Guardarla en GitHub».
- **Permission denied** o **403**, al publicar la web o las reglas. Falta un permiso de la lista de arriba. Los que necesita la web son Firebase Admin y Service Usage Consumer.
- Un enlace a `console.cloud.google.com/apis/library`. Ese servicio no está activado. Ábralo, pulse **Activar** y repita la publicación a mano. La cuenta automática puede comprobar los servicios, no encenderlos.
- **Blaze** o **billing**, en el paso de las funciones. La variable `DEPLOY_FUNCTIONS` está en `true` y el proyecto sigue en el plan gratuito. O pase a Blaze, o borre la variable si todavía no quiere las funciones. La web no depende de ese plan.
- Un aviso en amarillo sobre la limpieza de imágenes. La web y las funciones sí se han publicado. Si el aviso nombra Artifact Registry Administrator, añada ese permiso; está en «Permisos solo para las funciones».
- El fallo está en **Revisar el código** o **Construir la app**. El cambio tiene un error. No se ha publicado. Hay que corregir el código y volver a guardarlo en `main`.

Si **Publicar la web, las reglas y los índices** está en verde y **Publicar las funciones** está en rojo, la web sí se ha actualizado. Las funciones no.

## Permisos solo para las funciones

Hacen falta cuando `DEPLOY_FUNCTIONS` vale `true`. No hacen falta para publicar la web.

Según la documentación de Firebase, además de los tres permisos de la primera lista:

- **Cloud Functions Admin** (`roles/cloudfunctions.admin`)
- **Service Account User** (`roles/iam.serviceAccountUser`), ya citado arriba

Estas funciones son del tipo nuevo de Google (se apoyan en Cloud Run). Si el informe nombra uno de estos servicios, añada el permiso que corresponda:

- **Cloud Run Admin** (`roles/run.admin`)
- **Artifact Registry Administrator** (`roles/artifactregistry.admin`)
- **Cloud Build Editor** (`roles/cloudbuild.builds.editor`)

Cada publicación de las funciones guarda una imagen. Sin una norma de limpieza, esas imágenes se acumulan y pueden costar un poco cada mes. Tras publicarlas, el flujo intenta dejar esa norma en la región de Madrid: borra las imágenes con más de un día. No borra las funciones ni la web.

Para eso hace falta **Artifact Registry Administrator** (Administrador de Artifact Registry) en la misma cuenta, en [IAM](https://console.cloud.google.com/iam-admin/iam?project=cj-club). Si falta, la publicación sigue y el informe deja un aviso en amarillo con este permiso y el enlace. Añádalo y publique a mano otra vez.

Si el informe dice que no puede crear la identidad de un servicio (`generating the service identity`), añada **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`). Ese permiso puede encender y apagar servicios de Google: póngalo solo si el enlace de «Activar» no ha bastado.

Los enlaces de activación que puede pedir la primera publicación de funciones:

- [Cloud Functions](https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=cj-club)
- [Cloud Build](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=cj-club)
- [Artifact Registry](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=cj-club)
- [Cloud Run](https://console.cloud.google.com/apis/library/run.googleapis.com?project=cj-club)
- [Eventarc](https://console.cloud.google.com/apis/library/eventarc.googleapis.com?project=cj-club)
- [Pub/Sub](https://console.cloud.google.com/apis/library/pubsub.googleapis.com?project=cj-club)
- [Cloud Storage](https://console.cloud.google.com/apis/library/storage.googleapis.com?project=cj-club)
