import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import { Outlet } from 'react-router'
import AppHeader from './AppHeader'
import Backdrop from './Backdrop'
import AppSidebar from './AppSidebar'

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
        } ${isMobileOpen ? 'ml-0' : ''}`}
      >
        <AppHeader />
        <div className="mx-auto min-h-[calc(100dvh-4rem)] max-w-(--breakpoint-2xl) bg-gray-50/95 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(70,95,255,0.14),transparent_58%)] px-4 py-6 md:px-6 md:py-8 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_85%_55%_at_50%_-20%,rgba(99,102,241,0.16),transparent_55%)]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  )
}

export default AppLayout
