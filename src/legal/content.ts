/**
 * Textos legales de CJ Club: política de privacidad y aviso legal.
 *
 * BORRADOR: estructura basada en el RGPD, la LOPDGDD y la LSSI. El texto final lo debe
 * revisar y completar el abogado de CJ. Los datos entre [corchetes] están pendientes.
 * Para publicar la versión definitiva: sustituya los textos y ponga `draft: false`.
 */
import type { Language } from '../i18n/translations'

export type LegalSection = { title: string; paragraphs: string[] }
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] }
export type LegalPageKey = 'privacy' | 'legal'

export const draft = true

const company = {
  es: '[Razón social de CJ Real Estate & Services]',
  en: '[Legal name of CJ Real Estate & Services]',
}

// Español e inglés; los demás idiomas muestran la versión en inglés hasta que el abogado apruebe sus traducciones
const legal: Partial<Record<Language, Record<LegalPageKey, LegalDoc>>> & Record<'es' | 'en', Record<LegalPageKey, LegalDoc>> = {
  es: {
    privacy: {
      title: 'Política de privacidad',
      updated: 'Última actualización: [fecha]',
      sections: [
        {
          title: '1. Responsable del tratamiento',
          paragraphs: [
            `${company.es}, con NIF [NIF], domicilio en [dirección completa] y correo electrónico [correo de contacto para privacidad].`,
            '[Si procede: datos de contacto del Delegado de Protección de Datos.]',
          ],
        },
        {
          title: '2. Qué datos tratamos',
          paragraphs: [
            'Datos de identificación y contacto: nombre de la familia y correo electrónico.',
            'Datos de la relación con CJ: vivienda, fecha de alta, número de socio, agente asignado y colaboradores recomendados (abogado, gestoría, mantenimiento, etc.).',
            'Preferencias en la app: idioma y lugares guardados como favoritos.',
            'Uso de descuentos: qué descuento se ha mostrado en la app y en qué fecha.',
            'Reservas en restaurantes: qué restaurante ha abierto con el botón Reservar, en qué fecha, y si ha indicado que consiguió mesa. A los restaurantes solo se les enseñan cifras del mes, nunca nombres.',
            'Mensajes y peticiones que envía a CJ desde la app, y las notas y contactos propios que guarde en ella. Los contactos que añade los ve también el equipo de CJ, para poder ayudarle; las notas, solo si decide compartirlas.',
            'Mi reforma: presupuestos, plan de pagos, pagos y justificantes, extras, fotos de avances, elecciones de productos, repasos, planos y conversaciones con los profesionales de su obra.',
            'Firma del presupuesto: su firma dibujada, el nombre con el que firma y una foto de su documento de identidad (pasaporte, DNI o NIE), que se pide para identificar a quien firma.',
            'Eventos y pedidos: las solicitudes de reserva de eventos (personas, teléfono y comentario) y los pedidos de comida (platos, importe, teléfono, dirección de entrega si la hay y comentario).',
            'Social: los planes y recomendaciones que publica (con sus fotos), los planes a los que se apunta, sus mensajes con otras familias y la foto de perfil de su casa o familia, si decide subirla (la ven los demás clientes en Social).',
            'Datos técnicos de acceso necesarios para iniciar sesión de forma segura (por ejemplo, fecha del último acceso y dirección IP), gestionados por nuestro proveedor tecnológico.',
          ],
        },
        {
          title: '3. Para qué los usamos',
          paragraphs: [
            'Dar acceso privado a CJ Club a los clientes de CJ y mostrarles su información personalizada.',
            'Facilitar el contacto con profesionales de confianza y con su agente de CJ.',
            'Gestionar las ventajas y descuentos de negocios colaboradores y conocer cuántas veces se utilizan, para mejorar estos acuerdos.',
            'Conocer cuántos clientes usan el botón de reserva de cada restaurante, para mostrar a esos restaurantes el interés que generan, sin comunicar nombres.',
            'Gestionar su reforma con los profesionales que la realizan y dejar constancia del presupuesto firmado y de la identidad de quien lo firma.',
            'Tramitar sus reservas de eventos y pedidos de comida con el negocio que ha elegido.',
            'No utilizamos sus datos para publicidad ni elaboramos perfiles con fines comerciales. [Revisar.]',
          ],
        },
        {
          title: '4. Base jurídica',
          paragraphs: [
            '[A completar por el abogado: por ejemplo, la ejecución de la relación de servicios con el cliente y el interés legítimo de CJ en ofrecer servicios complementarios.]',
          ],
        },
        {
          title: '5. Destinatarios y ubicación de los datos',
          paragraphs: [
            'Los negocios colaboradores solo reciben sus datos cuando usted lo decide: al pedir reserva para un evento o hacer un pedido, el negocio recibe en su panel y por correo el nombre con el que reserva, el teléfono, el número de personas o los platos, la dirección de entrega si la hay y su comentario. El resto de sus datos no se comparte con ellos.',
            'En Social, lo que publica lo ven todos los clientes de CJ Club junto al nombre de su familia. Los mensajes con otra familia son privados: solo los ven las dos familias, no CJ. Comparta su teléfono u otros datos solo si lo desea.',
            'Si pulsa «Traducir» en una publicación o un mensaje de Social, ese texto se envía al servicio de traducción de Google (Google Cloud Translation, de Google Ireland Limited, como encargado del tratamiento) para traducirlo a su idioma. Solo se envía el texto, sin su nombre ni otros datos. Las traducciones de las publicaciones se guardan para no repetirlas; las de los mensajes privados no se guardan.',
            'En Mi reforma, cada profesional (constructor, electricista, arquitecto…) solo ve la obra en la que trabaja. Los arquitectos y diseñadores no ven los importes. La foto de su documento de identidad solo la ven usted y el equipo de CJ, nunca la otra parte del contrato.',
            'Los datos se alojan en Google Firebase (Google Ireland Limited), que actúa como encargado del tratamiento, en servidores de la Unión Europea (Madrid, España).',
            '[A completar: posibles transferencias internacionales por parte del proveedor y garantías aplicables, como las cláusulas contractuales tipo.]',
          ],
        },
        {
          title: '6. Cuánto tiempo los conservamos',
          paragraphs: [
            'Mientras sea cliente de CJ Club y, después, durante [plazo] o el tiempo necesario para cumplir obligaciones legales.',
            'La foto del documento de identidad se conserva junto al presupuesto firmado mientras pueda ser necesaria como prueba de la firma: [plazo a fijar por el abogado]. Al dar de baja a un cliente se borran sus reformas, con sus archivos, firmas y documentos.',
          ],
        },
        {
          title: '7. Sus derechos',
          paragraphs: [
            'Puede solicitar el acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de sus datos escribiendo a [correo de contacto para privacidad].',
            'Si considera que no hemos tratado sus datos correctamente, puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).',
          ],
        },
        {
          title: '8. Almacenamiento en su dispositivo',
          paragraphs: [
            'La app no usa cookies de publicidad ni de analítica. Solo guarda en su dispositivo lo imprescindible para funcionar: la sesión iniciada, el idioma elegido y los archivos que permiten abrirla como aplicación. [Revisar.]',
          ],
        },
        {
          title: '9. Seguridad',
          paragraphs: [
            'Solo pueden entrar las personas invitadas por CJ. Cada cliente solo puede ver su propia información y los profesionales asignados a él. Las comunicaciones están cifradas.',
          ],
        },
      ],
    },
    legal: {
      title: 'Aviso legal',
      updated: 'Última actualización: [fecha]',
      sections: [
        {
          title: '1. Titular',
          paragraphs: [
            `En cumplimiento de la Ley 34/2002 (LSSI), se informa de que CJ Club es una aplicación de ${company.es}, con NIF [NIF], domicilio en [dirección completa], correo electrónico [correo] y teléfono [teléfono].`,
            'Datos registrales: [Registro Mercantil, tomo, folio, hoja].',
            '[Si procede: número de inscripción en el Registro de Agentes de Intermediación Inmobiliaria de la Comunitat Valenciana.]',
          ],
        },
        {
          title: '2. Objeto y acceso',
          paragraphs: [
            'CJ Club es un servicio privado para clientes de CJ: guía de contactos de confianza, recomendaciones, descuentos, eventos y pedidos en negocios colaboradores, y seguimiento de reformas.',
            'El acceso es solo por invitación. Las credenciales son personales y el usuario se compromete a no compartirlas.',
          ],
        },
        {
          title: '3. Recomendaciones y descuentos de terceros',
          paragraphs: [
            'Los profesionales, lugares y descuentos que aparecen en la app los ofrecen terceros independientes. CJ los recomienda de buena fe, pero no es responsable de los servicios que presten. Los descuentos dependen de las condiciones de cada negocio y pueden cambiar o retirarse.',
            'Los eventos, las cartas, los platos y sus precios los publica cada negocio, que es el responsable de su contenido. Las reservas y los pedidos se confirman y se pagan directamente al negocio; CJ no cobra ni interviene en el pago.',
            '[Revisar por el abogado.]',
          ],
        },
        {
          title: '4. Propiedad intelectual',
          paragraphs: [
            'La marca CJ, el logotipo, los textos y el diseño de la app pertenecen a su titular o se usan con autorización. No pueden reproducirse sin permiso.',
          ],
        },
        {
          title: '5. Legislación aplicable',
          paragraphs: ['Este aviso se rige por la legislación española. [Juzgados y tribunales competentes.]'],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy policy',
      updated: 'Last updated: [date]',
      sections: [
        {
          title: '1. Data controller',
          paragraphs: [
            `${company.en}, tax ID [NIF], registered address [full address], email [privacy contact email].`,
            '[If applicable: contact details of the Data Protection Officer.]',
          ],
        },
        {
          title: '2. What data we process',
          paragraphs: [
            'Identification and contact data: family name and email address.',
            'Data about your relationship with CJ: property, client since date, membership number, assigned agent and recommended professionals (lawyer, gestoría, maintenance, etc.).',
            'App preferences: language and places saved as favourites.',
            'Use of discounts: which discount was shown in the app and on what date.',
            'Restaurant reservations: which restaurant you opened with the Book button, on what date, and whether you said you got a table. Restaurants are only shown monthly totals, never names.',
            'Messages and requests you send to CJ from the app, and the notes and personal contacts you save in it. The CJ team can also see the contacts you add, so they can help you; your notes only if you choose to share them.',
            'My renovation: budgets, payment plan, payments and receipts, extras, progress photos, product choices, snags, plans and conversations with the professionals working on your property.',
            'Budget signature: your drawn signature, the name you sign with and a photo of your identity document (passport, DNI or NIE), requested to identify the signer.',
            'Events and orders: event booking requests (number of people, phone and comment) and food orders (dishes, amount, phone, delivery address if any and comment).',
            'Social: the plans and recommendations you post (with their photos), the plans you join, your messages with other families and the profile photo of your home or family, if you choose to upload one (other clients see it in Social).',
            'Technical access data needed to sign in securely (for example, date of last sign-in and IP address), handled by our technology provider.',
          ],
        },
        {
          title: '3. Why we use it',
          paragraphs: [
            'To give CJ clients private access to CJ Club and show them their personalised information.',
            'To make it easy to contact trusted professionals and your CJ agent.',
            'To manage benefits and discounts from partner businesses and know how often they are used, in order to improve these agreements.',
            'To know how many clients use each restaurant’s booking button, so those restaurants can see the interest they generate, without sharing names.',
            'To manage your renovation with the professionals carrying it out and keep a record of the signed budget and of who signed it.',
            'To process your event bookings and food orders with the business you choose.',
            'We do not use your data for advertising or build commercial profiles. [To be reviewed.]',
          ],
        },
        {
          title: '4. Legal basis',
          paragraphs: [
            "[To be completed by the lawyer: for example, the performance of the services relationship with the client and CJ's legitimate interest in offering complementary services.]",
          ],
        },
        {
          title: '5. Recipients and data location',
          paragraphs: [
            'Partner businesses only receive your data when you decide so: when you request an event booking or place an order, the business receives in its panel and by email the name you book under, your phone, the number of people or the dishes, the delivery address if any and your comment. The rest of your data is not shared with them.',
            'In Social, what you post is visible to all CJ Club clients with your family name. Messages with another family are private: only the two families see them, not CJ. Share your phone or other details only if you wish.',
            'If you tap “Translate” on a Social post or message, that text is sent to Google’s translation service (Google Cloud Translation, by Google Ireland Limited, as data processor) to translate it into your language. Only the text is sent, without your name or other details. Translations of posts are stored so they are not repeated; translations of private messages are not stored.',
            'In My renovation, each professional (builder, electrician, architect…) only sees the project they work on. Architects and designers do not see amounts. The photo of your identity document is only seen by you and the CJ team, never by the other party to the contract.',
            'Data is hosted on Google Firebase (Google Ireland Limited), acting as data processor, on servers in the European Union (Madrid, Spain).',
            '[To be completed: possible international transfers by the provider and the applicable safeguards, such as standard contractual clauses.]',
          ],
        },
        {
          title: '6. How long we keep it',
          paragraphs: [
            'While you are a CJ Club client and afterwards for [period] or as long as required by law.',
            'The photo of your identity document is kept with the signed budget while it may be needed as proof of the signature: [period to be set by the lawyer]. When a client is removed, their renovations are deleted together with their files, signatures and documents.',
          ],
        },
        {
          title: '7. Your rights',
          paragraphs: [
            'You can request access, rectification, erasure, objection, restriction of processing and portability of your data by writing to [privacy contact email].',
            'If you believe we have not handled your data properly, you can lodge a complaint with the Spanish Data Protection Agency (www.aepd.es).',
          ],
        },
        {
          title: '8. Storage on your device',
          paragraphs: [
            'The app does not use advertising or analytics cookies. It only stores what is strictly necessary on your device: your session, your chosen language and the files that let it open as an app. [To be reviewed.]',
          ],
        },
        {
          title: '9. Security',
          paragraphs: [
            'Only people invited by CJ can sign in. Each client can only see their own information and the professionals assigned to them. Communications are encrypted.',
          ],
        },
      ],
    },
    legal: {
      title: 'Legal notice',
      updated: 'Last updated: [date]',
      sections: [
        {
          title: '1. Owner',
          paragraphs: [
            `In accordance with Spanish Law 34/2002 (LSSI), CJ Club is an app owned by ${company.en}, tax ID [NIF], registered address [full address], email [email] and telephone [phone].`,
            'Registry details: [Commercial Registry, volume, folio, sheet].',
            '[If applicable: registration number in the Valencian Community Register of Real Estate Agents.]',
          ],
        },
        {
          title: '2. Purpose and access',
          paragraphs: [
            'CJ Club is a private service for CJ clients: a guide to trusted contacts, recommendations, discounts, events and orders at partner businesses, and renovation tracking.',
            'Access is by invitation only. Login details are personal and must not be shared.',
          ],
        },
        {
          title: '3. Third-party recommendations and discounts',
          paragraphs: [
            'The professionals, places and discounts shown in the app are offered by independent third parties. CJ recommends them in good faith but is not responsible for the services they provide. Discounts depend on each business’s conditions and may change or be withdrawn.',
            'Events, menus, dishes and prices are published by each business, which is responsible for their content. Bookings and orders are confirmed by and paid directly to the business; CJ does not charge or take part in the payment.',
            '[To be reviewed by the lawyer.]',
          ],
        },
        {
          title: '4. Intellectual property',
          paragraphs: [
            'The CJ brand, logo, texts and app design belong to their owner or are used with permission. They may not be reproduced without authorisation.',
          ],
        },
        {
          title: '5. Applicable law',
          paragraphs: ['This notice is governed by Spanish law. [Competent courts.] In case of discrepancy, the Spanish version prevails.'],
        },
      ],
    },
  },
}

export function legalDoc(lang: Language, key: LegalPageKey): LegalDoc {
  return legal[lang]?.[key] ?? legal.en[key]
}
