import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class AcademicService {
  private api = axiosInstance

  submitAcademic = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/academic/submit', body)
    return response.data
  }
}

export const academicService = new AcademicService()
