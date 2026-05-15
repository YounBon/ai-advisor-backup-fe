import { Navigate, Outlet, useLocation } from 'react-router'
import useAuthStore from '../../stores/authStore'
import { useCrossTabLogout } from '../../hooks/useCrossTabLogout'

export default function RequireAuth() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const hasHydrated = useAuthStore(s => s._hasHydrated)
  const location = useLocation()

  useCrossTabLogout()
  if (!hasHydrated) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
