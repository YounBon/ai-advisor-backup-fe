import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

import PageMeta from '@/components/common/PageMeta'

import PageBreadcrumb from '@/components/common/PageBreadCrumb'

import Button from '@/components/ui/button/Button'

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'

import { notificationService } from '@/services/NotificationService'

import {

  AlertIcon,

  AngleLeftIcon,

  AngleRightIcon,

  BoltIcon,

  CheckLineIcon,
  TimeIcon,

} from '@/icons'



type Pagination = {

  page: number

  limit: number

  total: number

  total_pages: number

}



type NotifRow = {

  _id: string

  type?: string

  title?: string

  content?: string

  sent_at?: string

  is_read?: boolean

}



function formatDt(iso?: string): string {

  if (!iso) return '—'

  try {

    return new Date(iso).toLocaleString('vi-VN')

  } catch {

    return iso

  }

}



export default function AdvisorNotificationsPage() {

  const [page, setPage] = useState(1)

  const limit = 20

  const [loading, setLoading] = useState(false)

  const [rows, setRows] = useState<NotifRow[]>([])

  const [pagination, setPagination] = useState<Pagination | null>(null)

  const loadList = useCallback(async () => {

    setLoading(true)

    try {

      const res = await notificationService.listNotifications({ page, limit })

      const data = res.data as { items: NotifRow[]; pagination: Pagination }

      setRows(data.items ?? [])

      setPagination(data.pagination ?? null)

    } catch {

      toast.error('Không tải được thông báo')

      setRows([])

      setPagination(null)

    } finally {

      setLoading(false)

    }

  }, [page, limit])



  useEffect(() => {

    void loadList()

  }, [loadList])


  return (

    <>

      <PageMeta

        title="Thông báo | Advisor"

        description="POST /api/notification/list và /notification/generate"

      />

      <PageBreadcrumb pageTitle="Thông báo & cảnh báo" />



      <section

        className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/45 bg-gradient-to-br from-brand-50 via-white to-amber-50/35 p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.26)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/45 dark:via-gray-900 dark:to-amber-950/20 dark:ring-brand-400/10 sm:p-6 md:flex md:items-center md:justify-between md:gap-8"

        aria-labelledby="notif-hero-title"

      >

        <div

          className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-brand-400/18 blur-3xl dark:bg-brand-500/12"

          aria-hidden

        />

        <div className="relative z-10 max-w-2xl">

          <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/25">

            <BoltIcon className="size-3.5 shrink-0" aria-hidden />

            Hộp thư cố vấn

          </p>

          <h2

            id="notif-hero-title"

            className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"

          >

            Cảnh báo rủi ro & thông báo sau phân tích

          </h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">

            Xem lịch sử bên dưới; khi cần làm mới cảnh báo theo ngưỡng bạn chọn — bấm nút chính bên

            phải (gọi API generate trong phạm vi lớp của bạn).

          </p>

        </div>
      </section>



      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] sm:p-6">

        <div className="mb-5 flex flex-col gap-2 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">

              Danh sách

            </p>

            <h3 className="mt-1 flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">

              <TimeIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />

              Thông báo gần đây

            </h3>

          </div>

          {pagination != null ? (

            <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-gray-50/90 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-200">

              <span className="tabular-nums text-gray-900 dark:text-white">{pagination.total}</span>

              <span className="font-normal text-gray-500">bản ghi</span>

            </span>

          ) : null}

        </div>



        {loading ? (

          <div className="space-y-3 py-4" aria-busy="true">

            {[1, 2, 3, 4, 5, 6].map(i => (

              <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />

            ))}

          </div>

        ) : (

          <>

            <Table className="text-left text-sm">

              <TableHeader>

                <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Thời gian

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Nội dung

                  </TableCell>

                  <TableCell isHeader className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">

                    Trạng thái

                  </TableCell>

                </TableRow>

              </TableHeader>

              <TableBody>

                {rows.length === 0 ? (

                  <TableRow>

                    <TableCell colSpan={3} className="px-4 py-14 text-center">

                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">

                        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">

                          <BoltIcon className="size-6" aria-hidden />

                        </div>

                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">

                          Chưa có thông báo

                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400">

                          Chạy <span className="font-semibold text-brand-600">Tạo / làm mới cảnh báo</span> phía

                          trên để sinh cảnh báo từ dữ liệu lớp.

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

                      <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300">

                        {formatDt(row.sent_at)}

                      </TableCell>

                      <TableCell className="max-w-md px-4 py-3.5">

                        {row.type ? (

                          <span className="mb-1 inline-flex rounded-md border border-gray-200/90 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400">

                            {row.type}

                          </span>

                        ) : null}

                        <div className="font-semibold text-gray-900 dark:text-white/90">

                          {row.title ?? '—'}

                        </div>

                        {row.content ? (

                          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">

                            {row.content}

                          </p>

                        ) : null}

                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-right">

                        {row.is_read ? (

                          <span className="inline-flex items-center justify-end gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">

                            <CheckLineIcon className="size-3.5 shrink-0" aria-hidden />

                            Đã đọc

                          </span>

                        ) : (

                          <span className="inline-flex items-center justify-end gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">

                            <AlertIcon className="size-3.5 shrink-0" aria-hidden />

                            Chưa đọc

                          </span>

                        )}

                      </TableCell>

                    </TableRow>

                  ))

                )}

              </TableBody>

            </Table>

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

          </>

        )}

      </div>
    </>

  )

}

