import React from 'react'
import GridShape from '../../components/common/GridShape'
import { Link } from 'react-router'
import ThemeTogglerTwo from '../../components/common/ThemeTogglerTwo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-1 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="relative flex h-screen w-full flex-col justify-center overflow-hidden dark:bg-gray-950 sm:p-0 lg:flex-row">
        {children}
        <div className="relative hidden h-full w-full items-center lg:grid lg:w-1/2">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/daihocdt.png')" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-1 flex h-full items-center justify-center px-10">
            <GridShape />
            <div className="relative flex max-w-md flex-col items-center text-center">
              <Link to="/" className="mb-6 block transition-opacity duration-200 hover:opacity-90">
                <img width={231} height={48} src="/images/logo/auth-logo.svg" alt="AI-Advisor" />
              </Link>
              <p className="text-balance text-base leading-relaxed text-white/85">
                Nền tảng hỗ trợ cố vấn học tập — theo dõi rủi ro, cảnh báo và phản hồi sinh viên trong một giao diện gọn,
                an toàn dữ liệu.
              </p>
              <p className="mt-4 text-sm text-white/55">Đăng nhập để tiếp tục phiên làm việc của bạn.</p>
            </div>
          </div>
        </div>
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  )
}
