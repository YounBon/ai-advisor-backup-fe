import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class AdvisorClassService {
  private api = axiosInstance

  upsertAdvisorClass = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/advisor-classes', body)
    return response.data
  }

  /**
   * Lấy danh sách tất cả lớp cố vấn của cố vấn hiện tại (1–3 lớp).
   * Response: { data: AdvisorClass[] }
   */
  getMyAdvisorClasses = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/advisor-classes/my', body)
    return response.data
  }
}

export const advisorClassService = new AdvisorClassService()
