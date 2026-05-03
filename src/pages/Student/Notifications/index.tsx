import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { notificationService } from '@/services/NotificationService'
import { AlertIcon, BoltIcon, CheckLineIcon, TimeIcon } from '@/icons'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type NotifRow = {
  _id: string
  title?: string
  content?: string
  sent_at?: string
  is_read?: boolean
  alert_id?: {
    alert_type?: string
    severity?: string
    term_id?: { term_code?: string; term_name?: string } | string | null
  } | string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function termLabel(row: NotifRow): string {
  const a = row.alert_id
  if (!a || typeof a !== 'object') return '—'
  const t = a.term_id
  if (t && typeof t === 'object') return t.term_name || t.term_code || '—'
  return '—'
}

function alertType(row: NotifRow): string {
  const a = row.alert_id
  if (a && typeof a === 'object' && a.alert_type) return a.alert_type
  return '—'
}

function alertTypeBadge(type: string) {
  switch (type) {
    case 'RISK':
      return { label: 'Rủi ro học tập', cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' }
    case 'SENTIMENT':
      return { label: 'Cảm xúc tiêu cực', cls: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300' }
    case 'ANOMALY':
      return { label: 'Bất thường', cls: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' }
    default:
      return { label: type, cls: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300' }
  }
}

function formatDt(iso?: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('vi-VN') } catch { return iso }
}

// ─── Pagination bar (tái sử dụng pattern từ các trang khác) ──────────────────
function PaginationBar({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between border-t border-[#F0F0F0] pt-4 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Trang <span className="font-semibold text-gray-700 dark:text-gray-300">{page}</span> / {totalPages} ·{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span> thông báo
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          aria-label="Trang trước"
          className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
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
              <button key={item} type="button" onClick={() => onPage(item)}
                aria-current={page === item ? 'page' : undefined}
                className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors
                  ${page === item
                    ? 'border-[#E02020] bg-[#E02020] text-white'
                    : 'border-[#F0F0F0] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  }`}>
                {item}
              </button>
            )
          )}
        <button type="button" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          aria-label="Trang sau"
          className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentNotificationsPage() {
  const [page, setPage] = useState(1)
  const limit = 5
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState<string | 'all' | null>(null)
  const [rows, setRows] = useState<NotifRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)
  const [totalRead, setTotalRead] = useState(0)

  // unreadCount trên trang hiện tại — dùng để hiện/ẩn nút "Đánh dấu tất cả"
  const unreadCount = rows.filter(r => !r.is_read).length

  const loadList = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const [listRes, unreadRes, readRes] = await Promise.all([
        notificationService.listNotifications({ page: p, limit }),
        notificationService.listNotifications({ page: 1, limit: 1, is_read: false }),
        notificationService.listNotifications({ page: 1, limit: 1, is_read: true }),
      ])
      const data = listRes.data as { items: NotifRow[]; pagination: Pagination }
      setRows(data.items ?? [])
      setPagination(data.pagination ?? null)
      setTotalUnread((unreadRes.data as { pagination: Pagination }).pagination?.total ?? 0)
      setTotalRead((readRes.data as { pagination: Pagination }).pagination?.total ?? 0)
    } catch {
      toast.error('Không tải được thông báo')
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => { void loadList() }, [loadList])

  const handleMarkOne = async (id: string) => {
    setMarking(id)
    try {
      await notificationService.markAsRead({ notification_id: id })
      setRows(prev => prev.map(r => r._id === id ? { ...r, is_read: true } : r))
      setTotalUnread(prev => Math.max(0, prev - 1))
      setTotalRead(prev => prev + 1)
    } catch {
      toast.error('Không thể đánh dấu đã đọc')
    } finally {
      setMarking(null)
    }
  }

  const handleMarkAll = async () => {
    setMarking('all')
    try {
      await notificationService.markAsRead({ mark_all: true })
      setRows(prev => prev.map(r => ({ ...r, is_read: true })))
      setTotalRead(prev => prev + totalUnread)
      setTotalUnread(0)
      toast.success('Đã đánh dấu tất cả là đã đọc')
    } catch {
      toast.error('Không thể đánh dấu tất cả')
    } finally {
      setMarking(null)
    }
  }

  const handlePage = (p: number) => {
    setPage(p)
    void loadList(p)
  }

  return (
    <>
      <PageMeta title="Thông báo | Sinh viên" description="Thông báo và cảnh báo dành cho bạn" />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-[#E02020]/20 bg-gradient-to-br from-[#FFF0F0] via-white to-rose-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(224,32,32,0.2)] ring-1 ring-[#E02020]/10 sm:p-6"
        aria-labelledby="student-notif-hero-title"
      >
        <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[#E02020]/10 blur-3xl" aria-hidden />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#E02020] shadow-sm ring-1 ring-[#E02020]/20">
              <BoltIcon className="size-3.5 shrink-0" aria-hidden />
              Hộp thư
            </p>
            <h2 id="student-notif-hero-title" className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Cảnh báo & thông báo dành cho bạn
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Hệ thống sẽ gửi thông báo khi phát hiện rủi ro học tập, cảm xúc tiêu cực hoặc dấu hiệu bất thường.
            </p>
          </div>

          {/* Stat cards */}
          <div className="flex shrink-0 flex-wrap gap-3 lg:flex-nowrap">
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-[#E02020]/15 bg-white/80 px-5 py-4 text-center shadow-sm">
              <span className="tabular-nums text-2xl font-extrabold text-[#E02020]">
                {pagination?.total ?? rows.length}
              </span>
              <span className="mt-1 text-[11px] font-medium text-gray-500">Tổng</span>
            </div>
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-[#E02020]/15 bg-white/80 px-5 py-4 text-center shadow-sm">
              <span className="tabular-nums text-2xl font-extrabold text-amber-500">
                {totalUnread}
              </span>
              <span className="mt-1 text-[11px] font-medium text-gray-500">Chưa đọc</span>
            </div>
            <div className="flex min-w-[100px] flex-col items-center justify-center rounded-xl border border-[#E02020]/15 bg-white/80 px-5 py-4 text-center shadow-sm">
              <span className="tabular-nums text-2xl font-extrabold text-[#12B76A]">
                {totalRead}
              </span>
              <span className="mt-1 text-[11px] font-medium text-gray-500">Đã đọc</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── BẢNG ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white/90">
            <TimeIcon className="size-5 text-[#E02020]" aria-hidden />
            Thông báo gần đây
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                disabled={marking === 'all'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0F0F0] bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <CheckLineIcon className="size-3.5 shrink-0" aria-hidden />
                {marking === 'all' ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadList()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0F0F0] bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <svg className={`size-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-4" aria-busy="true">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB] dark:border-gray-800 dark:bg-white/[0.04]">
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Thời gian
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Loại
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Học kỳ
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nội dung
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Trạng thái
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-4 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0] text-[#E02020]">
                            <BoltIcon className="size-6" aria-hidden />
                          </div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Không có thông báo</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Khi hệ thống phát hiện cảnh báo, chúng sẽ hiển thị tại đây.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => {
                      const type = alertType(row)
                      const badge = alertTypeBadge(type)
                      const isMarkingThis = marking === row._id
                      return (
                        <TableRow
                          key={row._id}
                          className={`border-b border-[#F0F0F0] transition-colors last:border-0 hover:bg-[#F9FAFB] dark:border-gray-800 dark:hover:bg-white/[0.03] ${!row.is_read ? 'bg-[#FFFAFA]' : ''}`}
                        >
                          <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300">
                            {formatDt(row.sent_at)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-center text-xs text-gray-700 dark:text-gray-300">
                            {termLabel(row)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className={`font-semibold ${!row.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {row.title ?? '—'}
                            </div>
                            {row.content && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {row.content}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-center">
                            {row.is_read ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                                <CheckLineIcon className="size-3.5 shrink-0" aria-hidden />
                                Đã đọc
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleMarkOne(row._id)}
                                disabled={isMarkingThis || marking === 'all'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"
                              >
                                <AlertIcon className="size-3.5 shrink-0" aria-hidden />
                                {isMarkingThis ? '...' : 'Chưa đọc'}
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              page={page}
              totalPages={pagination?.total_pages ?? 1}
              total={pagination?.total ?? rows.length}
              onPage={handlePage}
            />
          </>
        )}
      </div>
    </>
  )
}
