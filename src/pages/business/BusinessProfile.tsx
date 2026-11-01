import { useOutletContext } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import ProfileEditor from '../../components/ProfileEditor'
import { profileOf } from '../../lib/profiles'
import type { BusinessOutlet } from './BusinessLayout'

/** El negocio presenta su local a los clientes de CJ: fotos, texto, horario y contacto */
export default function BusinessProfile() {
  const { placeName, place, placeId } = useOutletContext<BusinessOutlet>()
  return (
    <>
      <PageTitle eyebrow={placeName} title="Presentación" />
      {place && placeId ? (
        <ProfileEditor
          key={placeId}
          coll="places"
          id={placeId}
          value={profileOf(place)}
          audience="Es lo que ven los clientes de CJ Club al pinchar en su negocio en la app. Añada fotos y cuente qué les hace especiales; si puede, escríbalo también en inglés."
        />
      ) : (
        <p className="a-empty">Cargando…</p>
      )}
    </>
  )
}
