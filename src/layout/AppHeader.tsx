import { useState } from 'react'
import { Link } from 'react-router'
import { useSidebar } from '../context/SidebarContext'
import { ThemeToggleButton } from '../components/common/ThemeToggleButton'
import NotificationDropdown from '../components/header/NotificationDropdown'
import UserDropdown from '../components/header/UserDropdown'
import useAuthStore from '../stores/authStore'

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false)
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const user = useAuthStore(s => s.user)

  const displayName = user?.profile?.full_name || user?.username || 'Sinh viên'

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar()
    } else {
      toggleMobileSidebar()
    }
  }

  return (
    <header className="relative sticky top-0 z-99999 flex w-full border-b border-gray-200/80 bg-white/92 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)] backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#E02020]/25 after:to-transparent dark:border-gray-800/90 dark:bg-gray-950/92">
      <div className="flex grow items-center justify-between px-4 py-3 lg:px-6 lg:py-3.5">

        {/* Sidebar toggle */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-white/[0.04] dark:hover:text-white/90 lg:h-11 lg:w-11"
          onClick={handleToggle}
          aria-label="Mở hoặc đóng menu điều hướng"
        >
          {isMobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor" />
            </svg>
          ) : (
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                fill="currentColor" />
            </svg>
          )}
        </button>

        {/* Logo mobile */}
        <Link to="/" className="lg:hidden">
          <img className="h-9 object-contain" src="/images/logo/auth-logo.png" alt="Logo" />
        </Link>

        {/* Center greeting — desktop only */}
        <div className="hidden lg:flex flex-col items-center leading-tight">
          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Xin chào, {displayName} 👋
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Hệ thống hỗ trợ học tập thông minh AI-Advisor
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggleButton />
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
