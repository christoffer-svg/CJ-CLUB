import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RequireRole } from './auth/guards'
import Layout from './components/Layout'
import AdminLayout from './components/admin/AdminLayout'
import { ClientViewer } from './lib/viewer'
import Login from './pages/Login'
import Home from './pages/Home'
import Guide from './pages/Guide'
import Discover from './pages/Discover'
import Benefits from './pages/Benefits'
import AdminHome from './pages/admin/AdminHome'
import Clients from './pages/admin/Clients'
import ClientNew from './pages/admin/ClientNew'
import ClientDetail from './pages/admin/ClientDetail'
import ClientPreview from './pages/admin/ClientPreview'
import Partners from './pages/admin/Partners'
import GeneralContacts from './pages/admin/GeneralContacts'
import Places from './pages/admin/Places'
import Deals from './pages/admin/Deals'
import Tip from './pages/admin/Tip'

export default function App() {
  const { pathname } = useLocation()
  // El panel usa más ancho en ordenador; la vista previa del cliente mantiene el ancho de móvil
  const wide = pathname.startsWith('/admin') && !pathname.includes('/vista')

  return (
    <div className={wide ? 'app-frame app-frame--wide' : 'app-frame'}>
      <Routes>
        <Route path="/acceso" element={<Login />} />
        <Route element={<RequireRole role="client" />}>
          <Route
            element={
              <ClientViewer>
                <Layout />
              </ClientViewer>
            }
          >
            <Route index element={<Home />} />
            <Route path="guia" element={<Guide />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="ventajas" element={<Benefits />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="admin" />}>
          <Route path="admin/clientes/:id/vista" element={<ClientPreview />}>
            <Route index element={<Home />} />
            <Route path="guia" element={<Guide />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="ventajas" element={<Benefits />} />
          </Route>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="clientes/nuevo" element={<ClientNew />} />
            <Route path="clientes/:id" element={<ClientDetail />} />
            <Route path="colaboradores" element={<Partners />} />
            <Route path="contactos" element={<GeneralContacts />} />
            <Route path="lugares" element={<Places />} />
            <Route path="descuentos" element={<Deals />} />
            <Route path="consejo" element={<Tip />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
