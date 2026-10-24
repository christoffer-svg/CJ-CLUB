/**
 * Todos los textos fijos de la app de clientes, en un único sitio.
 *
 * Para añadir un idioma (p. ej. neerlandés):
 *   1. Añádalo a `languages` (código, nombre corto, formato de fechas).
 *   2. Copie el bloque `en` como `nl` y traduzca los textos.
 *   3. En los datos de Firestore, los campos con sufijo `_nl` se usarán solos;
 *      si faltan, se muestra el texto en español.
 *   4. Añada el código a la lista de idiomas válidos en firestore.rules.
 * El panel de administración no usa este archivo: está solo en español.
 */

export const languages = [
  { code: 'es', label: 'ES', locale: 'es-ES' },
  { code: 'en', label: 'EN', locale: 'en-GB' },
] as const

export type Language = (typeof languages)[number]['code']
export const defaultLanguage: Language = 'es'

const es = {
  // General
  'brand.line1': 'Real Estate & Services',
  'brand.line2': 'Costa Blanca',
  'lang.selector': 'Idioma',
  'nav.label': 'Navegación principal',
  'nav.home': 'Inicio',
  'nav.guide': 'Guía',
  'nav.discover': 'Descubrir',
  'nav.benefits': 'Ventajas',

  // Acceso
  'login.title': 'Su vida en la Costa Blanca, más fácil.',
  'login.email': 'Correo electrónico',
  'login.password': 'Contraseña',
  'login.submit': 'Entrar',
  'login.sendLink': 'Enviar enlace',
  'login.forgot': 'He olvidado mi contraseña',
  'login.back': 'Volver al inicio de sesión',
  'login.resetIntro': 'Escriba su correo y le enviaremos un enlace para crear una nueva contraseña.',
  'login.resetSent': 'Si el correo está registrado en CJ Club, recibirá un enlace para crear una nueva contraseña.',
  'login.note': 'Acceso exclusivo para clientes de CJ',
  'login.notInvited': 'Esta cuenta no tiene acceso a CJ Club. Contacte con CJ.',
  'login.error.credentials': 'Correo o contraseña incorrectos.',
  'login.error.tooMany': 'Demasiados intentos. Espere unos minutos y vuelva a probar.',
  'login.error.network': 'Sin conexión. Compruebe su internet.',
  'login.error.disabled': 'Este acceso está desactivado. Contacte con CJ.',

  // Inicio
  'home.hello': 'Hola',
  'home.greeting': 'Hola, {name}',
  'home.clientsSince': 'Clientes desde {date}',
  'home.yourAgent': 'Su agente',
  'home.cjTeam': 'Equipo CJ',
  'home.whatsapp': 'Escribir por WhatsApp',
  'home.call': 'Llamar',
  'home.whatDoYouNeed': '¿Qué necesita?',
  'home.emergency': 'Emergencia',
  'home.emergencyText': '112 y urgencias',
  'home.health': 'Salud',
  'home.healthText': 'Médicos y clínicas',
  'home.eat': 'Dónde comer',
  'home.eatText': 'Nuestros restaurantes',
  'home.benefits': 'Mis ventajas',
  'home.benefitsText': 'Descuentos exclusivos',
  'home.activeDeals.one': '{n} descuento activo',
  'home.activeDeals.other': '{n} descuentos activos',
  'home.tip': 'Consejo de la semana',
  'home.logout': 'Cerrar sesión',

  // Guía
  'guide.eyebrow': 'Guía',
  'guide.title': 'Contactos de confianza',
  'guide.subtitle': 'Profesionales que conocemos y recomendamos.',
  'guide.personal': 'Sus contactos personales',
  'guide.general': 'Contactos generales',
  'guide.type.lawyer': 'Su abogado',
  'guide.type.gestoria': 'Su gestoría',
  'guide.type.pool': 'Su piscina',
  'guide.type.maintenance': 'Su mantenimiento',
  'guide.type.garden': 'Su jardinero',
  'guide.type.communityAdmin': 'Su administrador de fincas',
  'guide.group.urgencias': 'Urgencias',
  'guide.group.salud': 'Salud',
  'guide.group.transporte': 'Transporte',
  'guide.call': 'Llamar',
  'guide.callNumber': 'Llamar {phone}',

  // Descubrir
  'discover.eyebrow': 'Descubrir',
  'discover.title': 'Lo que nos gusta',
  'discover.subtitle': 'Seleccionado por el equipo CJ',
  'discover.filters': 'Filtrar lugares',
  'discover.filter.all': 'Todo',
  'discover.filter.restaurants': 'Restaurantes',
  'discover.filter.golf': 'Golf',
  'discover.filter.beaches': 'Playas',
  'discover.filter.plans': 'Planes',
  'discover.filter.saved': 'Guardados',
  'discover.emptySaved': 'Aún no ha guardado nada. Toque el corazón de un sitio para tenerlo aquí.',
  'discover.discount': 'CJ Club · {n}% descuento',
  'discover.save': 'Guardar {name}',
  'discover.unsave': 'Quitar {name} de guardados',

  // Ventajas
  'benefits.eyebrow': 'Ventajas',
  'benefits.title': 'Sus ventajas',
  'benefits.subtitle': 'Enseñe su tarjeta o el código en el establecimiento',
  'benefits.card': 'Tarjeta de socio',
  'benefits.member': 'Miembro CJ Club',
  'benefits.memberSince': 'Socio desde {date}',
  'benefits.showCard': 'Mostrar tarjeta',
  'benefits.deals': 'Descuentos',
  'benefits.use': 'Usar',
  'benefits.empty': 'Pronto habrá nuevas ventajas.',
  'benefits.sheetText': 'Enséñelo al pagar. El descuento se aplica directamente.',
  'benefits.qr': 'Código QR: {code}',
  'benefits.close': 'Cerrar',
  'benefits.free': 'Gratis',
}

export type TranslationKey = keyof typeof es

const en: Record<TranslationKey, string> = {
  'brand.line1': 'Real Estate & Services',
  'brand.line2': 'Costa Blanca',
  'lang.selector': 'Language',
  'nav.label': 'Main navigation',
  'nav.home': 'Home',
  'nav.guide': 'Guide',
  'nav.discover': 'Discover',
  'nav.benefits': 'Benefits',

  'login.title': 'Your life on the Costa Blanca, made easier.',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.sendLink': 'Send link',
  'login.forgot': 'I forgot my password',
  'login.back': 'Back to sign in',
  'login.resetIntro': 'Enter your email and we will send you a link to create a new password.',
  'login.resetSent': 'If this email is registered with CJ Club, you will receive a link to create a new password.',
  'login.note': 'Exclusive access for CJ clients',
  'login.notInvited': 'This account does not have access to CJ Club. Please contact CJ.',
  'login.error.credentials': 'Incorrect email or password.',
  'login.error.tooMany': 'Too many attempts. Please wait a few minutes and try again.',
  'login.error.network': 'No connection. Please check your internet.',
  'login.error.disabled': 'This account has been disabled. Please contact CJ.',

  'home.hello': 'Hello',
  'home.greeting': 'Hello, {name}',
  'home.clientsSince': 'Clients since {date}',
  'home.yourAgent': 'Your agent',
  'home.cjTeam': 'CJ Team',
  'home.whatsapp': 'Message on WhatsApp',
  'home.call': 'Call',
  'home.whatDoYouNeed': 'What do you need?',
  'home.emergency': 'Emergency',
  'home.emergencyText': '112 and urgent numbers',
  'home.health': 'Health',
  'home.healthText': 'Doctors and clinics',
  'home.eat': 'Where to eat',
  'home.eatText': 'Our restaurants',
  'home.benefits': 'My benefits',
  'home.benefitsText': 'Exclusive discounts',
  'home.activeDeals.one': '{n} active discount',
  'home.activeDeals.other': '{n} active discounts',
  'home.tip': 'Tip of the week',
  'home.logout': 'Sign out',

  'guide.eyebrow': 'Guide',
  'guide.title': 'Trusted contacts',
  'guide.subtitle': 'Professionals we know and recommend.',
  'guide.personal': 'Your personal contacts',
  'guide.general': 'General contacts',
  'guide.type.lawyer': 'Your lawyer',
  'guide.type.gestoria': 'Your gestoría',
  'guide.type.pool': 'Your pool service',
  'guide.type.maintenance': 'Your maintenance',
  'guide.type.garden': 'Your gardener',
  'guide.type.communityAdmin': 'Your community administrator',
  'guide.group.urgencias': 'Emergencies',
  'guide.group.salud': 'Health',
  'guide.group.transporte': 'Transport',
  'guide.call': 'Call',
  'guide.callNumber': 'Call {phone}',

  'discover.eyebrow': 'Discover',
  'discover.title': 'What we love',
  'discover.subtitle': 'Selected by the CJ team',
  'discover.filters': 'Filter places',
  'discover.filter.all': 'All',
  'discover.filter.restaurants': 'Restaurants',
  'discover.filter.golf': 'Golf',
  'discover.filter.beaches': 'Beaches',
  'discover.filter.plans': 'Things to do',
  'discover.filter.saved': 'Saved',
  'discover.emptySaved': 'Nothing saved yet. Tap the heart on a place to keep it here.',
  'discover.discount': 'CJ Club · {n}% off',
  'discover.save': 'Save {name}',
  'discover.unsave': 'Remove {name} from saved',

  'benefits.eyebrow': 'Benefits',
  'benefits.title': 'Your benefits',
  'benefits.subtitle': 'Show your card or the code at the venue',
  'benefits.card': 'Membership card',
  'benefits.member': 'CJ Club Member',
  'benefits.memberSince': 'Member since {date}',
  'benefits.showCard': 'Show card',
  'benefits.deals': 'Discounts',
  'benefits.use': 'Use',
  'benefits.empty': 'New benefits coming soon.',
  'benefits.sheetText': 'Show it when you pay. The discount is applied directly.',
  'benefits.qr': 'QR code: {code}',
  'benefits.close': 'Close',
  'benefits.free': 'Free',
}

export const translations: Record<Language, Record<TranslationKey, string>> = { es, en }
