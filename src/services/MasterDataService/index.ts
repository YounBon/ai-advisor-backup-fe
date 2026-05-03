import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class MasterDataService {
  private api = axiosInstance

  getDepartmentsList = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/master-data/departments/list', body)
    return response.data
  }

  createDepartment = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/master-data/departments', body)
    return response.data
  }

  getMajorsList = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/master-data/majors/list', body)
    return response.data
  }

  createMajor = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/master-data/majors', body)
    return response.data
  }

  createTerm = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/master-data/terms', body)
    return response.data
  }

  getTermsList = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/master-data/terms/list', body)
    return response.data
  }

  getActiveTerm = async (): Promise<ApiResponse> => {
    const response = await this.api.get('/master-data/terms/active')
    return response.data
  }
}

export const masterDataService = new MasterDataService()
