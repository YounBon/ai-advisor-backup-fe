import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class StudentService {
  private api = axiosInstance

  getMyAdvisor = async (): Promise<ApiResponse> => {
    const response = await this.api.post('/students/me/advisor')
    return response.data
  }

  listStudents = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/students', body)
    return response.data
  }

  getStudentById = async (id: string, body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post(`/students/${id}`, body)
    return response.data
  }
}

export const studentService = new StudentService()
