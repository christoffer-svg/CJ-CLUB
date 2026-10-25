import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import ReservePrompt from './ReservePrompt'

export default function Layout() {
  return (
    <>
      <Outlet />
      <ReservePrompt />
      <BottomNav />
    </>
  )
}
