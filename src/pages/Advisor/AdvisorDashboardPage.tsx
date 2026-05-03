import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { AlertIcon, AngleLeftIcon, AngleRightIcon, ArrowRightIcon, GroupIcon, UserCircleIcon } from '@/icons'
import { dashboardService } from '@/services/DashboardService'
import AdvisorDashboardCharts, {
  type AlertCards,
  type AlertOpenRow,
} from './AdvisorDashboardCharts'
import AdvisorStudentDetailModal from './AdvisorStudentDetailModal'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type StudentRow = {
  student_user_id: string
  student_code?: string | null
  full_name?: string | null
  email?: string
  risk_score?: number | null
  risk_label?: number | string | null
  alert_count?: number
  alerts?: { negative_sentiment_30d?: number; high_risk?: number }
}

type AlertItem = {
  _id: string
  title?: string
  content?: string
  sent_at?: string
  is_read?: boolean
  alert_id?: {
    _id?: string
    alert_type?: string
    severity?: string
    status?: string
    detected_at?: string
    student_user_id?: string
  } | null
}

function formatRiskLabel(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  // Convert numeric values to text labels
  if (v === -1 || v === '-1') return 'High'
  if (v === 0 || v === '0') return 'Medium'
  if (v === 1 || v === '1') return 'Low'
  return String(v)
}

function riskLabelBadgeClass(label: number | string | null | undefined): string {
  const normalized = formatRiskLabel(label)
  if (normalized === 'High') return 'bg-red-500/15 text-red-700 dark:text-red-400'
  if (normalized === 'Medium') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
  if (normalized === 'Low') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

function severityBadgeClass(sev?: string): string {
  const s = (sev ?? '').toUpperCase()
  if (s === 'HIGH' || s === 'CRITICAL')
    return 'bg-red-500/15 text-red-700 dark:text-red-400'
  if (s === 'MEDIUM') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
  if (s === 'LOW') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

function formatDt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

function initialsFromName(name: string | null | undefined): string {
  const s = (name ?? '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0]
    const b = parts[parts.length - 1][0]
    if (a && b) return `${a}${b}`.toUpperCase()
  }
  return s.slice(0, 2).toUpperCase()
}

/** Hiển thị thân thiện; màu badge vẫn dựa trên formatRiskLabel */
function riskLevelDisplayVi(label: number | string | null | undefined): string {
  const k = formatRiskLabel(label)
  if (k === 'High') return 'Cao'
  if (k === 'Medium') return 'Trung bình'
  if (k === 'Low') return 'Thấp'
  return k
}

export default function AdvisorDashboardPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const riskThreshold = '0.7'

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([])
  const [alertCards, setAlertCards] = useState<AlertCards | null>(null)
  const [riskAlerts, setRiskAlerts] = useState<AlertOpenRow[]>([])
  const [sentimentAlerts, setSentimentAlerts] = useState<AlertOpenRow[]>([])
  const [anomalyAlerts, setAnomalyAlerts] = useState<AlertOpenRow[]>([])
  const [noAdvisorClass, setNoAdvisorClass] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const thr = Number.parseFloat(riskThreshold)
      const t = Number.isFinite(thr) ? Math.min(1, Math.max(0, thr)) : 0
      const res = await dashboardService.getAdvisorDashboard({
        page,
        limit,
        risk_threshold: t,
      })
      const data = res.data as {
        student_table?: StudentRow[]
        recent_alerts?: AlertItem[]
        pagination?: Pagination
        alert_cards?: AlertCards
        risk_alerts?: AlertOpenRow[]
        sentiment_alerts?: AlertOpenRow[]
        anomaly_alerts?: AlertOpenRow[]
      }
      setRows(data.student_table ?? [])
      setRecentAlerts(data.recent_alerts ?? [])
      setPagination(data.pagination ?? null)
      setAlertCards(data.alert_cards ?? null)
      setRiskAlerts(data.risk_alerts ?? [])
      setSentimentAlerts(data.sentiment_alerts ?? [])
      setAnomalyAlerts(data.anomaly_alerts ?? [])
      const p = data.pagination
      const emptyClass =
        (p?.total ?? 0) === 0 &&
        (data.student_table?.length ?? 0) === 0 &&
        (data.recent_alerts?.length ?? 0) === 0
      setNoAdvisorClass(emptyClass)
    } catch {
      toast.error('Không tải được dashboard cố vấn')
      setRows([])
      setRecentAlerts([])
      setPagination(null)
      setAlertCards(null)
      setRiskAlerts([])
      setSentimentAlerts([])
      setAnomalyAlerts([])
      setNoAdvisorClass(false)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const openStudentDetail = (studentId: string) => {
    setDetailStudentId(studentId)
    setDetailOpen(true)
  }

  const closeStudentDetail = () => {
    setDetailOpen(false)
    setDetailStudentId(null)
  }

  const unreadRecent = recentAlerts.filter(a => !a.is_read).length
  const paginationTotal = pagination?.total ?? 0

  return (
    <>
      <PageMeta
        title="Tổng quan cố vấn | Advisor"
        description="POST /api/dashboard/advisor — rủi ro & ưu tiên can thiệp"
      />
      <PageBreadcrumb pageTitle="Tổng quan rủi ro (cố vấn)" />

      <AdvisorDashboardCharts
        studentTable={rows}
        alertCards={alertCards}
        riskAlerts={riskAlerts}
        sentimentAlerts={sentimentAlerts}
        anomalyAlerts={anomalyAlerts}
        paginationTotal={paginationTotal}
        unreadNotifications={unreadRecent}
        noAdvisorClass={noAdvisorClass}
      />

      {!noAdvisorClass ? (
        <section
          className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/50 bg-gradient-to-br from-brand-50 via-white to-violet-50/50 p-5 shadow-[0_14px_44px_-14px_rgba(70,95,255,0.35)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/55 dark:via-gray-900 dark:to-violet-950/35 dark:ring-brand-400/10 sm:p-6 md:flex md:items-center md:justify-between md:gap-8"
          aria-labelledby="advisor-spotlight-heading"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-brand-400/25 blur-3xl dark:bg-brand-500/20" aria-hidden />
          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/30">
              <AlertIcon className="size-3.5 shrink-0" aria-hidden />
              Trung tâm theo dõi
            </p>
            <h2 id="advisor-spotlight-heading" className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Ưu tiên can thiệp theo rủi ro & cảnh báo thời gian thực
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Dùng thống kê phía trên để nắm tổng thể; bảng sinh viên và cột cảnh báo bên dưới giúp bạn hành động nhanh, có mục tiêu.
            </p>
          </div>
          <div className="relative z-10 mt-6 flex shrink-0 flex-wrap gap-3 md:mt-0">
            <div className="min-w-[5.5rem] rounded-xl border border-white/80 bg-white/95 px-4 py-3 text-center shadow-md ring-1 ring-gray-900/[0.04] dark:border-white/10 dark:bg-gray-900/80 dark:ring-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lớp</p>
              <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{paginationTotal}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">sinh viên</p>
            </div>
            <div className="min-w-[5.5rem] rounded-xl border border-amber-200/60 bg-gradient-to-b from-amber-50 to-white px-4 py-3 text-center shadow-md ring-1 ring-amber-500/10 dark:border-amber-500/20 dark:from-amber-950/40 dark:to-gray-900 dark:ring-amber-400/15">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Chưa đọc</p>
              <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-amber-900 dark:text-amber-200">{unreadRecent}</p>
              <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80">thông báo</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="xl:col-span-8">
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)] dark:ring-white/[0.05] sm:p-6">
            <div className="mb-5 flex flex-col gap-2 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Hành động chính</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-xl">
                  Danh sách sinh viên (lớp cố vấn)
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chọn <span className="font-medium text-gray-700 dark:text-gray-300">Xem hồ sơ</span> để mở chi tiết rủi ro.
              </p>
            </div>
            {loading ? (
              <div className="space-y-3 py-2" aria-busy="true" aria-label="Đang tải danh sách">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-4 rounded-lg bg-gray-100/80 px-3 py-3 dark:bg-white/[0.06]"
                  >
                    <div className="size-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 max-w-[55%] rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2.5 w-56 max-w-[70%] rounded bg-gray-200/80 dark:bg-gray-600" />
                    </div>
                    <div className="hidden h-8 w-24 shrink-0 rounded-lg bg-gray-200 sm:block dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="text-left text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60">
                        <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Sinh viên
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Mã SV
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Điểm rủi ro
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Mức độ
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Cảnh báo
                        </TableCell>
                        <TableCell isHeader className="w-px whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Thao tác
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="px-4 py-14 text-center">
                            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                <GroupIcon className="size-7" />
                              </div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                Chưa có sinh viên trong lớp cố vấn
                              </p>
                              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                Khi được gán lớp, danh sách sẽ hiện ở đây. Liên hệ quản trị nếu bạn cần hỗ trợ gán lớp.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map(row => (
                          <TableRow
                            key={row.student_user_id}
                            className="border-b border-gray-100 bg-white transition-colors duration-150 last:border-0 hover:bg-gray-50/90 dark:border-gray-800/80 dark:bg-transparent dark:hover:bg-white/[0.03]"
                          >
                            <TableCell className="px-4 py-3.5 align-middle">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-xs font-bold text-brand-700 ring-2 ring-white dark:from-brand-500/25 dark:to-brand-500/10 dark:text-brand-200 dark:ring-gray-900"
                                  aria-hidden
                                >
                                  {initialsFromName(row.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-gray-900 dark:text-white/90">
                                    {row.full_name ?? '—'}
                                  </div>
                                  {row.email ? (
                                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">{row.email}</div>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 align-middle text-gray-700 dark:text-gray-300">
                              <span className="font-mono text-sm">{row.student_code ?? '—'}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 align-middle font-mono text-sm tabular-nums text-gray-800 dark:text-white/85">
                              {row.risk_score != null ? row.risk_score.toFixed(3) : '—'}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 align-middle">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskLabelBadgeClass(row.risk_label)}`}
                              >
                                {riskLevelDisplayVi(row.risk_label)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 align-middle">
                              {(row.alert_count ?? 0) > 0 ? (
                                <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 tabular-nums dark:bg-amber-500/15 dark:text-amber-300">
                                  {row.alert_count}
                                </span>
                              ) : (
                                <span className="text-sm tabular-nums text-gray-400 dark:text-gray-500">0</span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-right align-middle">
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                className="rounded-lg font-semibold"
                                startIcon={<UserCircleIcon className="size-3.5 shrink-0 opacity-90" />}
                                endIcon={<ArrowRightIcon className="size-3.5 shrink-0 opacity-80" />}
                                onClick={() => openStudentDetail(row.student_user_id)}
                              >
                                Xem hồ sơ
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {pagination && pagination.total_pages > 1 && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                    <p className="tabular-nums text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-white/90">{pagination.page}</span>
                      <span className="mx-1 text-gray-400">/</span>
                      {pagination.total_pages} trang ·{' '}
                      <span className="font-medium text-gray-800 dark:text-white/90">{pagination.total}</span> sinh viên
                    </p>
                    <div className="flex items-center gap-2">
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
        </div>

        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-brand-200/40 bg-gradient-to-b from-white via-white to-brand-50/30 p-5 shadow-[0_10px_36px_-12px_rgba(70,95,255,0.2)] ring-1 ring-brand-500/[0.08] dark:border-brand-500/15 dark:from-gray-900 dark:via-gray-900 dark:to-brand-950/25 dark:shadow-[0_12px_40px_-14px_rgba(0,0,0,0.55)] dark:ring-brand-400/10 sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/12 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                <AlertIcon className="size-4" aria-hidden />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">Cảnh báo gần đây</h2>
            </div>
            <p className="mb-5 border-b border-gray-100 pb-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              20 thông báo mới nhất theo lớp cố vấn.
            </p>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có bản ghi.</p>
            ) : (
              <ul className="custom-scrollbar max-h-[480px] space-y-3 overflow-y-auto pr-1 text-sm">
                {recentAlerts.map(a => (
                  <li
                    key={a._id}
                    className="rounded-xl border border-gray-100 bg-white/80 p-3.5 shadow-sm transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-brand-200/60 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/25 dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {a.title ?? a.alert_id?.alert_type ?? 'Thông báo'}
                        </span>
                        {a.alert_id?.severity ? (
                          <span
                            className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${severityBadgeClass(a.alert_id.severity)}`}
                          >
                            {a.alert_id.severity}
                          </span>
                        ) : null}
                      </div>
                      {!a.is_read ? (
                        <span className="shrink-0 rounded bg-brand-500/15 px-1.5 py-0.5 text-xs text-brand-600">
                          Mới
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{formatDt(a.sent_at)}</p>
                    {a.content ? (
                      <p className="mt-2 line-clamp-3 text-gray-600 dark:text-gray-300">
                        {a.content}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AdvisorStudentDetailModal
        isOpen={detailOpen}
        studentUserId={detailStudentId}
        onClose={closeStudentDetail}
      />
    </>
  )
}
