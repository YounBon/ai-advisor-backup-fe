export type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

export type FeedbackRow = {
  _id: string
  meeting_id?: string
  class_id?: string
  advisor_user_id?: string
  feedback_text: string
  rating?: number
  sentiment_label?: string
  submitted_at?: string
  meeting_time?: string | null
  meeting_end_time?: string | null
  class_display?: string | null
  advisor_display?: string | null
}

export type MeetingHint = {
  meeting_id: string
  class_id: string
  advisor_user_id: string
  class_label: string
  advisor_label: string
  meeting_time?: string
  meeting_end_time?: string
  feedback_count: number
  latest_submitted_at?: string
}

export type FeedbackCreateForm = {
  meetingId: string
  text: string
  rating: number
  sentiment: string
}

type ClassItem = {
  _id: string
  class_code?: string
  class_name?: string
}

type AdvisorItem = {
  _id: string
  email?: string
  profile?: { full_name?: string }
  advisor_info?: { staff_code?: string; title?: string }
}
export type MeetingApiItem = {
  _id: string
  class_id?: ClassItem | string
  advisor_user_id?: AdvisorItem | string
  meeting_time?: string
  meeting_end_time?: string
}

export const SENTIMENT_SKIP = '__skip__'
export const SENTIMENT_OPTS = [
  { value: SENTIMENT_SKIP, label: 'Không gửi nhãn (tùy chọn)' },
  { value: 'POSITIVE', label: 'POSITIVE' },
  { value: 'NEUTRAL', label: 'NEUTRAL' },
  { value: 'NEGATIVE', label: 'NEGATIVE' },
]
