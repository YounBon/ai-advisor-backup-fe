import { useCallback, useEffect, useState } from 'react'
import useAuthStore from '@/stores/authStore'
import { userService } from '@/services/UserService'

function displayName(user: User | null): string {
  const n = user?.profile?.full_name?.trim()
  if (n) return n
  return user?.username?.trim() || 'Người dùng'
}

export default function UserDropdown() {
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const setUser = useAuthStore(s => s.setUser)

  const [loadingMe, setLoadingMe] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (!token) return
    setLoadingMe(true)
    try {
      const res = await userService.getMe()
      if (res.data) setUser(res.data as User)
    } catch {
      /* axios interceptor may logout on 401 */
    } finally {
      setLoadingMe(false)
    }
  }, [token, setUser])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const avatarUrl = user?.profile?.avatar_url?.trim()

  /** Lấy chữ cái đầu của mỗi từ trong họ tên, ví dụ "Trần Đình Khoa" → "TĐK" */
  function getInitials(user: User | null): string {
    const name = user?.profile?.full_name?.trim() || user?.username?.trim()
    if (!name) return '?'
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .join('')
  }

  const initials = getInitials(user)

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <span className="overflow-hidden rounded-full h-11 w-11 bg-gray-200 dark:bg-gray-700">
          <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
        </span>
      ) : (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white select-none"
          style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
          title={displayName(user)}
        >
          {initials}
        </span>
      )}
      <span className="hidden font-medium text-theme-sm text-gray-700 dark:text-gray-300 max-w-[140px] truncate lg:block">
        {loadingMe && !user ? '…' : displayName(user)}
      </span>
    </div>
  )
}
