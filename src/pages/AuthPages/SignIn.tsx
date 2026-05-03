import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
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
    role === 'STUDENT' ? '/student' : role === 'ADVISOR' ? '/advisor' : '/'
  if (!from || from === '/signin') return home
  if (role === 'STUDENT' && !from.startsWith('/student')) return '/student'
  if (role === 'ADVISOR' && !from.startsWith('/advisor')) return '/advisor'
  if (role !== 'STUDENT' && role !== 'ADVISOR' && from.startsWith('/student')) return '/'
  if ((role === 'FACULTY' || role === 'ADMIN') && from.startsWith('/advisor')) return '/'
  return from
}

function resolvePostLoginTitle(role: string | undefined) {
  if (role === 'STUDENT') return 'Dashboard sinh viên | Advisor'
  if (role === 'ADVISOR') return 'Tổng quan cố vấn | Advisor'
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

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(resolvePostLoginPath(user.role, from), { replace: true })
    }
  }, [isAuthenticated, navigate, user, from])

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
