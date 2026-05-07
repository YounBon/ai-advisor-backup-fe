import { useEffect, useRef } from 'react'
import useAuthStore from '../stores/authStore'
import { authService } from '../services/AuthService'

/**
 * Khi app khởi động, nếu store có token (từ localStorage),
 * gọi GET /auth/me để verify token còn hợp lệ không.
 * Nếu 401 → axios interceptor sẽ tự logout.
 * Nếu hợp lệ → cập nhật lại user mới nhất từ server.
 */
export function useVerifyAuth() {
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const hasHydrated = useAuthStore(s => s._hasHydrated)
    const setUser = useAuthStore(s => s.setUser)
    const logout = useAuthStore(s => s.logout)
    const verified = useRef(false)

    useEffect(() => {
        // Chỉ chạy một lần sau khi hydrate xong và có session
        if (!hasHydrated || !isAuthenticated || verified.current) return
        verified.current = true

        authService.me().then(res => {
            // Cập nhật user mới nhất từ server (phòng trường hợp role/info thay đổi)
            if (res.data) {
                setUser(res.data as User)
            }
        }).catch(() => {
            // Token hết hạn hoặc invalid → axios interceptor đã logout,
            // nhưng phòng hờ gọi thêm ở đây
            logout()
        })
    }, [hasHydrated, isAuthenticated, setUser, logout])
}
