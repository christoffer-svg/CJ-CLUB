import { Link, Outlet, useParams } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import { PreviewLanguage } from '../../i18n'
import { useLiveCollection, useLiveDoc } from '../../lib/admin'
import type { Client, UserProfile } from '../../lib/types'
import { PreviewViewer } from '../../lib/viewer'

/** "Ver como cliente": la app tal como la ve el cliente, en su idioma y en solo lectura */
export default function ClientPreview() {
  const { id = '' } = useParams()
  const client = useLiveDoc<Client>(`clients/${id}`)
  const users = useLiveCollection<UserProfile>('users')
  const language = users.data.find((u) => u.clientId === id)?.language ?? 'es'
  return (
    <PreviewViewer clientId={id}>
      <PreviewLanguage initial={language}>
        <div className="preview-bar">
          <span>Vista previa · {client.data?.familyName ?? ''}</span>
          <Link to={`/admin/clientes/${id}`}>Volver al panel</Link>
        </div>
        <Outlet />
        <BottomNav />
      </PreviewLanguage>
    </PreviewViewer>
  )
}
