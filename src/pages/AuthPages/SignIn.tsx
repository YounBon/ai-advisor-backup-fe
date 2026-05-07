import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router'
import axios from 'axios'
import { toast } from 'sonner'
import { viApiError, viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '../../components/common/PageMeta'
import AuthLayout from './AuthPageLayout'
import SignInForm from '../../components/auth/SignInFormAuth'
import { authService } from '../../services/AuthService'
import useAuthStore from '../../stores/authStore'

function resolvePostLoginPath(role: string | undefined, from: string) {
  const home =
    role === 'STUDENT' ? '/student'
      : role === 'ADVISOR' ? '/advisor'
        : (role === 'ADMIN' || role === 'FACULTY') ? '/dashboard'
          : '/'
  // Nếu from là trang gốc, trang signin, hoặc không có → về home của role
  if (!from || from === '/' || from === '/signin') return home
  if (role === 'STUDENT' && !from.startsWith('/student')) return '/student'
  if (role === 'ADVISOR' && !from.startsWith('/advisor')) return '/advisor'
  if ((role === 'ADMIN' || role === 'FACULTY') && (from.startsWith('/student') || from.startsWith('/advisor'))) return '/dashboard'
  return from
}

function resolvePostLoginTitle(role: string | undefined) {
  if (role === 'STUDENT') return 'Dashboard sinh viên | Advisor'
  if (role === 'ADVISOR') return 'Tổng quan cố vấn | Advisor'
  if (role === 'ADMIN' || role === 'FACULTY') return 'Quản trị | AI-Advisor'
  return 'AI-Advisor'
}

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    typeof (location.state as { from?: string } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : '/'

  const login = useAuthStore(s => s.login)
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Chờ hydration xong mới kiểm tra — tránh flash dashboard
  if (!hasHydrated) {
    return null
  }

  // Nếu đã đăng nhập rồi thì redirect thẳng, không render form
  if (isAuthenticated && user) {
    return <Navigate to={resolvePostLoginPath(user.role, from)} replace />
  }

  const handleSignIn = async (email: string, password: string) => {
    setIsSubmitting(true)
    try {
      const res = await authService.login({ email, password })
      const payload = res.data as AuthLoginPayload
      login(payload.user, payload.access_token, payload.refresh_token)
      toast.success(viApiMessage(res.message, 'Đăng nhập thành công'))
      document.title = resolvePostLoginTitle(payload.user?.role)
      navigate(resolvePostLoginPath(payload.user?.role, from), { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string })?.message
        toast.error(viApiError(msg, 'Đăng nhập thất bại'))
      } else {
        toast.error('Đăng nhập thất bại')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageMeta title="Đăng nhập | Advisor" description="Đăng nhập để vào bảng điều khiển" />
      <AuthLayout>
        <SignInForm onSignIn={handleSignIn} isSubmitting={isSubmitting} />
      </AuthLayout>
    </>
  )
}
