import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { viApiError, viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { feedbackService } from '@/services/FeedbackService'
import { meetingService } from '@/services/MeetingService'
import useAuthStore from '@/stores/authStore'
import {
  type FeedbackRow,
  type FeedbackCreateForm,
  type MeetingHint,
  type Pagination,
  SENTIMENT_SKIP,
} from '@/models'
import { MeetingTable, FeedbackCreateModal } from '@/components/Student'
import {
  CalenderIcon,
  ChatIcon,
  CloseLineIcon,
  EyeIcon,
  TimeIcon,
} from '@/icons'

function sentimentPillClass(label?: string | null): string {
  const s = (label ?? '').toLowerCase()
  if (s.includes('positive') || s.includes('tích cực') || s.includes('vui'))
    return 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200'
  if (s.includes('negative') || s.includes('tiêu cực') || s.includes('buồn'))
    return 'border-rose-200/80 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200'
  if (s.includes('neutral') || s.includes('trung lập'))
    return 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100'
  return 'border-gray-200/80 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-white/10 dark:text-gray-200'
}

function sentimentLabel(label?: string | null): string {
  const s = (label ?? '').toLowerCase()
  if (s.includes('positive')) return 'Tích cực'
  if (s.includes('negative')) return 'Tiêu cực'
  if (s.includes('neutral')) return 'Trung lập'
  return label ?? '—'
}

export default function FeedbackPage() {
  const userId = useAuthStore(s => s.user?._id)
  const [page, setPage] = useState(1)
  const limit = 5
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [meetingHints, setMeetingHints] = useState<MeetingHint[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<FeedbackRow | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = useState('')

  const fetchPage = useCallback(
    async (p: number) => {
      if (!userId) return
      setLoading(true)
      try {
        const res = await feedbackService.listFeedback({
          page: p,
          limit,
          student_user_id: userId,
        })
        const payload = res.data as { items: FeedbackRow[]; pagination: Pagination }
        setRows(payload.items ?? [])
        setPagination(payload.pagination ?? null)
      } catch {
        toast.error('Đã có lỗi xảy ra')
        setRows([])
        setPagination(null)
      } finally {
        setLoading(false)
      }
    },
    [limit, userId]
  )

  const loadMeetingHints = useCallback(async () => {
    if (!userId) return
    try {
      const res = await meetingService.getInfoMeeting({
        page: 1,
        limit: 50,
      })
      const items = res.data?.items ?? []
      setMeetingHints(
        [...items].sort(
          (a, b) =>
            new Date(b.meeting_time ?? b.latest_submitted_at ?? 0).getTime() -
            new Date(a.meeting_time ?? a.latest_submitted_at ?? 0).getTime()
        )
      )
    } catch {
      setMeetingHints([])
    }
  }, [userId])

  useEffect(() => {
    void fetchPage(page)
  }, [page, fetchPage])

  useEffect(() => {
    void loadMeetingHints()
  }, [loadMeetingHints])

  const openDetail = (row: FeedbackRow) => {
    setDetailRow(row)
    setDetailOpen(true)
  }

  const openCreateForMeeting = (meetingId: string) => {
    const meeting = meetingHints.find(m => m.meeting_id === meetingId)
    if (meeting && meeting.feedback_count > 0) {
      toast.info('Bạn đã gửi phản hồi cho buổi họp này rồi')
      return
    }
    setSelectedMeetingId(meetingId)
    setCreateOpen(true)
  }

  const submitFeedback = async (form: FeedbackCreateForm): Promise<boolean> => {
    const body: Record<string, unknown> = {
      meeting_id: form.meetingId.trim(),
      feedback_text: form.text.trim(),
    }
    if (form.rating >= 1 && form.rating <= 5) body.rating = form.rating
    if (form.sentiment && form.sentiment !== SENTIMENT_SKIP) body.sentiment_label = form.sentiment
    try {
      const res = await feedbackService.submitFeedback(body)
      toast.success(viApiMessage(res.message, 'Đã gửi phản hồi'))
      setPage(1)
      await fetchPage(1)
      await loadMeetingHints()
      return true
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string }; status?: number } }
      const status = err.response?.status
      const message = err.response?.data?.message

      if (status === 409 || message?.toLowerCase().includes('already submitted')) {
        toast.error('Bạn đã gửi phản hồi cho buổi họp này rồi')
      } else if (status === 422) {
        toast.error(
          viApiError(
            message,
            'Không thể gửi phản hồi: kiểm tra thời gian hoặc điều kiện gửi'
          )
        )
      } else {
        toast.error('Đã có lỗi xảy ra')
      }
      return false
    }
  }

  const totalPages = pagination?.total_pages ?? 1

  return (
    <>
      <PageMeta title="Phản hồi | Sinh viên" description="Gửi và xem phản hồi SHCVHT" />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-[#E02020]/20 bg-gradient-to-br from-[#FFF0F0] via-white to-rose-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(224,32,32,0.2)] ring-1 ring-[#E02020]/10 sm:p-6"
        aria-labelledby="student-fb-hero-title"
      >
        <div
          className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[#E02020]/10 blur-3xl"
          aria-hidden
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Text bên trái */}
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#E02020] shadow-sm ring-1 ring-[#E02020]/20">
              <ChatIcon className="size-3.5 shrink-0" aria-hidden />
              Phản hồi buổi họp
            </p>
            <h2
              id="student-fb-hero-title"
              className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"
            >
              Chia sẻ cảm nhận sau buổi gặp cố vấn
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Sau mỗi buổi sinh hoạt cố vấn học tập, bạn có thể gửi phản hồi trong vòng <span className="font-semibold text-[#E02020]">24 giờ</span>. Ý kiến của bạn giúp cố vấn hiểu và hỗ trợ bạn tốt hơn.
            </p>
          </div>

          {/* Stat cards bên phải */}
          <div className="flex shrink-0 flex-wrap gap-3 lg:flex-nowrap">
            {/* Tổng buổi họp */}
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-[#E02020]/15 bg-white/80 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <span className="tabular-nums text-2xl font-extrabold text-[#E02020]">
                {meetingHints.length}
              </span>
              <span className="mt-1 text-[11px] font-medium text-gray-500">Buổi họp</span>
            </div>

            {/* Đã phản hồi */}
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-[#E02020]/15 bg-white/80 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <span className="tabular-nums text-2xl font-extrabold text-[#12B76A]">
                {meetingHints.filter(m => m.feedback_count > 0).length}
              </span>
              <span className="mt-1 text-[11px] font-medium text-gray-500">Đã phản hồi</span>
            </div>

            {/* Chờ phản hồi */}
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-[#E02020]/15 bg-white/80 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <span className="tabular-nums text-2xl font-extrabold text-[#FB6514]">
                {meetingHints.filter(m => m.feedback_count === 0).length}
              </span>
              <span className="mt-1 text-[11px] font-medium text-gray-500">Chờ phản hồi</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── BẢNG BUỔI HỌP ────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-6">
        <div className="mb-4 border-b border-gray-100 pb-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white/90">
            <CalenderIcon className="size-5 text-[#E02020]" aria-hidden />
            Các buổi họp của bạn
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tìm buổi họp gần nhất và bấm <span className="font-semibold text-[#E02020]">Gửi phản hồi</span> để chia sẻ cảm nhận. Mỗi buổi chỉ gửi được một lần.
          </p>
        </div>
        <MeetingTable
          meetingHints={meetingHints}
          onFeedback={openCreateForMeeting}
        />
      </div>

      {/* ── BẢNG LỊCH SỬ PHẢN HỒI ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 text-base font-bold text-gray-900 dark:text-white/90">
          <TimeIcon className="size-5 text-[#E02020]" aria-hidden />
          Phản hồi đã gửi
        </h2>
        {loading ? (
          <div className="space-y-3 py-4" aria-busy="true">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB] dark:border-gray-800 dark:bg-white/[0.04]">
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Gửi lúc
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Lớp & cố vấn
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cảm xúc
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Đánh giá
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nội dung
                    </TableCell>
                    <TableCell isHeader className="w-px whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Xem
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        Bạn chưa gửi phản hồi nào — hãy chọn buổi họp ở bảng phía trên để bắt đầu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => (
                      <TableRow
                        key={row._id}
                        className="border-b border-[#F0F0F0] transition-colors hover:bg-[#F9FAFB] dark:border-gray-800 dark:hover:bg-white/[0.03]"
                      >
                        <TableCell className="whitespace-nowrap px-4 py-3 text-center text-xs text-gray-700 dark:text-gray-300">
                          {row.submitted_at
                            ? new Date(row.submitted_at).toLocaleString('vi-VN')
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] px-4 py-3 text-left text-xs text-gray-600 dark:text-gray-400">
                          <div className="line-clamp-2 font-medium text-gray-800 dark:text-gray-200">
                            {row.class_display || '—'}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-gray-500 dark:text-gray-500">
                            {row.advisor_display || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${sentimentPillClass(row.sentiment_label)}`}>
                            {sentimentLabel(row.sentiment_label)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm tabular-nums font-semibold text-gray-800 dark:text-gray-200">
                          {row.rating != null ? `${row.rating}/5` : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {row.feedback_text}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center align-middle">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="font-semibold"
                            startIcon={<EyeIcon className="size-4 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />}
                            onClick={() => openDetail(row)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-[#F0F0F0] pt-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Trang{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{page}</span>
                  {' '}/ {totalPages} ·{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{pagination?.total ?? 0}</span> bản ghi
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Trang trước"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="flex size-8 items-center justify-center text-xs text-gray-400">…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          aria-current={page === item ? 'page' : undefined}
                          className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors
                            ${page === item
                              ? 'border-[#E02020] bg-[#E02020] text-white'
                              : 'border-[#F0F0F0] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                            }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    aria-label="Trang sau"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL CHI TIẾT ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        showCloseButton={false}
        className="max-w-xl overflow-hidden p-0"
      >
        <div className="border-b border-[#F0F0F0] px-6 py-4 dark:border-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
              >
                <EyeIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white/90">Chi tiết phản hồi</h3>
                {detailRow?.submitted_at ? (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(detailRow.submitted_at).toLocaleString('vi-VN')}
                  </p>
                ) : null}
              </div>
            </div>
            {detailRow?.sentiment_label ? (
              <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold ${sentimentPillClass(detailRow.sentiment_label)}`}>
                {sentimentLabel(detailRow.sentiment_label)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-6">
          {detailRow && (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-[#F0F0F0] bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Buổi họp</dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {detailRow.meeting_time ? new Date(detailRow.meeting_time).toLocaleString('vi-VN') : '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-[#F0F0F0] bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Đánh giá</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {detailRow.rating != null ? `${detailRow.rating}/5` : '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-[#F0F0F0] bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lớp cố vấn</dt>
                <dd className="mt-1 text-gray-800 dark:text-gray-200">{detailRow.class_display || '—'}</dd>
              </div>
              <div className="rounded-xl border border-[#F0F0F0] bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cố vấn</dt>
                <dd className="mt-1 text-gray-800 dark:text-gray-200">{detailRow.advisor_display || '—'}</dd>
              </div>
              <div className="rounded-xl border border-[#F0F0F0] bg-[#FFF8F8] p-4 dark:border-[#E02020]/20 dark:bg-[#E02020]/5 sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#E02020]">Nội dung phản hồi</dt>
                <dd className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">{detailRow.feedback_text}</dd>
              </div>
            </dl>
          )}
        </div>
        <div className="flex justify-end border-t border-[#F0F0F0] bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setDetailOpen(false)}
          >
            Đóng
          </Button>
        </div>
      </Modal>

      <FeedbackCreateModal
        isOpen={createOpen}
        initialMeetingId={selectedMeetingId}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitFeedback}
      />
    </>
  )
}
