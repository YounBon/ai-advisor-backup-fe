import axios, { AxiosError } from 'axios'
import useAuthStore from '../stores/authStore'

const API_BASE = 'http://localhost:3000/api'

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
})

axiosInstance.interceptors.request.use(
  config => {
    const token = useAuthStore.getState().token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState()

      if (isAuthenticated) {
        logout()

        if (window.location.pathname !== '/signin') {
          window.location.href = '/signin'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
