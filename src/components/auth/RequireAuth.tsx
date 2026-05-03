import { Navigate, Outlet, useLocation } from 'react-router'
import useAuthStore from '../../stores/authStore'
import { useCrossTabLogout } from '../../hooks/useCrossTabLogout'

export default function RequireAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()

  // Đồng bộ đăng xuất giữa các tab trên cùng thiết bị
  useCrossTabLogout()

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
