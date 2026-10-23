# CJ Club

Aplicación web privada de CJ Real Estate & Services (inmobiliaria en la Costa Blanca, España) para sus clientes: guía de contactos de confianza (generales y asignados a cada cliente), recomendaciones de restaurantes, golf, playas y planes, y descuentos exclusivos en negocios colaboradores. Incluye un panel interno para el equipo de CJ.

## Quién la usa
- Clientes de CJ (rol "client"): normalmente extranjeros, la usan en el móvil, en español o inglés.
- Equipo de CJ (rol "admin"): gestiona clientes, contactos, lugares y descuentos desde el panel, en español.
- La persona que te da las instrucciones es el dueño de la empresa, no es programador: explícale las cosas sin tecnicismos y pídele confirmación antes de cualquier paso que cueste dinero o borre datos.

## Tecnología
- React + TypeScript + Vite, como aplicación web instalable en el móvil (PWA).
- Firebase: Authentication (correo y contraseña), Firestore, Storage, Cloud Functions y Hosting, en el proyecto "cj-club" y en una región de Europa.
- Nunca pongas claves secretas en el código del navegador.

## Diseño (obligatorio)
- Colores: Pure Black #000000, Espresso #493B34, Champagne Gold #B79A68, Warm Sand #E8DDCB, Pure White #FFFFFF, Stone #887F73.
- Fondo de la app: Warm Sand, siempre, también en modo oscuro. Cabeceras: degradado de Espresso a negro. Dorado solo para detalles.
- Tarjetas #FBF8F3 con borde #D3C4AA; texto #1A1512 y secundario #6F665B.
- Tipografías: Playfair Display (títulos) y Montserrat (texto). Etiquetas pequeñas en mayúsculas espaciadas, en dorado.
- Logo: logo.png de esta carpeta.
- Estilo: lujo discreto y tranquilo. Sin emojis ni colores chillones.

## Forma de trabajar
- Construimos por pasos. Haz solo lo que pide cada paso y no cambies lo que ya funciona.
- Al terminar cada paso, arranca la vista previa, comprueba que funciona y resume en pocas líneas qué has hecho y qué debo probar.
