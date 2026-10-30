/**
 * Correos propios de CJ Club (invitación para elegir contraseña), con la marca de CJ
 * y en el idioma de cada persona. Se envían con Resend (https://resend.com).
 */

export type MailLanguage = 'es' | 'en' | 'nl' | 'sv' | 'de' | 'fr'
export type MailRole = 'client' | 'business' | 'admin'

type Texts = {
  subject: string
  preheader: string
  hello: string
  familyHello: string
  introClient: string
  introBusiness: string
  introAdmin: string
  button: string
  linkHint: string
  expiry: string
  install: string
  ignore: string
  signoff: string
  team: string
  footer: string
}

// {name} = nombre de la persona o apellido de la familia; {url} = dirección de la app
const texts: Record<MailLanguage, Texts> = {
  es: {
    subject: 'Su acceso a CJ Club',
    preheader: 'Elija su contraseña para entrar en CJ Club.',
    hello: 'Hola, {name}:',
    familyHello: 'Hola, familia {name}:',
    introClient: 'Le damos la bienvenida a CJ Club, la app privada de CJ Real Estate & Services para nuestros clientes en la Costa Blanca: sus contactos de confianza, nuestras recomendaciones y ventajas exclusivas.',
    introBusiness: 'Le damos acceso a CJ Club para negocios colaboradores. Desde ahí podrá publicar las ventajas que ofrece a los clientes de CJ.',
    introAdmin: 'Le damos acceso al panel del equipo de CJ Club.',
    button: 'Elegir mi contraseña',
    linkHint: 'Si el botón no funciona, copie este enlace en el navegador:',
    expiry: 'Por seguridad, el enlace caduca en una hora. Si ha caducado, entre en {url} y pulse «He olvidado mi contraseña».',
    install: 'Después entre en {url}. En el móvil puede añadirla a la pantalla de inicio para abrirla como una app más.',
    ignore: 'Si no esperaba este correo, puede ignorarlo.',
    signoff: 'Un cordial saludo,',
    team: 'El equipo de CJ Real Estate & Services',
    footer: 'CJ Real Estate & Services · Costa Blanca',
  },
  en: {
    subject: 'Your access to CJ Club',
    preheader: 'Choose your password to sign in to CJ Club.',
    hello: 'Hello {name},',
    familyHello: 'Dear {name} family,',
    introClient: 'Welcome to CJ Club, the private app of CJ Real Estate & Services for our clients on the Costa Blanca: your trusted contacts, our recommendations and exclusive benefits.',
    introBusiness: 'We are giving you access to CJ Club for partner businesses, where you can publish the benefits you offer to CJ clients.',
    introAdmin: 'We are giving you access to the CJ Club team panel.',
    button: 'Choose my password',
    linkHint: 'If the button does not work, copy this link into your browser:',
    expiry: 'For your security, the link expires in one hour. If it has expired, go to {url} and tap “I forgot my password”.',
    install: 'Then sign in at {url}. On your phone you can add it to your home screen to open it like any other app.',
    ignore: 'If you were not expecting this email, you can safely ignore it.',
    signoff: 'Kind regards,',
    team: 'The CJ Real Estate & Services team',
    footer: 'CJ Real Estate & Services · Costa Blanca',
  },
  nl: {
    subject: 'Uw toegang tot CJ Club',
    preheader: 'Kies uw wachtwoord om in te loggen bij CJ Club.',
    hello: 'Beste {name},',
    familyHello: 'Beste familie {name},',
    introClient: 'Welkom bij CJ Club, de privé-app van CJ Real Estate & Services voor onze klanten aan de Costa Blanca: uw vertrouwde contacten, onze aanbevelingen en exclusieve voordelen.',
    introBusiness: 'U krijgt toegang tot CJ Club voor partnerbedrijven. Daar kunt u de voordelen publiceren die u aan klanten van CJ biedt.',
    introAdmin: 'U krijgt toegang tot het teampaneel van CJ Club.',
    button: 'Mijn wachtwoord kiezen',
    linkHint: 'Werkt de knop niet? Kopieer dan deze link in uw browser:',
    expiry: 'Voor uw veiligheid verloopt de link na een uur. Is hij verlopen? Ga dan naar {url} en tik op «Ik ben mijn wachtwoord vergeten».',
    install: 'Log daarna in op {url}. Op uw telefoon kunt u de app aan uw beginscherm toevoegen.',
    ignore: 'Verwachtte u deze e-mail niet? Dan kunt u hem negeren.',
    signoff: 'Met vriendelijke groet,',
    team: 'Het team van CJ Real Estate & Services',
    footer: 'CJ Real Estate & Services · Costa Blanca',
  },
  sv: {
    subject: 'Din inloggning till CJ Club',
    preheader: 'Välj ditt lösenord för att logga in i CJ Club.',
    hello: 'Hej {name}!',
    familyHello: 'Hej familjen {name}!',
    introClient: 'Välkommen till CJ Club, CJ Real Estate & Services privata app för våra kunder på Costa Blanca: dina pålitliga kontakter, våra rekommendationer och exklusiva förmåner.',
    introBusiness: 'Du får tillgång till CJ Club för samarbetspartner. Där kan du publicera de förmåner du erbjuder CJ:s kunder.',
    introAdmin: 'Du får tillgång till CJ Clubs teampanel.',
    button: 'Välj mitt lösenord',
    linkHint: 'Om knappen inte fungerar, kopiera den här länken till webbläsaren:',
    expiry: 'Av säkerhetsskäl gäller länken i en timme. Om den har gått ut, gå till {url} och tryck på «Jag har glömt mitt lösenord».',
    install: 'Logga sedan in på {url}. I mobilen kan du lägga till appen på hemskärmen.',
    ignore: 'Om du inte väntade dig det här mejlet kan du bortse från det.',
    signoff: 'Vänliga hälsningar,',
    team: 'Teamet på CJ Real Estate & Services',
    footer: 'CJ Real Estate & Services · Costa Blanca',
  },
  de: {
    subject: 'Ihr Zugang zu CJ Club',
    preheader: 'Wählen Sie Ihr Passwort, um sich bei CJ Club anzumelden.',
    hello: 'Hallo {name},',
    familyHello: 'Liebe Familie {name},',
    introClient: 'Willkommen bei CJ Club, der privaten App von CJ Real Estate & Services für unsere Kunden an der Costa Blanca: Ihre vertrauenswürdigen Kontakte, unsere Empfehlungen und exklusive Vorteile.',
    introBusiness: 'Sie erhalten Zugang zu CJ Club für Partnerbetriebe. Dort können Sie die Vorteile veröffentlichen, die Sie Kunden von CJ anbieten.',
    introAdmin: 'Sie erhalten Zugang zum Team-Bereich von CJ Club.',
    button: 'Mein Passwort wählen',
    linkHint: 'Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:',
    expiry: 'Aus Sicherheitsgründen ist der Link eine Stunde gültig. Ist er abgelaufen, öffnen Sie {url} und tippen Sie auf «Ich habe mein Passwort vergessen».',
    install: 'Melden Sie sich danach unter {url} an. Auf dem Handy können Sie die App zum Startbildschirm hinzufügen.',
    ignore: 'Wenn Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.',
    signoff: 'Mit freundlichen Grüßen',
    team: 'Ihr Team von CJ Real Estate & Services',
    footer: 'CJ Real Estate & Services · Costa Blanca',
  },
  fr: {
    subject: 'Votre accès à CJ Club',
    preheader: 'Choisissez votre mot de passe pour vous connecter à CJ Club.',
    hello: 'Bonjour {name},',
    familyHello: 'Chère famille {name},',
    introClient: 'Bienvenue dans CJ Club, l’application privée de CJ Real Estate & Services pour nos clients sur la Costa Blanca : vos contacts de confiance, nos recommandations et des avantages exclusifs.',
    introBusiness: 'Nous vous donnons accès à CJ Club pour les établissements partenaires. Vous pourrez y publier les avantages que vous offrez aux clients de CJ.',
    introAdmin: 'Nous vous donnons accès au panneau de l’équipe CJ Club.',
    button: 'Choisir mon mot de passe',
    linkHint: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    expiry: 'Pour votre sécurité, le lien expire au bout d’une heure. S’il a expiré, rendez-vous sur {url} et touchez «J’ai oublié mon mot de passe».',
    install: 'Connectez-vous ensuite sur {url}. Sur votre téléphone, vous pouvez l’ajouter à l’écran d’accueil.',
    ignore: 'Si vous n’attendiez pas cet e-mail, vous pouvez l’ignorer.',
    signoff: 'Bien cordialement,',
    team: 'L’équipe de CJ Real Estate & Services',
    footer: 'CJ Real Estate & Services · Costa Blanca',
  },
}

export const isMailLanguage = (l: unknown): l is MailLanguage => typeof l === 'string' && l in texts

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

/** Saludo: "Hola, familia Jansen" si el nombre es "Familia X"; si no, "Hola, Ana" */
function greeting(t: Texts, name: string) {
  const m = name.match(/^Familia\s+(.+)$/i)
  return m ? fill(t.familyHello, { name: m[1] }) : fill(t.hello, { name })
}

export function invitationEmail(opts: { language: MailLanguage; role: MailRole; name: string; link: string; appUrl: string }) {
  const t = texts[opts.language]
  const appHost = opts.appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const intro = opts.role === 'business' ? t.introBusiness : opts.role === 'admin' ? t.introAdmin : t.introClient
  const hello = greeting(t, opts.name)
  const vars = { url: appHost }

  // Colores de la marca: negro, espresso, dorado, arena y blanco roto
  const html = `<!doctype html>
<html lang="${opts.language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(t.subject)}</title></head>
<body style="margin:0;padding:0;background:#E8DDCB;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(t.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8DDCB;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="background:#000000;background-image:linear-gradient(160deg,#493B34,#000000);padding:28px 32px;border-radius:8px 8px 0 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:14px;"><img src="${escapeHtml(opts.appUrl)}/logo.png" width="48" height="48" alt="CJ" style="display:block;border-radius:50%;"></td>
    <td style="font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#B79A68;line-height:1.8;">Real Estate &amp; Services<br>Costa Blanca</td>
  </tr></table>
  <div style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:28px;color:#FFFFFF;margin-top:22px;">CJ Club</div>
</td></tr>
<tr><td style="background:#FBF8F3;border:1px solid #D3C4AA;border-top:0;padding:32px;border-radius:0 0 8px 8px;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#1A1512;font-size:15px;line-height:1.6;">
  <p style="margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:20px;">${escapeHtml(hello)}</p>
  <p style="margin:0 0 24px;">${escapeHtml(intro)}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#000000;border:1px solid #B79A68;border-radius:6px;">
    <a href="${escapeHtml(opts.link)}" style="display:inline-block;padding:14px 26px;font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">${escapeHtml(t.button)}</a>
  </td></tr></table>
  <p style="margin:0 0 6px;font-size:12px;color:#6F665B;">${escapeHtml(t.linkHint)}</p>
  <p style="margin:0 0 20px;font-size:12px;word-break:break-all;"><a href="${escapeHtml(opts.link)}" style="color:#8F7547;">${escapeHtml(opts.link)}</a></p>
  <p style="margin:0 0 12px;font-size:13px;color:#6F665B;">${escapeHtml(fill(t.expiry, vars))}</p>
  <p style="margin:0 0 12px;font-size:13px;color:#6F665B;">${escapeHtml(fill(t.install, vars))}</p>
  <p style="margin:0 0 24px;font-size:13px;color:#6F665B;">${escapeHtml(t.ignore)}</p>
  <p style="margin:0;">${escapeHtml(t.signoff)}<br>${escapeHtml(t.team)}</p>
</td></tr>
<tr><td align="center" style="padding:16px;font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#887F73;">${escapeHtml(t.footer)} · <a href="${escapeHtml(opts.appUrl)}" style="color:#887F73;">${escapeHtml(appHost)}</a></td></tr>
</table>
</td></tr></table>
</body></html>`

  const text = [
    hello,
    '',
    intro,
    '',
    `${t.button}: ${opts.link}`,
    '',
    fill(t.expiry, vars),
    fill(t.install, vars),
    t.ignore,
    '',
    t.signoff,
    t.team,
  ].join('\n')

  return { subject: t.subject, html, text }
}

/** Envía un correo con Resend. Devuelve el id del envío o lanza un error con el motivo. */
export async function sendWithResend(opts: {
  apiKey: string
  from: string
  replyTo?: string
  to: string
  subject: string
  html: string
  text: string
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  })
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? 'error'}`)
  return body.id ?? ''
}
