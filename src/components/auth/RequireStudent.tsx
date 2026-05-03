import { Navigate, Outlet } from 'react-router'
import useAuthStore from '../../stores/authStore'

/** Chỉ STUDENT — các role khác về trang chủ staff */
export default function RequireStudent() {
  const role = useAuthStore(s => s.user?.role)
  if (role !== 'STUDENT') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
