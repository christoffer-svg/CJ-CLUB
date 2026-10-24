import { Link, Outlet, useParams } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import { useLiveDoc } from '../../lib/admin'
import type { Client } from '../../lib/types'
import { PreviewViewer } from '../../lib/viewer'

/** "Ver como cliente": la app tal como la ve el cliente, en solo lectura */
export default function ClientPreview() {
  const { id = '' } = useParams()
  const client = useLiveDoc<Client>(`clients/${id}`)
  return (
    <PreviewViewer clientId={id}>
      <div className="preview-bar">
        <span>Vista previa · {client.data?.familyName ?? ''}</span>
        <Link to={`/admin/clientes/${id}`}>Volver al panel</Link>
      </div>
      <Outlet />
      <BottomNav />
    </PreviewViewer>
  )
}
