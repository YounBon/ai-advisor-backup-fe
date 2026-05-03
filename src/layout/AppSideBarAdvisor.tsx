import { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  AlertIcon,
  CalenderIcon,
  ChatIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
} from '../icons'
import { useSidebar } from '../context/SidebarContext'
import useAuthStore from '../stores/authStore'

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { name: string; path: string }[]
}

const mainNav: NavItem[] = [
  { icon: <GridIcon />, name: 'Tổng quan rủi ro', path: '/advisor' },
  { icon: <ListIcon />, name: 'Lớp & thành viên', path: '/advisor/classes' },
  { icon: <CalenderIcon />, name: 'Cuộc họp tư vấn', path: '/advisor/meetings' },
  { icon: <ChatIcon />, name: 'Phản hồi sau họp', path: '/advisor/feedback' },
  { icon: <AlertIcon />, name: 'Thông báo & cảnh báo', path: '/advisor/notifications' },
]


const AppSideBarAdvisor: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)

  const handleSignOut = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const isActive = useCallback(
    (path: string) => {
      const p = location.pathname.replace(/\/$/, '') || '/'
      const t = path.replace(/\/$/, '') || '/'
      if (t === '/advisor') return p === '/advisor'
      return p === t || p.startsWith(`${t}/`)
    },
    [location.pathname]
  )


  const renderMain = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map(nav => (
        <li key={nav.name}>
          {nav.path ? (
            <Link
              to={nav.path}
              className={`menu-item group ${isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive'}`}
            >
              <span
                className={`menu-item-icon-size ${isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${isExpanded || isMobileOpen ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => { }}
      onMouseLeave={() => { }}
    >
      <div
        className={`flex py-8 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}
      >
        <Link to="/advisor">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <img
                src="/images/logo/auth-logo.png"
                alt=""
                width={40}
                height={40}
              />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-lg font-semibold tracking-tight">
                  <span className="text-[#111111] dark:text-white">AI-</span><span style={{ color: '#E02020' }}>Advisor</span>
                </span>
              </div>
            </div>
          ) : (
            <img src="/images/logo/auth-logo.png" alt="" width={32} height={32} />
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  'Cố vấn học tập'
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMain(mainNav)}
            </div>
            <div>
              <button
                type="button"
                onClick={handleSignOut}
                className={`menu-item group menu-item-inactive mt-2 w-full cursor-pointer ${!isExpanded && !isHovered ? 'lg:justify-center' : ''}`}
              >
                <span className="menu-item-icon-size menu-item-icon-inactive">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z" fill="currentColor" />
                  </svg>
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">Đăng xuất</span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}

export default AppSideBarAdvisor
