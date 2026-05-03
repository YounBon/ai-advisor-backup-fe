import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class UserService {
  private api = axiosInstance

  getUsers = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/users', body)
    return response.data
  }

  createUser = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/users/create', body)
    return response.data
  }

  /** POST /users/info — chi tiết user (không mật khẩu), ADVISOR / FACULTY / ADMIN */
  getInfoUser = async (body: { user_id: string }): Promise<ApiResponse> => {
    const response = await this.api.post('/users/info', body)
    return response.data
  }

  /** POST /users/me — текущий пользователь по JWT (все роли) */
  getMe = async (): Promise<ApiResponse<User>> => {
    const response = await this.api.post('/users/me', {})
    return response.data
  }

  /** POST /users/me/change-password */
  changePassword = async (body: { old_password: string; new_password: string }): Promise<ApiResponse> => {
    const response = await this.api.post('/users/me/change-password', body)
    return response.data
  }

  /** POST /users/me/update — обновить профиль (full_name, phone, address) */
  updateMyProfile = async (body: {
    profile: { full_name?: string; phone?: string; address?: string }
  }): Promise<ApiResponse<User>> => {
    const response = await this.api.post('/users/me/update', body)
    return response.data
  }
}

export const userService = new UserService()
