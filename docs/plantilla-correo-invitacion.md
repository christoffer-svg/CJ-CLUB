# Plantilla del correo de invitación / contraseña

Dónde se pega: Consola de Firebase → Authentication → Plantillas → Restablecimiento de contraseña → icono del lápiz.

La misma plantilla sirve para la invitación de clientes nuevos y para "He olvidado mi contraseña",
por eso el texto vale para los dos casos y va en español e inglés.

- Nombre del remitente: CJ Club
- Responder a: el correo de contacto de CJ
- Asunto: CJ Club · Su acceso / Your access

Mensaje (HTML):

```html
<p>Hola, %DISPLAY_NAME%:</p>
<p>Le damos la bienvenida a <strong>CJ Club</strong>, la app privada de CJ Real Estate &amp; Services para nuestros clientes en la Costa Blanca.</p>
<p>Para crear o cambiar su contraseña, pulse este enlace:</p>
<p><a href="%LINK%">Elegir mi contraseña</a></p>
<p>Por seguridad, el enlace caduca en una hora. Si ha caducado, abra la app y pulse «He olvidado mi contraseña».</p>
<p>Después, entre en la app desde <a href="https://cjclub.eu">cjclub.eu</a>. En el móvil puede añadirla a la pantalla de inicio para abrirla como una app más.</p>
<p>Si no esperaba este correo, puede ignorarlo.</p>
<p>Un cordial saludo,<br>El equipo de CJ Real Estate &amp; Services</p>
<hr>
<p>Hello %DISPLAY_NAME%,</p>
<p>Welcome to <strong>CJ Club</strong>, the private app of CJ Real Estate &amp; Services for our clients on the Costa Blanca.</p>
<p>To create or change your password, please click this link:</p>
<p><a href="%LINK%">Choose my password</a></p>
<p>For your security, the link expires in one hour. If it has expired, open the app and tap “Forgot my password”.</p>
<p>Then sign in to the app at <a href="https://cjclub.eu">cjclub.eu</a>. On your phone you can add it to your home screen to open it like any other app.</p>
<p>If you were not expecting this email, you can safely ignore it.</p>
<p>Kind regards,<br>The CJ Real Estate &amp; Services team</p>
```
