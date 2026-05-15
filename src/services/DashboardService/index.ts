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

  getAdvisorDashboard = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/dashboard/advisor', body)
    return response.data
  }
}

export const dashboardService = new DashboardService()
