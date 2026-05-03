import useAuthStore from '@/stores/authStore'
import { Navigate, Outlet } from 'react-router'

const homeByRole: Record<string, string> = {
  STUDENT: '/student',
  ADVISOR: '/advisor',
  FACULTY: '/',
  ADMIN: '/',
}

const ProtectRoute = ({ allowedRoles = [] }: { allowedRoles: string[] }) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role || '')) {
    const fallback = homeByRole[user?.role || ''] || '/signin'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}

export default ProtectRoute
