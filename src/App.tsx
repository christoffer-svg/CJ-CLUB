import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RequireRole } from './auth/guards'
import Layout from './components/Layout'
import AdminLayout from './components/admin/AdminLayout'
import { ClientViewer } from './lib/viewer'
import Login from './pages/Login'
import Legal from './pages/Legal'
import Home from './pages/Home'
import Guide from './pages/Guide'
import Discover from './pages/Discover'
import Benefits from './pages/Benefits'
import Projects from './pages/Projects'
import BuilderLayout from './pages/builder/BuilderLayout'
import BuilderProjects from './pages/builder/BuilderProjects'
import DesignerLayout from './pages/designer/DesignerLayout'
import DesignerProjects from './pages/designer/DesignerProjects'
import Builders from './pages/admin/Builders'
import { AdminProject, AdminProjects } from './pages/admin/AdminProjects'
import Messages from './pages/Messages'
import Requests from './pages/Requests'
import House from './pages/House'
import AdminHome from './pages/admin/AdminHome'
import Clients from './pages/admin/Clients'
import ClientNew from './pages/admin/ClientNew'
import ClientDetail from './pages/admin/ClientDetail'
import ClientPreview from './pages/admin/ClientPreview'
import Partners from './pages/admin/Partners'
import GeneralContacts from './pages/admin/GeneralContacts'
import Places from './pages/admin/Places'
import AdminProfile from './pages/admin/AdminProfile'
import PlaceDetail from './pages/PlaceDetail'
import OrderPage from './pages/OrderPage'
import PartnerDetail from './pages/PartnerDetail'
import BusinessProfile from './pages/business/BusinessProfile'
import BusinessEvents from './pages/business/BusinessEvents'
import AdminEvents from './pages/admin/AdminEvents'
import AdminServices from './pages/admin/AdminServices'
import BusinessOrders from './pages/business/BusinessOrders'
import AdminOrders from './pages/admin/AdminOrders'
import Deals from './pages/admin/Deals'
import Businesses from './pages/admin/Businesses'
import BusinessLayout from './pages/business/BusinessLayout'
import BusinessDeals from './pages/business/BusinessDeals'
import BusinessReservations from './pages/business/BusinessReservations'
import Tip from './pages/admin/Tip'
import Summary from './pages/admin/Summary'
import Reservations from './pages/admin/Reservations'
import AdminMessages from './pages/admin/AdminMessages'
import AdminThread from './pages/admin/AdminThread'
import AdminRequests from './pages/admin/AdminRequests'

export default function App() {
  const { pathname } = useLocation()
  // El panel usa más ancho en ordenador; la vista previa del cliente mantiene el ancho de móvil
  const wide = (pathname.startsWith('/admin') && !pathname.includes('/vista')) || pathname.startsWith('/negocio') || pathname.startsWith('/obra') || pathname.startsWith('/estudio')

  return (
    <div className={wide ? 'app-frame app-frame--wide' : 'app-frame'}>
      <Routes>
        <Route path="/acceso" element={<Login />} />
        <Route path="/privacidad" element={<Legal page="privacy" />} />
        <Route path="/aviso-legal" element={<Legal page="legal" />} />
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
            <Route path="guia/:partnerId" element={<PartnerDetail />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="descubrir/:placeId" element={<PlaceDetail />} />
            <Route path="descubrir/:placeId/pedido" element={<OrderPage />} />
            <Route path="ventajas" element={<Benefits />} />
            <Route path="mensajes" element={<Messages />} />
            <Route path="peticiones" element={<Requests />} />
            <Route path="reformas" element={<Projects />} />
            <Route path="reformas/:id" element={<Projects />} />
            <Route path="casa" element={<House />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="admin" />}>
          <Route path="admin/clientes/:id/vista" element={<ClientPreview />}>
            <Route index element={<Home />} />
            <Route path="guia" element={<Guide />} />
            <Route path="guia/:partnerId" element={<PartnerDetail />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="descubrir/:placeId" element={<PlaceDetail />} />
            <Route path="descubrir/:placeId/pedido" element={<OrderPage />} />
            <Route path="ventajas" element={<Benefits />} />
            <Route path="mensajes" element={<Messages />} />
            <Route path="peticiones" element={<Requests />} />
            <Route path="reformas" element={<Projects />} />
            <Route path="reformas/:id" element={<Projects />} />
            <Route path="casa" element={<House />} />
          </Route>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="resumen" element={<Summary />} />
            <Route path="reservas" element={<Reservations />} />
            <Route path="mensajes" element={<AdminMessages />} />
            <Route path="mensajes/:clientId" element={<AdminThread />} />
            <Route path="peticiones" element={<AdminRequests />} />
            <Route path="servicios" element={<AdminServices />} />
            <Route path="reformas" element={<AdminProjects />} />
            <Route path="reformas/:id" element={<AdminProject />} />
            <Route path="constructores" element={<Builders />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="clientes/nuevo" element={<ClientNew />} />
            <Route path="clientes/:id" element={<ClientDetail />} />
            <Route path="colaboradores" element={<Partners />} />
            <Route path="colaboradores/:id/presentacion" element={<AdminProfile coll="partners" />} />
            <Route path="contactos" element={<GeneralContacts />} />
            <Route path="lugares" element={<Places />} />
            <Route path="lugares/:id/presentacion" element={<AdminProfile coll="places" />} />
            <Route path="negocios" element={<Businesses />} />
            <Route path="descuentos" element={<Deals />} />
            <Route path="eventos" element={<AdminEvents />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="consejo" element={<Tip />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="builder" />}>
          <Route path="obra" element={<BuilderLayout />}>
            <Route index element={<BuilderProjects />} />
            <Route path=":id" element={<BuilderProjects />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="designer" />}>
          <Route path="estudio" element={<DesignerLayout />}>
            <Route index element={<DesignerProjects />} />
            <Route path=":id" element={<DesignerProjects />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="business" />}>
          <Route path="negocio" element={<BusinessLayout />}>
            <Route index element={<BusinessDeals />} />
            <Route path="reservas" element={<BusinessReservations />} />
            <Route path="presentacion" element={<BusinessProfile />} />
            <Route path="eventos" element={<BusinessEvents />} />
            <Route path="pedidos" element={<BusinessOrders />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
