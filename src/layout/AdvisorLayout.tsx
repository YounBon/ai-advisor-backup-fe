import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import { Outlet } from 'react-router'
import AppHeader from './AppHeader'
import Backdrop from './Backdrop'
import AppSideBarAdvisor from './AppSideBarAdvisor'

const AdvisorLayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSideBarAdvisor />
        <Backdrop />
      </div>
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
          } ${isMobileOpen ? 'ml-0' : ''}`}
      >
        <AppHeader />
        <div className="flex-1 mx-auto w-full min-h-[calc(100dvh-4rem)] max-w-(--breakpoint-2xl) bg-gray-50/95 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(70,95,255,0.14),transparent_58%)] px-4 py-6 md:px-6 md:py-8 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_85%_55%_at_50%_-20%,rgba(99,102,241,0.16),transparent_55%)]">
          <Outlet />
        </div>
        <footer className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
          <p className="px-6 py-4 text-center text-sm text-gray-400 dark:text-gray-600">
            © 2026 AI-Advisor. Đại học Duy Tân - C2SE.52.
          </p>
        </footer>
      </div>
    </div>
  )
}

/** Layout cho tài khoản ADVISOR: sidebar nghiệp vụ cố vấn + header */
const AdvisorLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <AdvisorLayoutContent />
    </SidebarProvider>
  )
}

export default AdvisorLayout
