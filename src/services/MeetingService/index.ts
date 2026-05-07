import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'
import { MeetingHint, Pagination } from '@/models/Feedback'

class MeetingService {
  private api = axiosInstance

  listMyMeetings = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/meeting/my', body)
    return response.data
  }

  getInfoMeeting = async (
    body: object = {}
  ): Promise<ApiResponse<{ items: MeetingHint[]; pagination: Pagination }>> => {
    const response = await this.api.post('/meeting/my-info', body)
    return response.data
  }

  listAdvisorMeetings = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/meeting/advisor/list', body)
    return response.data
  }

  createMeeting = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/meeting/', body)
    return response.data
  }

  updateNotes = async (meetingId: string, body: { notes_raw: string; notes_summary?: string }): Promise<ApiResponse> => {
    const response = await this.api.patch(`/meeting/${meetingId}/notes`, body)
    return response.data
  }

  archiveMeeting = async (meetingId: string): Promise<ApiResponse> => {
    const response = await this.api.patch(`/meeting/${meetingId}/archive`)
    return response.data
  }

  unarchiveMeeting = async (meetingId: string): Promise<ApiResponse> => {
    const response = await this.api.patch(`/meeting/${meetingId}/unarchive`)
    return response.data
  }

  deleteMeeting = async (meetingId: string): Promise<ApiResponse> => {
    const response = await this.api.delete(`/meeting/${meetingId}`)
    return response.data
  }
}

export const meetingService = new MeetingService()
