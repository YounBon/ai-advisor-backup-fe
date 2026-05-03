import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class ClassMemberService {
  private api = axiosInstance

  addMembers = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/class-members/add', body)
    return response.data
  }

  listMembers = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/class-members/list', body)
    return response.data
  }
}

export const classMemberService = new ClassMemberService()
