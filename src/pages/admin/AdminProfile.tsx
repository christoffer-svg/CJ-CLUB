import { Link, useParams } from 'react-router-dom'
import { PageTitle } from '../../components/admin/AdminLayout'
import ProfileEditor from '../../components/ProfileEditor'
import { useLiveDoc } from '../../lib/admin'
import { profileOf, type ProfileCollection } from '../../lib/profiles'
import type { Partner, Place } from '../../lib/types'

/** Presentación de un lugar (negocio de Descubrir) o de un colaborador de servicios, editada por CJ */
export default function AdminProfile({ coll }: { coll: ProfileCollection }) {
  const { id = '' } = useParams()
  const item = useLiveDoc<Place | Partner>(`${coll}/${id}`)
  const back = coll === 'places' ? '/admin/lugares' : '/admin/colaboradores'
  return (
    <>
      <Link to={back} className="a-link">
        ‹ Volver
      </Link>
      <PageTitle eyebrow={coll === 'places' ? 'Lugares · Presentación' : 'Colaboradores · Presentación'} title={item.data?.name ?? '…'} />
      {item.loading ? null : !item.data ? (
        <p className="a-empty">No existe.</p>
      ) : (
        <ProfileEditor
          key={id}
          coll={coll}
          id={id}
          value={profileOf(item.data)}
          withPhone={coll === 'places'}
          audience={
            coll === 'places'
              ? 'Es lo que ve el cliente al pinchar en este lugar en Descubrir. Si el negocio tiene acceso al panel, también la puede cambiar él.'
              : 'Es lo que ve el cliente al pinchar en este colaborador en su Guía (solo los clientes que lo tienen asignado). El teléfono es el de la ficha.'
          }
        />
      )}
    </>
  )
}
