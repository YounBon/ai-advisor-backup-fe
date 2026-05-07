import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class AuthService {
  private api = axiosInstance

  login = async (body: { email: string; password: string }): Promise<ApiResponse> => {
    const response = await this.api.post('/auth/login', body)
    return response.data
  }

  logout = async (
    body: { refresh_token?: string; all_devices?: boolean } = {}
  ): Promise<ApiResponse> => {
    const response = await this.api.post('/auth/logout', body)
    return response.data
  }

  /** Verify token còn hợp lệ không — dùng khi app khởi động */
  me = async (): Promise<ApiResponse> => {
    const response = await this.api.get('/auth/me')
    return response.data
  }
}

export const authService = new AuthService()
