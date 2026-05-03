import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import Select from '@/components/form/Select'
import TextArea from '@/components/form/input/TextArea'
import { meetingService } from '@/services/MeetingService'
import {
  type MeetingHint,
  SENTIMENT_SKIP,
  type FeedbackCreateForm,
} from '@/models/Feedback'
import { ChatIcon, CloseLineIcon, PaperPlaneIcon, TimeIcon } from '@/icons'

type Props = {
  isOpen: boolean
  initialMeetingId?: string
  onClose: () => void
  onSubmit: (form: FeedbackCreateForm) => Promise<boolean>
}

export default function FeedbackCreateModal({
  isOpen,
  initialMeetingId,
  onClose,
  onSubmit,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [meetingHints, setMeetingHints] = useState<MeetingHint[]>([])
  const [form, setForm] = useState<FeedbackCreateForm>({
    meetingId: '',
    text: '',
    rating: 0,
    sentiment: SENTIMENT_SKIP,
  })

  const loadMeetings = async () => {
    setLoadingMeetings(true)
    try {
      const res = await meetingService.getInfoMeeting({ page: 1, limit: 100 })
      const hints = res.data?.items ?? []
      setMeetingHints(
        [...hints].sort(
          (a, b) =>
            new Date(b.meeting_time ?? 0).getTime() - new Date(a.meeting_time ?? 0).getTime()
        )
      )
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setMeetingHints([])
    } finally {
      setLoadingMeetings(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setForm({
      meetingId: initialMeetingId ?? '',
      text: '',
      rating: 0,
      sentiment: SENTIMENT_SKIP,
    })
    void loadMeetings()
  }, [isOpen, initialMeetingId])

  const meetingOptions = useMemo(
    () =>
      meetingHints.map(m => ({
        value: m.meeting_id,
        label: `${m.class_label} • ${m.meeting_time
          ? new Date(m.meeting_time).toLocaleString('vi-VN')
          : 'Buổi họp (chưa có giờ)'
          }`,
      })),
    [meetingHints]
  )

  const selectedMeeting = meetingHints.find(m => m.meeting_id === form.meetingId)

  const handleSubmit = async () => {
    if (!form.meetingId.trim()) {
      toast.error('Vui lòng chọn buổi họp cần phản hồi')
      return
    }
    if (form.text.trim().length < 20) {
      toast.error('Nội dung phản hồi cần ít nhất 20 ký tự')
      return
    }
    setSaving(true)
    try {
      const ok = await onSubmit(form)
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      showCloseButton={false}
      className="max-h-[90vh] max-w-lg overflow-y-auto p-0"
    >
      {/* Header */}
      <div className="border-b border-[#F0F0F0] px-6 py-4 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
          >
            <ChatIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white/90">
              Gửi phản hồi buổi họp
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Chia sẻ cảm nhận của bạn sau buổi gặp cố vấn học tập
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <svg className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="none">
            <path d="M10 7v4m0 3h.01M8.615 3.346 1.923 15.077A1.6 1.6 0 0 0 3.308 17.5h13.384a1.6 1.6 0 0 0 1.385-2.423L11.385 3.346a1.6 1.6 0 0 0-2.77 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Bạn chỉ có thể gửi phản hồi <span className="font-bold">trong vòng 24 giờ</span> sau khi buổi họp kết thúc. Mỗi buổi chỉ gửi được một lần.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Buổi họp <span className="text-[#E02020]">*</span></Label>
            <Select
              key={`meeting-${isOpen}-${meetingHints.length}-${form.meetingId}`}
              options={meetingOptions}
              placeholder={
                loadingMeetings
                  ? 'Đang tải danh sách...'
                  : meetingOptions.length
                    ? 'Chọn buổi họp'
                    : 'Chưa có buổi họp'
              }
              onChange={v => setForm(prev => ({ ...prev, meetingId: v }))}
              defaultValue={form.meetingId}
            />
            {selectedMeeting && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Cố vấn: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedMeeting.advisor_label}</span>
              </p>
            )}
          </div>

          <div>
            <Label>Đánh giá buổi họp</Label>
            <p className="mb-2 text-xs text-gray-400">Bạn cảm thấy buổi họp này như thế nào?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  disabled={saving}
                  onClick={() => setForm(prev => ({ ...prev, rating: prev.rating === star ? 0 : star }))}
                  aria-label={`${star} sao`}
                  className={`text-2xl transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 ${form.rating >= star ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'
                    }`}
                >
                  ★
                </button>
              ))}
              {form.rating > 0 && (
                <span className="ml-2 self-center text-xs font-medium text-gray-500">
                  {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'][form.rating]}
                </span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="fb-text">Nội dung phản hồi <span className="text-[#E02020]">*</span></Label>
            <TextArea
              rows={5}
              value={form.text}
              onChange={v => setForm(prev => ({ ...prev, text: v }))}
              disabled={saving}
              hint={`${form.text.trim().length} ký tự (tối thiểu 20)`}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          className="font-semibold"
          startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
          onClick={onClose}
        >
          Hủy
        </Button>
        <button
          type="button"
          disabled={saving || loadingMeetings || meetingOptions.length === 0}
          onClick={() => void handleSubmit()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)', boxShadow: '0 4px 16px -2px rgba(224,32,32,0.45)' }}
          onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
        >
          {saving
            ? <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
            : <PaperPlaneIcon className="size-4 shrink-0" aria-hidden />
          }
          {saving ? 'Đang gửi...' : 'Gửi phản hồi'}
        </button>
      </div>
    </Modal>
  )
}
