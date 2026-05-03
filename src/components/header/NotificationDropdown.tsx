import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { notificationService } from '@/services/NotificationService'
import useAuthStore from '@/stores/authStore'

type NotifItem = {
  _id: string
  title?: string
  sent_at?: string
  is_read?: boolean
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

function alertTypeColor(title?: string): string {
  const t = (title ?? '').toLowerCase()
  if (t.includes('rủi ro') || t.includes('nguy cơ')) return 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
  if (t.includes('cảm xúc') || t.includes('tiêu cực')) return 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400'
  if (t.includes('bất thường')) return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
  return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
        fill="currentColor" />
    </svg>
  )
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<NotifItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore(s => s.user)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch 3 thông báo gần nhất khi user đã login
  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await notificationService.listNotifications({ page: 1, limit: 3 })
      const data = res.data as { items: NotifItem[]; pagination: { total: number } }
      setItems(data.items ?? [])
      // Đếm unread từ toàn bộ (dùng is_read=false filter)
      const unreadRes = await notificationService.listNotifications({ page: 1, limit: 1, is_read: false })
      const unreadData = unreadRes.data as { pagination: { total: number } }
      setUnreadCount(unreadData.pagination?.total ?? 0)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch khi mount
  useEffect(() => {
    void fetchNotifications()
  }, [user])

  const handleToggle = () => {
    if (!isOpen) void fetchNotifications()
    setIsOpen(prev => !prev)
  }

  // Đường dẫn trang thông báo theo role
  const notifPath = user?.role === 'STUDENT' ? '/student/notifications'
    : user?.role === 'ADVISOR' ? '/advisor/notifications'
      : '/notifications'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Thông báo"
        aria-expanded={isOpen}
        className="relative flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#E02020] text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <BellIcon />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[99999] w-80 rounded-2xl border border-gray-200 bg-white shadow-[0_8px_32px_-4px_rgba(15,23,42,0.15)] dark:border-gray-800 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Thông báo</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#E02020] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Đóng"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Không có thông báo nào</p>
              </div>
            ) : (
              items.map(item => (
                <div
                  key={item._id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${!item.is_read ? 'bg-[#FFFAFA] dark:bg-[#E02020]/5' : ''}`}
                >
                  {/* Icon */}
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${alertTypeColor(item.title)}`}>
                    {(item.title ?? '').toLowerCase().includes('rủi ro') || (item.title ?? '').toLowerCase().includes('nguy cơ') ? '⚠' :
                      (item.title ?? '').toLowerCase().includes('cảm xúc') ? '💬' : '📊'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold leading-snug ${!item.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.title ?? '—'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(item.sent_at)}
                    </p>
                  </div>
                  {/* Unread dot */}
                  {!item.is_read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#E02020]" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer — link đến trang thông báo */}
          <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <Link
              to={notifPath}
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E02020]/20 bg-[#FFF0F0] py-2 text-xs font-semibold text-[#E02020] transition-colors hover:bg-[#FFE0E0] dark:border-[#E02020]/30 dark:bg-[#E02020]/10 dark:hover:bg-[#E02020]/20"
            >
              Xem tất cả thông báo
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
