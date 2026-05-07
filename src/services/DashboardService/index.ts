import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class DashboardService {
  private api = axiosInstance

  getStudentDashboard = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/dashboard/student', body)
    return response.data
  }

  getFacultyDashboard = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/dashboard/faculty', body)
    return response.data
  }

  /**
   * Lấy dashboard cố vấn.
   * @param body.class_id - ID lớp muốn xem (optional).
   *   Nếu không truyền, backend tự chọn lớp ACTIVE đầu tiên.
   */
  getAdvisorDashboard = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/dashboard/advisor', body)
    return response.data
  }
}

export const dashboardService = new DashboardService()
