import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from './auth/guards'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Guide from './pages/Guide'
import Discover from './pages/Discover'
import Benefits from './pages/Benefits'
import AdminHome from './pages/admin/AdminHome'

export default function App() {
  return (
    <div className="app-frame">
      <Routes>
        <Route path="/acceso" element={<Login />} />
        <Route element={<RequireRole role="client" />}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="guia" element={<Guide />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="ventajas" element={<Benefits />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="admin" />}>
          <Route path="admin" element={<AdminHome />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
