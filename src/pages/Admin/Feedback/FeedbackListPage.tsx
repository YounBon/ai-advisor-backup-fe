import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { feedbackService } from '@/services/FeedbackService'
import { ChatIcon, CloseLineIcon, EyeIcon, TimeIcon } from '@/icons'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type FeedbackRow = {
  _id: string
  class_id?: string
  student_user_id?: string
  advisor_user_id?: string
  meeting_id?: string
  feedback_text: string
  rating?: number
  sentiment_label?: string
  feedback_score?: number
  submitted_at?: string
  meeting_time?: string | null
  meeting_end_time?: string | null
  class_display?: string | null
  advisor_display?: string | null
  student_display?: string | null
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('vi-VN') } catch { return iso }
}

function sentimentLabel(label?: string | null): string {
  const s = (label ?? '').toLowerCase()
  if (s.includes('positive')) return 'Tích cực'
  if (s.includes('negative')) return 'Tiêu cực'
  if (s.includes('neutral')) return 'Trung lập'
  return label ?? '—'
}

function sentimentPillClass(label?: string | null): string {
  const s = (label ?? '').toLowerCase()
  if (s.includes('positive')) return 'bg-[#F0FDF4] text-emerald-700'
  if (s.includes('negative')) return 'bg-[#FFF0F0] text-[#B01818]'
  if (s.includes('neutral')) return 'bg-amber-50 text-amber-800'
  return 'bg-[#F9FAFB] text-[#6B7280]'
}

export type FeedbackListPageProps = {
  presetAdvisorUserId?: string
}

export default function FeedbackListPage({ presetAdvisorUserId }: FeedbackListPageProps = {}) {
  const [page, setPage] = useState(1)
  const limit = 10
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<FeedbackRow | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      const scopedAdvisorId = presetAdvisorUserId?.trim()
      if (scopedAdvisorId) body.advisor_user_id = scopedAdvisorId
      const res = await feedbackService.listFeedback(body)
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
  }, [page, limit, presetAdvisorUserId])

  useEffect(() => { void loadList() }, [loadList])

  const totalPages = pagination?.total_pages ?? 1

  return (
    <>
      <PageMeta title="Phản hồi sau họp | Cố vấn học tập" description="Xem phản hồi sinh viên sau buổi họp tư vấn" />

      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderLeft: '4px solid #E02020' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Cố vấn học tập</p>
          <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Phản hồi sau họp</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">Xem cảm nhận của sinh viên sau các buổi sinh hoạt cố vấn học tập</p>
        </div>
        {pagination != null && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-2.5">
            <ChatIcon className="size-4 text-[#E02020]" aria-hidden />
            <span className="text-sm font-semibold text-[#111111]">{pagination.total}</span>
            <span className="text-sm text-[#6B7280]">phản hồi</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 border-b border-[#F0F0F0] px-5 py-4">
          <TimeIcon className="size-5 text-[#E02020]" aria-hidden />
          <h2 className="text-base font-bold text-[#111111]">Danh sách phản hồi</h2>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-[#F9FAFB]" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Sinh viên</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Buổi họp</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Cảm xúc</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Đánh giá</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Nội dung</TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                            <ChatIcon className="size-6 text-[#E02020]" aria-hidden />
                          </div>
                          <p className="text-sm font-semibold text-[#111111]">Chưa có phản hồi nào</p>
                          <p className="text-xs text-[#6B7280]">Sinh viên chưa gửi phản hồi sau buổi họp.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => (
                      <TableRow
                        key={row._id}
                        className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]"
                      >
                        <TableCell className="px-5 py-3.5 font-medium text-[#111111]">
                          {row.student_display ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs text-[#6B7280]">
                          {formatDate(row.meeting_time ?? undefined)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${sentimentPillClass(row.sentiment_label)}`}>
                            {sentimentLabel(row.sentiment_label)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 tabular-nums font-semibold text-[#111111]">
                          {row.rating != null ? `${row.rating}/5` : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs px-4 py-3.5">
                          <span className="line-clamp-2 text-sm text-[#444444]">{row.feedback_text}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                            startIcon={<EyeIcon className="size-4 shrink-0" aria-hidden />}
                            onClick={() => { setDetailRow(row); setDetailOpen(true) }}
                          >
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#F0F0F0] px-5 py-3.5">
                <p className="text-xs text-[#6B7280]">
                  Trang <span className="font-semibold text-[#111111]">{pagination.page}</span>
                  {' / '}{totalPages} ·{' '}
                  <span className="font-semibold text-[#111111]">{pagination.total}</span> phản hồi
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Trang trước"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                        <span key={`e-${idx}`} className="flex size-8 items-center justify-center text-xs text-[#6B7280]">…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          aria-current={page === item ? 'page' : undefined}
                          className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${page === item
                            ? 'border-[#E02020] bg-[#E02020] text-white'
                            : 'border-[#F0F0F0] bg-white text-[#444444] hover:border-gray-300 hover:bg-gray-50'
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
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-2xl overflow-hidden p-0">
        {detailRow && (
          <>
            <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Chi tiết phản hồi</h3>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    {detailRow.student_display ?? '—'} · {formatDate(detailRow.submitted_at)}
                  </p>
                </div>
                {detailRow.sentiment_label && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sentimentPillClass(detailRow.sentiment_label)}`}>
                    {sentimentLabel(detailRow.sentiment_label)}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Buổi họp</dt>
                  <dd className="mt-1 font-medium text-[#111111]">{formatDate(detailRow.meeting_time ?? undefined)}</dd>
                </div>
                <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Đánh giá</dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums text-[#111111]">
                    {detailRow.rating != null ? `${detailRow.rating}/5` : '—'}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] p-4 sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Lớp cố vấn</dt>
                  <dd className="mt-1 text-[#444444]">{detailRow.class_display || '—'}</dd>
                </div>
                <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Điểm cảm xúc</dt>
                  <dd className="mt-1 font-medium text-[#444444]">
                    {detailRow.feedback_score != null ? detailRow.feedback_score.toFixed(2) : '—'}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Thời gian gửi</dt>
                  <dd className="mt-1 font-medium text-[#444444]">{formatDate(detailRow.submitted_at)}</dd>
                </div>
                <div className="rounded-xl border border-[#FFF0F0] bg-[#FFF8F8] p-4 sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#E02020]">Nội dung phản hồi</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-[#444444]">{detailRow.feedback_text}</dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-end border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
              <Button
                size="sm"
                variant="outline"
                className="border-[#E0E0E0] text-[#444444]"
                startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
                onClick={() => setDetailOpen(false)}
              >
                Đóng
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
