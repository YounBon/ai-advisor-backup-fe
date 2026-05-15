import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class AdvisorClassService {
  private api = axiosInstance

  upsertAdvisorClass = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/advisor-classes', body)
    return response.data
  }

  getMyAdvisorClasses = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/advisor-classes/my', body)
    return response.data
  }

  listAllAdvisorClasses = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/advisor-classes/list', body)
    return response.data
  }

  changeAdvisor = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/advisor-classes/change-advisor', body)
    return response.data
  }

  deleteAdvisorClass = async (classId: string): Promise<ApiResponse> => {
    const response = await this.api.delete(`/advisor-classes/${classId}`)
    return response.data
  }
}

export const advisorClassService = new AdvisorClassService()
