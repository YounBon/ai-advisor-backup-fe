import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  _hasHydrated: boolean
  login: (user: User, accessToken: string, refreshToken?: string | null) => void
  setUser: (user: User) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    set => ({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      _hasHydrated: false,
      login: (user, accessToken, refreshToken) =>
        set({
          isAuthenticated: true,
          user,
          token: accessToken,
          refreshToken: refreshToken ?? null,
        }),
      setUser: user => set({ user }),
      logout: () => set({ isAuthenticated: false, user: null, token: null, refreshToken: null }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export default useAuthStore
