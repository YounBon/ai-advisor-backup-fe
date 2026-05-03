import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class NotificationService {
  private api = axiosInstance

  listNotifications = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/notification/list', body)
    return response.data
  }

  markAsRead = async (body: { notification_id?: string; mark_all?: boolean }): Promise<ApiResponse> => {
    const response = await this.api.post('/notification/mark-read', body)
    return response.data
  }

  generateAlerts = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/notification/generate', body)
    return response.data
  }
}

export const notificationService = new NotificationService()
