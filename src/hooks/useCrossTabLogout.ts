import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import useAuthStore from '../stores/authStore'

const AUTH_STORAGE_KEY = 'auth'

/**
 * Lắng nghe sự kiện localStorage từ các tab khác trên cùng thiết bị.
 * Khi tab khác đăng xuất (xóa key 'auth'), tab này sẽ tự động đăng xuất.
 *
 * Lưu ý: storage event KHÔNG kích hoạt trên tab đang thay đổi,
 * chỉ kích hoạt trên các tab khác — đúng với yêu cầu.
 */
export function useCrossTabLogout() {
    const logout = useAuthStore(s => s.logout)
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const navigate = useNavigate()

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            // Chỉ xử lý khi key 'auth' bị xóa hoặc thay đổi thành null
            if (e.key !== AUTH_STORAGE_KEY) return

            // newValue === null nghĩa là key bị xóa (logout)
            if (e.newValue === null && isAuthenticated) {
                logout()
                navigate('/signin', { replace: true })
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [logout, isAuthenticated, navigate])
}
