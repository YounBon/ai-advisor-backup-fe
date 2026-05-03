import { Navigate, Outlet } from 'react-router'
import useAuthStore from '../../stores/authStore'

/** Chỉ ADVISOR, FACULTY, ADMIN — sinh viên chuyển sang /student */
export default function RequireStaff() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'STUDENT') {
    return <Navigate to="/student" replace />
  }
  return <Outlet />
}
