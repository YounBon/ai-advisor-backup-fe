import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  login: (user: User, accessToken: string, refreshToken?: string | null) => void
  setUser: (user: User) => void
  logout: () => void
}

const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    set => ({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken) =>
        set({
          isAuthenticated: true,
          user,
          token: accessToken,
          refreshToken: refreshToken ?? null,
        }),
      setUser: user => set({ user }),
      logout: () => set({ isAuthenticated: false, user: null, token: null, refreshToken: null }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useAuthStore
