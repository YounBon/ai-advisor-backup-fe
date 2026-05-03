import useAuthStore from '@/stores/authStore'
import FeedbackListPage from '@/pages/Admin/Feedback/FeedbackListPage'

/** Phản hồi trong phạm vi cố vấn: lọc cố định theo tài khoản đăng nhập */
export default function AdvisorFeedbackPage() {
  const advisorId = useAuthStore(s => s.user?._id ?? '')
  return <FeedbackListPage presetAdvisorUserId={advisorId} />
}
