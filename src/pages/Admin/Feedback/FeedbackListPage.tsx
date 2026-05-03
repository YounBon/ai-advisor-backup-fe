import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

import PageMeta from '@/components/common/PageMeta'

import PageBreadcrumb from '@/components/common/PageBreadCrumb'

import { Modal } from '@/components/ui/modal'

import Button from '@/components/ui/button/Button'

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'

import { feedbackService } from '@/services/FeedbackService'

import {

  AngleLeftIcon,

  AngleRightIcon,

  ChatIcon,

  CloseLineIcon,

  EyeIcon,

  PieChartIcon,

  TimeIcon,

} from '@/icons'



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

}



function formatDate(iso?: string): string {

  if (!iso) return '—'

  try {

    return new Date(iso).toLocaleString('vi-VN')

  } catch {

    return iso

  }

}



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



const SENTIMENT_ALL = '__all__'



const emptyFilters = () => ({

  classId: '',

  studentId: '',

  advisorId: '',

  sentiment: SENTIMENT_ALL as string,

})



export type FeedbackListPageProps = {

  /** Khi set (ví dụ cố vấn), lọc cố định theo advisor_user_id và ẩn ô nhập advisor */

  presetAdvisorUserId?: string

}



export default function FeedbackListPage({ presetAdvisorUserId }: FeedbackListPageProps = {}) {

  const [page, setPage] = useState(1)

  const limit = 20

  const [loading, setLoading] = useState(false)

  const [rows, setRows] = useState<FeedbackRow[]>([])

  const [pagination, setPagination] = useState<Pagination | null>(null)



  const [applied, setApplied] = useState(() => ({

    ...emptyFilters(),

    advisorId: presetAdvisorUserId ?? '',

  }))



  const [detailOpen, setDetailOpen] = useState(false)

  const [detailRow, setDetailRow] = useState<FeedbackRow | null>(null)



  const loadList = useCallback(async () => {

    setLoading(true)

    try {

      const body: Record<string, unknown> = { page, limit }

      if (applied.classId.trim()) body.class_id = applied.classId.trim()

      if (applied.studentId.trim()) body.student_user_id = applied.studentId.trim()

      const scopedAdvisorId = presetAdvisorUserId?.trim() || applied.advisorId.trim()

      if (scopedAdvisorId) body.advisor_user_id = scopedAdvisorId

      if (applied.sentiment && applied.sentiment !== SENTIMENT_ALL)

        body.sentiment_label = applied.sentiment



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

  }, [page, limit, applied, presetAdvisorUserId])



  useEffect(() => {

    void loadList()

  }, [loadList])



  useEffect(() => {

    if (!presetAdvisorUserId) return

    setApplied(d => ({ ...d, advisorId: presetAdvisorUserId }))

    setPage(1)

  }, [presetAdvisorUserId])



  const openDetail = (row: FeedbackRow) => {

    setDetailRow(row)

    setDetailOpen(true)

  }



  const isAdvisorScope = Boolean(presetAdvisorUserId)



  return (

    <>

      <PageMeta

        title="Phản hồi | Advisor"

        description="POST /api/feedback/list — xem phản hồi sau meeting"

      />

      <PageBreadcrumb

        pageTitle={presetAdvisorUserId ? 'Phản hồi (lớp của tôi)' : 'Phản hồi (danh sách)'}

      />



      <section

        className={`relative mb-8 overflow-hidden rounded-2xl border p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.22)] ring-1 sm:p-6 md:flex md:items-center md:justify-between md:gap-8 ${

          isAdvisorScope

            ? 'border-brand-200/50 bg-gradient-to-br from-brand-50 via-white to-violet-50/50 ring-brand-500/12 dark:border-brand-500/25 dark:from-brand-950/40 dark:via-gray-900 dark:to-violet-950/25 dark:ring-brand-400/10'

            : 'border-gray-200/90 bg-gradient-to-br from-gray-50 via-white to-brand-50/30 ring-gray-900/[0.04] dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-brand-950/20 dark:ring-white/[0.05]'

        }`}

        aria-labelledby="feedback-hero-title"

      >

        <div

          className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-brand-400/15 blur-3xl dark:bg-brand-500/12"

          aria-hidden

        />

        <div className="relative z-10 max-w-2xl">

          <p

            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm ring-1 ${

              isAdvisorScope

                ? 'bg-white/95 text-brand-700 ring-brand-200/80 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/30'

                : 'bg-white/90 text-gray-700 ring-gray-200/80 dark:bg-white/5 dark:text-gray-300 dark:ring-gray-600'

            }`}

          >

            <ChatIcon className="size-3.5 shrink-0" aria-hidden />

            {isAdvisorScope ? 'Góc cố vấn' : 'Quản trị'}

          </p>

          <h2

            id="feedback-hero-title"

            className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"

          >

            {isAdvisorScope

              ? 'Phản hồi sau buổi họp — theo lớp bạn phụ trách'

              : 'Danh sách phản hồi sinh viên sau meeting'}

          </h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">

            {isAdvisorScope

              ? 'Dữ liệu đã lọc theo tài khoản cố vấn. Mở chi tiết để đọc đầy đủ nội dung và ngữ cảnh buổi họp.'

              : 'Bảng bên dưới hỗ trợ tra cứu nhanh theo thời gian, lớp và cảm xúc. Dùng Chi tiết để xem toàn văn.'}

          </p>

        </div>

        <div className="relative z-10 mt-5 flex shrink-0 flex-wrap items-center gap-2 md:mt-0">

          <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-white/5 dark:text-gray-200">

            <PieChartIcon className="size-4 text-brand-500 dark:text-brand-400" aria-hidden />

            {pagination != null ? (

              <>

                <span className="tabular-nums text-gray-900 dark:text-white">{pagination.total}</span>

                <span className="font-normal text-gray-500">bản ghi</span>

              </>

            ) : (

              <span className="text-gray-500">Đang đồng bộ...</span>

            )}

          </span>

        </div>

      </section>



      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] sm:p-6">

        <div className="mb-5 flex flex-col gap-2 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">

              Bảng dữ liệu

            </p>

            <h3 className="mt-1 flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">

              <TimeIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />

              Phản hồi gần đây

            </h3>

          </div>

        </div>



        {loading ? (

          <div className="space-y-3 py-4" aria-busy="true">

            {[1, 2, 3, 4, 5, 6].map(i => (

              <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />

            ))}

          </div>

        ) : (

          <div className="overflow-x-auto">

            <Table className="text-left text-sm">

              <TableHeader>

                <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Thời gian

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Lớp / Cố vấn

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Cảm xúc

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Đánh giá

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Nội dung (rút gọn)

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Thao tác

                  </TableCell>

                </TableRow>

              </TableHeader>

              <TableBody>

                {rows.length === 0 ? (

                  <TableRow>

                    <TableCell colSpan={6} className="px-4 py-14 text-center">

                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">

                        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">

                          <ChatIcon className="size-6" aria-hidden />

                        </div>

                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">

                          Không có bản ghi phản hồi

                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400">

                          Thử đổi bộ lọc hoặc quay lại sau khi sinh viên gửi feedback.

                        </p>

                      </div>

                    </TableCell>

                  </TableRow>

                ) : (

                  rows.map(row => (

                    <TableRow

                      key={row._id}

                      className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50/90 dark:border-gray-800 dark:hover:bg-white/[0.03]"

                    >

                      <TableCell className="max-w-[140px] whitespace-nowrap px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300">

                        {formatDate(row.submitted_at)}

                      </TableCell>

                      <TableCell className="max-w-[200px] px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400">

                        <div className="line-clamp-2 font-medium text-gray-800 dark:text-gray-200">

                          {row.class_display || '—'}

                        </div>

                        <div className="mt-0.5 line-clamp-1 text-gray-500">{row.advisor_display || '—'}</div>

                      </TableCell>

                      <TableCell className="px-4 py-3.5">

                        <span

                          className={`inline-flex max-w-[10rem] items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${sentimentPillClass(row.sentiment_label)}`}

                        >

                          <span className="line-clamp-1">{row.sentiment_label ?? '—'}</span>

                        </span>

                      </TableCell>

                      <TableCell className="px-4 py-3.5 tabular-nums text-sm font-semibold text-gray-900 dark:text-white">

                        {row.rating != null ? row.rating : '—'}

                      </TableCell>

                      <TableCell className="max-w-md px-4 py-3.5">

                        <span className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">

                          {row.feedback_text}

                        </span>

                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-right">

                        <Button

                          size="sm"

                          variant="outline"

                          className="font-semibold"

                          startIcon={<EyeIcon className="size-6 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />}

                          onClick={() => openDetail(row)}

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

        )}



        {pagination && pagination.total_pages > 1 && (

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">

            <span className="tabular-nums">

              Trang{' '}

              <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span>

              <span className="mx-1 text-gray-400">/</span>

              {pagination.total_pages} —{' '}

              <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> bản ghi

            </span>

            <div className="flex gap-2">

              <Button

                type="button"

                size="xs"

                variant="outline"

                className="!px-2.5 font-semibold"

                disabled={page <= 1}

                onClick={() => setPage(p => Math.max(1, p - 1))}

                aria-label="Trang trước"

                startIcon={<AngleLeftIcon className="size-4" aria-hidden />}

              >

                <span className="sr-only">Trang trước</span>

              </Button>

              <Button

                type="button"

                size="xs"

                variant="outline"

                className="!px-2.5 font-semibold"

                disabled={page >= pagination.total_pages}

                onClick={() => setPage(p => p + 1)}

                aria-label="Trang sau"

                endIcon={<AngleRightIcon className="size-4" aria-hidden />}

              >

                <span className="sr-only">Trang sau</span>

              </Button>

            </div>

          </div>

        )}

      </div>



      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-2xl overflow-hidden p-0">

        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/95 to-violet-50/50 px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div className="flex items-start gap-3">

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">

                <EyeIcon className="size-5" aria-hidden />

              </span>

              <div>

                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">

                  Chi tiết phản hồi

                </h3>

                {detailRow && (

                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">

                    {formatDate(detailRow.submitted_at)}

                    {detailRow.class_display ? ` · ${detailRow.class_display}` : ''}

                  </p>

                )}

              </div>

            </div>

            {detailRow?.sentiment_label ? (

              <span

                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold ${sentimentPillClass(detailRow.sentiment_label)}`}

              >

                {detailRow.sentiment_label}

              </span>

            ) : null}

          </div>

        </div>

        <div className="p-6">

          {detailRow && (

            <dl className="grid gap-4 text-sm sm:grid-cols-2">

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                  Buổi họp

                </dt>

                <dd className="mt-1 font-medium text-gray-900 dark:text-white/90">

                  {detailRow.meeting_time ? formatDate(detailRow.meeting_time) : '—'}

                </dd>

              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                  Thời gian gửi

                </dt>

                <dd className="mt-1 font-medium text-gray-900 dark:text-white/90">

                  {formatDate(detailRow.submitted_at)}

                </dd>

              </div>

              <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                  Lớp cố vấn

                </dt>

                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailRow.class_display || '—'}</dd>

              </div>

              <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                  Cố vấn

                </dt>

                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailRow.advisor_display || '—'}</dd>

              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                  Đánh giá

                </dt>

                <dd className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">

                  {detailRow.rating != null ? detailRow.rating : '—'}

                </dd>

              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                  Điểm mô hình

                </dt>

                <dd className="mt-1 font-medium text-gray-800 dark:text-white/90">

                  {detailRow.feedback_score != null ? detailRow.feedback_score.toFixed(2) : '—'}

                </dd>

              </div>

              <div className="sm:col-span-2 rounded-xl border border-brand-100/80 bg-gradient-to-br from-brand-50/40 to-white p-4 dark:border-brand-500/20 dark:from-brand-950/25 dark:to-gray-900/40">

                <dt className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">

                  Nội dung

                </dt>

                <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-white/90">

                  {detailRow.feedback_text}

                </dd>

              </div>

            </dl>

          )}

        </div>

        <div className="flex justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">

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

    </>

  )

}

