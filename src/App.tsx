import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { RequireRole, Splash } from './auth/guards'
import Layout from './components/Layout'
import { ClientViewer } from './lib/viewer'
import Login from './pages/Login'
import SetPassword from './pages/SetPassword'
import NotFound from './pages/NotFound'
import JoinRequest from './pages/JoinRequest'
import Legal from './pages/Legal'

// Cada pantalla se descarga cuando se abre (la de acceso, enseguida): la app arranca más rápido
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const PartnerPanel = lazy(() => import('./pages/partner/PartnerPanel'))
const AdminJoinRequests = lazy(() => import('./pages/admin/AdminJoinRequests'))
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam'))
const Home = lazy(() => import('./pages/Home'))
const Guide = lazy(() => import('./pages/Guide'))
const Discover = lazy(() => import('./pages/Discover'))
const Benefits = lazy(() => import('./pages/Benefits'))
const Projects = lazy(() => import('./pages/Projects'))
const BuilderLayout = lazy(() => import('./pages/builder/BuilderLayout'))
const BuilderProjects = lazy(() => import('./pages/builder/BuilderProjects'))
const DesignerLayout = lazy(() => import('./pages/designer/DesignerLayout'))
const DesignerProjects = lazy(() => import('./pages/designer/DesignerProjects'))
const Builders = lazy(() => import('./pages/admin/Builders'))
const AdminProject = lazy(() => import('./pages/admin/AdminProjects').then((m) => ({ default: m.AdminProject })))
const AdminProjects = lazy(() => import('./pages/admin/AdminProjects').then((m) => ({ default: m.AdminProjects })))
const Messages = lazy(() => import('./pages/Messages'))
const Requests = lazy(() => import('./pages/Requests'))
const House = lazy(() => import('./pages/House'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const Clients = lazy(() => import('./pages/admin/Clients'))
const ClientNew = lazy(() => import('./pages/admin/ClientNew'))
const ClientDetail = lazy(() => import('./pages/admin/ClientDetail'))
const ClientPreview = lazy(() => import('./pages/admin/ClientPreview'))
const Partners = lazy(() => import('./pages/admin/Partners'))
const GeneralContacts = lazy(() => import('./pages/admin/GeneralContacts'))
const Places = lazy(() => import('./pages/admin/Places'))
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'))
const PlaceDetail = lazy(() => import('./pages/PlaceDetail'))
const OrderPage = lazy(() => import('./pages/OrderPage'))
const PartnerDetail = lazy(() => import('./pages/PartnerDetail'))
const BusinessProfile = lazy(() => import('./pages/business/BusinessProfile'))
const BusinessEvents = lazy(() => import('./pages/business/BusinessEvents'))
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'))
const AdminServices = lazy(() => import('./pages/admin/AdminServices'))
const AdminSocial = lazy(() => import('./pages/admin/AdminSocial'))
const Social = lazy(() => import('./pages/social/Social'))
const SocialEdit = lazy(() => import('./pages/social/SocialEdit'))
const SocialChatPage = lazy(() => import('./pages/social/SocialChatPage'))
const SocialPostPage = lazy(() => import('./pages/social/SocialPostPage'))
const SpotEdit = lazy(() => import('./pages/social/SpotEdit'))
const BusinessOrders = lazy(() => import('./pages/business/BusinessOrders'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const Deals = lazy(() => import('./pages/admin/Deals'))
const Businesses = lazy(() => import('./pages/admin/Businesses'))
const BusinessLayout = lazy(() => import('./pages/business/BusinessLayout'))
const BusinessDeals = lazy(() => import('./pages/business/BusinessDeals'))
const BusinessReservations = lazy(() => import('./pages/business/BusinessReservations'))
const Tip = lazy(() => import('./pages/admin/Tip'))
const Summary = lazy(() => import('./pages/admin/Summary'))
const Reservations = lazy(() => import('./pages/admin/Reservations'))
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'))
const AdminThread = lazy(() => import('./pages/admin/AdminThread'))
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'))

export default function App() {
  const { pathname } = useLocation()
  // El panel usa más ancho en ordenador; la vista previa del cliente mantiene el ancho de móvil
  const wide =
    (pathname.startsWith('/admin') && !pathname.includes('/vista')) ||
    pathname.startsWith('/negocio') ||
    pathname.startsWith('/colaborador') ||
    pathname.startsWith('/obra') ||
    pathname.startsWith('/estudio')

  return (
    <div className={wide ? 'app-frame app-frame--wide' : 'app-frame'}>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/acceso" element={<Login />} />
          <Route path="/contrasena" element={<SetPassword />} />
          <Route path="/unirse" element={<JoinRequest />} />
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
              <Route path="social" element={<Social />} />
              <Route path="social/nuevo" element={<SocialEdit />} />
              <Route path="social/sitio/nuevo" element={<SpotEdit />} />
              <Route path="social/chat/:chatId" element={<SocialChatPage />} />
              <Route path="social/:postId" element={<SocialPostPage />} />
              <Route path="social/:postId/editar" element={<SocialEdit />} />
              <Route path="mensajes" element={<Messages />} />
              <Route path="peticiones" element={<Requests />} />
              <Route path="reformas" element={<Projects />} />
              <Route path="reformas/:id" element={<Projects />} />
              <Route path="casa" element={<House />} />
            </Route>
          </Route>
          <Route element={<RequireRole role={['admin', 'editor']} />}>
            <Route path="admin/clientes/:id/vista" element={<ClientPreview />}>
              <Route index element={<Home />} />
              <Route path="guia" element={<Guide />} />
              <Route path="guia/:partnerId" element={<PartnerDetail />} />
              <Route path="descubrir" element={<Discover />} />
              <Route path="descubrir/:placeId" element={<PlaceDetail />} />
              <Route path="descubrir/:placeId/pedido" element={<OrderPage />} />
              <Route path="ventajas" element={<Benefits />} />
              <Route path="social" element={<Social />} />
              <Route path="social/nuevo" element={<SocialEdit />} />
              <Route path="social/sitio/nuevo" element={<SpotEdit />} />
              <Route path="social/chat/:chatId" element={<SocialChatPage />} />
              <Route path="social/:postId" element={<SocialPostPage />} />
              <Route path="social/:postId/editar" element={<SocialEdit />} />
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
              <Route path="social" element={<AdminSocial />} />
              <Route path="reformas" element={<AdminProjects />} />
              <Route path="reformas/:id" element={<AdminProject />} />
              <Route path="constructores" element={<Builders />} />
              <Route path="clientes" element={<Clients />} />
              <Route path="clientes/nuevo" element={<ClientNew />} />
              <Route path="solicitudes" element={<AdminJoinRequests />} />
              <Route path="equipo" element={<AdminTeam />} />
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
          <Route element={<RequireRole role="partner" />}>
            <Route path="colaborador" element={<PartnerPanel />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  )
}
