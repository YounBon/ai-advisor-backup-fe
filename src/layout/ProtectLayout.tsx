import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import { Outlet } from 'react-router'
import AppHeader from './AppHeader'
import Backdrop from './Backdrop'
import AppSidebarStudent from './AppSidebarStudent'
import ChatbotWidget from '../components/Student/Chatbot/ChatbotWidget'

const ProtectLayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebarStudent />
        <Backdrop />
      </div>
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
          } ${isMobileOpen ? 'ml-0' : ''}`}
      >
        <AppHeader />
        {/* Vùng nội dung chính — nền trắng/xám nhạt, không gradient xanh */}
        <div className="flex-1 mx-auto w-full max-w-(--breakpoint-2xl) bg-gray-50 px-4 py-6 md:px-6 md:py-8 dark:bg-gray-950">
          <Outlet />
        </div>
        {/* Footer cố định cuối mọi trang sinh viên */}
        <footer className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
          <p className="px-6 py-4 text-center text-sm text-gray-400 dark:text-gray-600">
            © 2026 AI-Advisor. Đại học Duy Tân - C2SE.52.
          </p>
        </footer>
      </div>
      {/* Chatbot floating widget — hiển thị trên tất cả trang student */}
      <ChatbotWidget />
    </div>
  )
}

/** Layout dành cho sinh viên (STUDENT): sidebar + header + vùng nội dung */
const ProtectLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <ProtectLayoutContent />
    </SidebarProvider>
  )
}

export default ProtectLayout
