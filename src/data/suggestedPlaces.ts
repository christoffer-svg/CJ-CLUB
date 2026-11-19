/**
 * Listas de lugares preparadas por CJ: se añaden a la app con un botón en el panel (Lugares).
 * Ubicaciones y direcciones de OpenStreetMap; webs comprobadas en noviembre de 2026.
 * Los demás idiomas se traducen solos al guardarlos.
 */
import type { GeoPoint } from '../lib/types'

export type SuggestedPlace = {
  id: string
  name: string
  meta_es: string
  meta_en: string
  cjNote_es: string
  cjNote_en: string
  address: string
  website: string
  location: GeoPoint
}

export type SuggestedList = {
  id: string
  title: string
  description: string
  category: { id: string; name_es: string; name_en: string; order: number }
  places: SuggestedPlace[]
}

const mall = (p: SuggestedPlace) => p

export const suggestedLists: SuggestedList[] = [
  {
    id: 'centros-comerciales-denia-murcia',
    title: 'Centros comerciales de Dénia a Murcia',
    description: 'Los principales centros comerciales entre Dénia y Murcia, con dirección, web y ubicación en el mapa.',
    category: { id: 'centros-comerciales', name_es: 'Centros comerciales', name_en: 'Shopping centres', order: 50 },
    places: [
      mall({
        id: 'cc-portal-de-la-marina',
        name: 'Portal de la Marina',
        meta_es: 'Ondara · Moda, hogar y restauración',
        meta_en: 'Ondara · Fashion, home and dining',
        cjNote_es: 'El gran centro comercial de la Marina Alta, a pocos minutos de Dénia.',
        cjNote_en: 'The main shopping centre of the Marina Alta, a few minutes from Dénia.',
        address: 'Avinguda Costa Blanca, 03760 Ondara',
        website: 'https://www.portaldelamarina.org/',
        location: { lat: 38.8179528, lng: 0.0224739 },
      }),
      mall({
        id: 'cc-la-marina-finestrat',
        name: 'La Marina',
        meta_es: 'Finestrat · Junto a Benidorm',
        meta_en: 'Finestrat · Next to Benidorm',
        cjNote_es: 'El centro comercial de referencia de la zona de Benidorm, con aparcamiento amplio.',
        cjNote_en: 'The go-to shopping centre around Benidorm, with plenty of parking.',
        address: 'Avinguda del País Valencià, 2, 03509 Finestrat',
        website: 'https://cclamarina.com/es/',
        location: { lat: 38.5389146, lng: -0.1759949 },
      }),
      mall({
        id: 'cc-gran-via-alicante',
        name: 'Gran Vía',
        meta_es: 'Alicante · Norte de la ciudad',
        meta_en: 'Alicante · North of the city',
        cjNote_es: 'Uno de los centros comerciales más grandes de Alicante, con tiendas, restaurantes y ocio.',
        cjNote_en: 'One of the largest shopping centres in Alicante, with shops, restaurants and leisure.',
        address: 'Carrer de José García Sellés, 2, 03015 Alicante',
        website: 'https://www.ccgranvia.com/',
        location: { lat: 38.3670339, lng: -0.4690369 },
      }),
      mall({
        id: 'cc-plaza-mar-2',
        name: 'Plaza Mar 2',
        meta_es: 'Alicante · Avenida de Dénia',
        meta_en: 'Alicante · Avenida de Dénia',
        cjNote_es: 'A la entrada norte de Alicante por la Avenida de Dénia, cómodo viniendo de la costa.',
        cjNote_en: 'At the northern entrance to Alicante on Avenida de Dénia, handy when coming from the coast.',
        address: 'Avinguda de Dénia, 03016 Alicante',
        website: 'https://www.plazamar2.com/',
        location: { lat: 38.3542769, lng: -0.471947 },
      }),
      mall({
        id: 'cc-puerta-de-alicante',
        name: 'Puerta de Alicante',
        meta_es: 'Alicante · Zona oeste',
        meta_en: 'Alicante · West side',
        cjNote_es: 'Centro comercial en la zona oeste de Alicante, con tiendas y restaurantes.',
        cjNote_en: 'Shopping centre on the west side of Alicante, with shops and restaurants.',
        address: "Polígon Industrial Pla de l'Espartal, 03007 Alicante",
        website: 'https://www.puertadealicante.com/',
        location: { lat: 38.3412286, lng: -0.518084 },
      }),
      mall({
        id: 'cc-panoramis',
        name: 'Panoramis',
        meta_es: 'Alicante · En el puerto',
        meta_en: 'Alicante · In the harbour',
        cjNote_es: 'Tiendas y restaurantes en el puerto de Alicante, junto al mar.',
        cjNote_en: 'Shops and restaurants in Alicante harbour, by the sea.',
        address: 'Avinguda de Perfecto Palacio de la Fuente, 03003 Alicante',
        website: 'https://panoramis.com/',
        location: { lat: 38.3378898, lng: -0.4863699 },
      }),
      mall({
        id: 'cc-laljub-elche',
        name: "L'Aljub",
        meta_es: 'Elche · Moda y ocio',
        meta_en: 'Elche · Fashion and leisure',
        cjNote_es: 'El gran centro comercial de Elche.',
        cjNote_en: 'The main shopping centre in Elche.',
        address: 'Elche (Alicante)',
        website: '',
        location: { lat: 38.2626436, lng: -0.7207248 },
      }),
      mall({
        id: 'cc-habaneras-torrevieja',
        name: 'Habaneras',
        meta_es: 'Torrevieja',
        meta_en: 'Torrevieja',
        cjNote_es: 'El centro comercial de Torrevieja, con tiendas y restaurantes.',
        cjNote_en: 'Torrevieja’s shopping centre, with shops and restaurants.',
        address: 'Avenida Rosa Mazón Valero, 03184 Torrevieja',
        website: 'https://habaneras.es/',
        location: { lat: 37.9900292, lng: -0.6867606 },
      }),
      mall({
        id: 'cc-zenia-boulevard',
        name: 'Zenia Boulevard',
        meta_es: 'Orihuela Costa · Al aire libre',
        meta_en: 'Orihuela Costa · Open-air',
        cjNote_es: 'Uno de los centros comerciales más grandes de la Costa Blanca, al aire libre, junto a La Zenia.',
        cjNote_en: 'One of the largest shopping centres on the Costa Blanca, open-air, next to La Zenia.',
        address: 'La Zenia Boulevard, 03189 Orihuela Costa',
        website: 'https://zeniaboulevard.es/',
        location: { lat: 37.9303776, lng: -0.7359634 },
      }),
      mall({
        id: 'cc-ociopia-orihuela',
        name: 'Ociopía',
        meta_es: 'Orihuela · Compras y ocio',
        meta_en: 'Orihuela · Shopping and leisure',
        cjNote_es: 'Centro comercial y de ocio a las afueras de Orihuela.',
        cjNote_en: 'Shopping and leisure centre on the outskirts of Orihuela.',
        address: 'Calle Salida al Río, 03300 Orihuela',
        website: 'https://ociopia.es/',
        location: { lat: 38.0866422, lng: -0.9529978 },
      }),
      mall({
        id: 'cc-nueva-condomina',
        name: 'Nueva Condomina',
        meta_es: 'Murcia · Norte de la ciudad',
        meta_en: 'Murcia · North of the city',
        cjNote_es: 'Uno de los centros comerciales más grandes de la Región de Murcia.',
        cjNote_en: 'One of the largest shopping centres in the Region of Murcia.',
        address: 'Autovía del Mediterráneo, 30110 Churra (Murcia)',
        website: 'https://nueva-condomina.klepierre.es/',
        location: { lat: 38.0391019, lng: -1.1484893 },
      }),
      mall({
        id: 'cc-thader-murcia',
        name: 'Thader',
        meta_es: 'Murcia · Churra',
        meta_en: 'Murcia · Churra',
        cjNote_es: 'Al norte de Murcia, muy cerca de Nueva Condomina.',
        cjNote_en: 'North of Murcia, very close to Nueva Condomina.',
        address: 'Avenida Princesa Doña Letizia, 30110 Churra (Murcia)',
        website: 'https://www.thader.net/',
        location: { lat: 38.0321347, lng: -1.1492603 },
      }),
      mall({
        id: 'cc-dos-mares',
        name: 'Dos Mares',
        meta_es: 'San Javier · Mar Menor',
        meta_en: 'San Javier · Mar Menor',
        cjNote_es: 'El centro comercial de la zona del Mar Menor.',
        cjNote_en: 'The shopping centre for the Mar Menor area.',
        address: 'Avenida del Pinatar, 30720 San Javier',
        website: 'https://www.dosmaresshopping.com/',
        location: { lat: 37.8200913, lng: -0.8132377 },
      }),
    ],
  },
]
