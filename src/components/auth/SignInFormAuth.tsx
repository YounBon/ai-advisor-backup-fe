import { FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, EyeCloseIcon, EyeIcon } from '../../icons'
import Label from '../form/Label'
import InputField from '../form/input/InputField'
type SignInFormProps = {
  onSignIn: (email: string, password: string) => Promise<void>
  isSubmitting: boolean
}

export default function SignInForm({ onSignIn, isSubmitting }: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    await onSignIn(email.trim(), password)
  }

  return (
    <div className="flex flex-1 flex-col bg-white px-4 py-10 dark:bg-gray-950 sm:px-8 lg:w-1/2 lg:py-0">
      <div className="mx-auto w-full max-w-md pt-2 sm:pt-6 lg:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white/90"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Về trang chủ
        </Link>
      </div>

      
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-12">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-theme-md dark:border-gray-800 dark:bg-gray-900/60 dark:shadow-none sm:p-8">

          
          <div className="mb-8">
            
            <div className="mb-5 flex items-center gap-3">
              <img src="/images/logo/auth-logo.png" alt="AI-Advisor" width={40} height={40} className="object-contain" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                AI-<span style={{ color: '#E02020' }}>Advisor</span>
              </span>
            </div>

            <h1 className="mb-2 text-balance font-semibold tracking-tight text-gray-900 text-title-sm dark:text-white sm:text-title-md">
              Đăng nhập
            </h1>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Nhập email và mật khẩu được cấp để vào bảng điều khiển.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <Label htmlFor="signin-email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <InputField
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="admin@advisor.local"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="signin-password">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <InputField
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    role="presentation"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: isSubmitting
                      ? '#B01818'
                      : 'linear-gradient(135deg, #E02020, #B01818)',
                    boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(224, 32, 32, 0.35)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <path d="M8 2C4.7 2 2 4.7 2 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Đang đăng nhập…
                    </>
                  ) : (
                    <>
                      Đăng nhập
                      <ArrowRightIcon className="size-[18px] shrink-0" aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
            Tài khoản được cấp bởi quản trị viên hệ thống.
          </p>
        </div>
      </div>
    </div>
  )
}
