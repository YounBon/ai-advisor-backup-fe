import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  TableIcon,
  UserCircleIcon,
} from '../icons'
import { useSidebar } from '../context/SidebarContext'
import useAuthStore from '../stores/authStore'

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[]
}

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: 'Dashboard',
    path: '/dashboard',
  },
  {
    icon: <TableIcon />,
    name: 'Quản lý học tập',
    path: '/master-data',
  },
  {
    name: 'Quản lý người dùng',
    icon: <UserCircleIcon />,
    path: '/admin-users',
  }
]

// const othersItems: NavItem[] = [
//   {
//     icon: <UserIcon />,
//     name: 'User',
//     subItems: [
//       { name: 'Thông tin cá nhân', path: '/profile', pro: false },
//       { name: 'Đăng xuất', path: '/signout', pro: false },
//     ],
//   },
//   {
//     name: 'Forms Demo',
//     icon: <ListIcon />,
//     subItems: [{ name: 'Form Elements', path: '/form-elements', pro: false }],
//   },
// ]

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)

  const handleSignOut = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: 'main' | 'others'
    index: number
  } | null>(null)
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({})
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

  useEffect(() => {
    let submenuMatched = false
      ;['main', 'others'].forEach(menuType => {
        const items = menuType === 'main' ? navItems : []
        items.forEach((nav, index) => {
          if (nav.subItems) {
            nav.subItems.forEach(subItem => {
              if (isActive(subItem.path)) {
                setOpenSubmenu({
                  type: menuType as 'main' | 'others',
                  index,
                })
                submenuMatched = true
              }
            })
          }
        })
      })

    if (!submenuMatched) {
      setOpenSubmenu(null)
    }
  }, [location, isActive])

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`
      if (subMenuRefs.current[key]) {
        setSubMenuHeight(prevHeights => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }))
      }
    }
  }, [openSubmenu])

  const handleSubmenuToggle = (index: number, menuType: 'main' | 'others') => {
    setOpenSubmenu(prevOpenSubmenu => {
      if (prevOpenSubmenu && prevOpenSubmenu.type === menuType && prevOpenSubmenu.index === index) {
        return null
      }
      return { type: menuType, index }
    })
  }

  const renderMenuItems = (items: NavItem[], menuType: 'main' | 'others') => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? 'menu-item-active'
                : 'menu-item-inactive'
                } cursor-pointer ${!isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start'}`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? 'menu-item-icon-active'
                  : 'menu-item-icon-inactive'
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? 'rotate-180 text-brand-500'
                    : ''
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive'
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={el => {
                subMenuRefs.current[`${menuType}-${index}`] = el
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : '0px',
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map(subItem => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? 'menu-dropdown-item-active'
                        : 'menu-dropdown-item-inactive'
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? 'menu-dropdown-badge-active'
                              : 'menu-dropdown-badge-inactive'
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? 'menu-dropdown-badge-active'
                              : 'menu-dropdown-badge-inactive'
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}>
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex gap-5 items-center">
              <img src="/images/logo/auth-logo.png" alt="Logo" width={40} height={40} />
              <span className="text-2xl font-semibold tracking-tight">
                <span className="text-[#111111] dark:text-white">AI-</span><span style={{ color: '#E02020' }}>Advisor</span>
              </span>
            </div>
          ) : (
            <img src="/images/logo/auth-logo.png" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      {/* Nav — scroll được */}
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="flex-1">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'}`}>
                {isExpanded || isHovered || isMobileOpen ? 'Menu' : <HorizontaLDots className="size-6" />}
              </h2>
              {renderMenuItems(navItems, 'main')}
            </div>
          </div>
        </nav>

        {/* Logout — dính đáy */}
        <div className="pb-6 pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className={`menu-item group menu-item-inactive w-full cursor-pointer ${!isExpanded && !isHovered ? 'lg:justify-center' : ''}`}
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
    </aside>
  )
}

export default AppSidebar
