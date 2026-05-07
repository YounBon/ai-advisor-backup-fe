import { Navigate, Outlet, useLocation } from 'react-router'
import useAuthStore from '../../stores/authStore'
import { useCrossTabLogout } from '../../hooks/useCrossTabLogout'

export default function RequireAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const hasHydrated = useAuthStore(s => s._hasHydrated)
  const location = useLocation()

  // Đồng bộ đăng xuất giữa các tab trên cùng thiết bị
  useCrossTabLogout()

  // Chờ Zustand persist hydrate xong từ localStorage
  // để tránh flash dashboard khi chưa xác định được trạng thái auth
  if (!hasHydrated) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
