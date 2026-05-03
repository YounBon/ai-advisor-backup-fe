import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class FeedbackService {
  private api = axiosInstance

  submitFeedback = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/feedback', body)
    return response.data
  }

  listFeedback = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/feedback/list', body)
    return response.data
  }
}

export const feedbackService = new FeedbackService()
