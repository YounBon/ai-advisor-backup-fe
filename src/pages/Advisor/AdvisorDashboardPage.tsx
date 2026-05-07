import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertIcon,
  AngleDownIcon,
  ArrowRightIcon,
  GroupIcon,
  UserCircleIcon,
} from '@/icons'
import { dashboardService } from '@/services/DashboardService'
import { advisorClassService } from '@/services/AdvisorClassService'
import { masterDataService } from '@/services/MasterDataService'
import AdvisorDashboardCharts, {
  type AlertCards,
  type AlertHistoryItem,
} from './AdvisorDashboardCharts'
import AdvisorStudentDetailModal from './AdvisorStudentDetailModal'

// ─── Hằng số ─────────────────────────────────────────────────────────────────

const LS_LAST_CLASS_KEY = 'advisor_last_class_id'

// ─── Kiểu dữ liệu ────────────────────────────────────────────────────────────

type AdvisorClass = {
  _id: string
  class_code?: string
  class_name?: string
  cohort_year?: number
  status?: string
}

type ClassInfo = {
  _id: string
  class_code?: string
  class_name?: string
  cohort_year?: number
  status?: string
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRiskLabel(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (v === -1 || v === '-1') return 'Cao'
  if (v === 0 || v === '0') return 'Trung bình'
  if (v === 1 || v === '1') return 'Thấp'
  return String(v)
}

function riskBadgeStyle(label: string): { bg: string; text: string; border: string } {
  if (label === 'Cao') return { bg: '#FFF0F0', text: '#B01818', border: '#FECACA' }
  if (label === 'Trung bình') return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }
  if (label === 'Thấp') return { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' }
  return { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' }
}

function classDisplayLabel(c: AdvisorClass): string {
  return [c.class_code, c.class_name].filter(Boolean).join(' — ') || c._id
}

function initialsFromName(name: string | null | undefined): string {
  const s = (name ?? '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0]; const b = parts[parts.length - 1][0]
    if (a && b) return `${a}${b}`.toUpperCase()
  }
  return s.slice(0, 2).toUpperCase()
}

function suggestActions(row: StudentRow): string[] {
  const label = formatRiskLabel(row.risk_label)
  const highRisk = row.alerts?.high_risk ?? 0
  const sentiment = row.alerts?.negative_sentiment_30d ?? 0
  const actions: string[] = []

  if (label === 'Cao') {
    actions.push('Liên hệ sinh viên trong tuần này để nắm tình hình học tập')
    actions.push('Lên lịch buổi tư vấn học tập khẩn cấp')
  }
  if (highRisk > 0 && sentiment > 0) {
    actions.push('Kết hợp hỗ trợ tâm lý và học thuật — sinh viên đang gặp khó khăn toàn diện')
  } else if (sentiment > 0) {
    actions.push('Gửi tin nhắn hỏi thăm, mời tham gia buổi sinh hoạt cố vấn')
  }
  if ((row.alert_count ?? 0) >= 3) {
    actions.push('Thông báo cho gia đình nếu tình trạng không cải thiện sau 2 tuần')
  }
  if (!actions.length) {
    actions.push('Theo dõi sát trong 2 tuần tới, gặp mặt nếu có dấu hiệu xấu hơn')
  }
  return actions
}

// ─── Component chính ──────────────────────────────────────────────────────────

export default function AdvisorDashboardPage() {
  const LIMIT = 20

  // Danh sách lớp & lớp đang chọn
  const [myClasses, setMyClasses] = useState<AdvisorClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [classDropOpen, setClassDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Học kỳ hiện tại
  const [activeTerm, setActiveTerm] = useState<string | null>(null)

  // Dashboard data
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [alertCards, setAlertCards] = useState<AlertCards | null>(null)
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([])
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [noAdvisorClass, setNoAdvisorClass] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Modal chi tiết sinh viên
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null)

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setClassDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Tải danh sách lớp + học kỳ active khi mount
  useEffect(() => {
    void (async () => {
      try {
        const [classRes, termRes] = await Promise.all([
          advisorClassService.getMyAdvisorClasses(),
          masterDataService.getActiveTerm(),
        ])
        const classes = (classRes.data as AdvisorClass[]) ?? []
        setMyClasses(classes)

        const saved = localStorage.getItem(LS_LAST_CLASS_KEY)
        const validSaved = saved && classes.find(c => c._id === saved)
        const firstActive = classes.find(c => c.status === 'ACTIVE') ?? classes[0]
        setSelectedClassId(validSaved ? saved : (firstActive?._id ?? null))

        const term = termRes.data as { term_name?: string; term_code?: string } | null
        setActiveTerm(term?.term_name ?? term?.term_code ?? null)
      } catch {
        toast.error('Không tải được danh sách lớp cố vấn')
      }
    })()
  }, [])

  // Tải dashboard khi lớp thay đổi
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page: 1, limit: LIMIT, risk_threshold: 0.7 }
      if (selectedClassId) body.class_id = selectedClassId

      const res = await dashboardService.getAdvisorDashboard(body)
      const data = res.data as {
        student_table?: StudentRow[]
        recent_alerts?: { is_read?: boolean }[]
        pagination?: Pagination
        alert_cards?: AlertCards
        alert_history?: AlertHistoryItem[]
        class_info?: ClassInfo
      }

      setRows(data.student_table ?? [])
      setPagination(data.pagination ?? null)
      setAlertCards(data.alert_cards ?? null)
      setAlertHistory(data.alert_history ?? [])
      setClassInfo(data.class_info ?? null)
      setUnreadCount((data.recent_alerts ?? []).filter(a => !a.is_read).length)

      const isEmpty =
        (data.pagination?.total ?? 0) === 0 &&
        (data.student_table?.length ?? 0) === 0 &&
        !data.class_info
      setNoAdvisorClass(isEmpty)
    } catch {
      toast.error('Không tải được dữ liệu tổng quan. Vui lòng thử lại.')
      setRows([]); setPagination(null)
      setAlertCards(null); setAlertHistory([]); setClassInfo(null)
      setNoAdvisorClass(false)
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedClassId !== null) void loadDashboard()
  }, [loadDashboard, selectedClassId])

  const handleSelectClass = (id: string) => {
    setSelectedClassId(id)
    localStorage.setItem(LS_LAST_CLASS_KEY, id)
    setClassDropOpen(false)
  }

  const openDetail = (id: string) => { setDetailStudentId(id); setDetailOpen(true) }
  const closeDetail = () => { setDetailOpen(false); setDetailStudentId(null) }

  const paginationTotal = pagination?.total ?? 0
  const selectedClass = myClasses.find(c => c._id === selectedClassId)
  const classLabel = classInfo
    ? [classInfo.class_code, classInfo.class_name].filter(Boolean).join(' — ')
    : (selectedClass ? classDisplayLabel(selectedClass) : null)

  // Sinh viên cần ưu tiên: risk Cao hoặc >= 2 cảnh báo
  const urgentRows = rows.filter(r =>
    formatRiskLabel(r.risk_label) === 'Cao' || (r.alert_count ?? 0) >= 2
  )

  // Phân trang bảng ưu tiên — client-side, 5 bản ghi/trang
  const URGENT_PAGE_SIZE = 5
  const [urgentPage, setUrgentPage] = useState(1)
  const urgentTotalPages = Math.max(1, Math.ceil(urgentRows.length / URGENT_PAGE_SIZE))
  const urgentPagedRows = urgentRows.slice(
    (urgentPage - 1) * URGENT_PAGE_SIZE,
    urgentPage * URGENT_PAGE_SIZE,
  )
  // Reset về trang 1 khi lớp thay đổi
  useEffect(() => { setUrgentPage(1) }, [selectedClassId])

  return (
    <>
      <PageMeta
        title="Tổng quan lớp cố vấn"
        description="Theo dõi tình hình học tập, cảm xúc và cảnh báo của sinh viên trong lớp cố vấn"
      />

      {/* ── Tiêu đề trang — đồng nhất với student dashboard ── */}
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderLeft: '4px solid #E02020' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Cố vấn học tập</p>
          <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Tổng quan lớp cố vấn</h1>
        </div>

        {/* Dropdown chọn lớp */}
        {myClasses.length > 0 && (
          <div className="relative" ref={dropRef}>
            <button
              type="button"
              onClick={() => setClassDropOpen(v => !v)}
              className="flex items-center gap-2 rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 text-sm font-semibold text-[#111111] shadow-sm transition-colors hover:border-[#E02020]/50 hover:text-[#E02020]"
            >
              <span className={`size-2 shrink-0 rounded-full ${selectedClass?.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {selectedClass ? classDisplayLabel(selectedClass) : 'Chọn lớp'}
              <AngleDownIcon className={`size-4 text-[#6B7280] transition-transform ${classDropOpen ? 'rotate-180' : ''}`} />
            </button>
            {classDropOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[240px] rounded-2xl border border-[#F0F0F0] bg-white py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                {myClasses.map(c => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleSelectClass(c._id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#FFF8F8] ${c._id === selectedClassId ? 'font-semibold text-[#E02020]' : 'text-[#444444]'
                      }`}
                  >
                    <span className={`size-2 shrink-0 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {classDisplayLabel(c)}
                    {c.cohort_year
                      ? <span className="ml-auto text-xs text-[#9CA3AF]">Khóa {c.cohort_year}</span>
                      : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Biểu đồ & KPI ── */}
      <AdvisorDashboardCharts
        studentTable={rows}
        alertCards={alertCards}
        alertHistory={alertHistory}
        paginationTotal={paginationTotal}
        unreadNotifications={unreadCount}
        noAdvisorClass={noAdvisorClass}
        activeTerm={activeTerm}
        classLabel={classLabel}
      />

      {/* ── Bảng sinh viên cần ưu tiên can thiệp ── */}
      {!noAdvisorClass && (
        <section className="mb-6">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#FFF0F0]">
              <AlertIcon className="size-4 text-[#E02020]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Sinh viên cần ưu tiên can thiệp</h2>
              <p className="text-xs text-[#6B7280]">
                Sinh viên có mức rủi ro <strong>Cao</strong> hoặc từ 2 cảnh báo trở lên trong lớp đang xem
              </p>
            </div>
            {urgentRows.length > 0 && (
              <span className="ml-auto rounded-full bg-[#FFF0F0] px-3 py-0.5 text-sm font-bold text-[#E02020]">
                {urgentRows.length} sinh viên
              </span>
            )}
          </div>

          {/* Bảng */}
          <div className="overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <div className="size-9 shrink-0 rounded-full bg-[#F0F0F0]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded bg-[#F0F0F0]" />
                      <div className="h-2.5 w-56 rounded bg-[#F0F0F0]" />
                    </div>
                    <div className="h-7 w-24 rounded-lg bg-[#F0F0F0]" />
                  </div>
                ))}
              </div>
            ) : urgentRows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F0FDF4]">
                  <GroupIcon className="size-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-[#111111]">Tất cả sinh viên đang ổn định</p>
                <p className="text-xs text-[#6B7280]">
                  Không có sinh viên nào cần can thiệp khẩn cấp trong lớp này.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                        <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                          Sinh viên
                        </TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                          Mã SV
                        </TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                          Mức rủi ro
                        </TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                          Cảnh báo
                        </TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                          Đề xuất hành động
                        </TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                          Thao tác
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {urgentPagedRows.map(row => {
                        const label = formatRiskLabel(row.risk_label)
                        const badge = riskBadgeStyle(label)
                        const actions = suggestActions(row)
                        return (
                          <TableRow
                            key={row.student_user_id}
                            className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]"
                          >
                            {/* Sinh viên */}
                            <TableCell className="px-5 py-3.5 align-middle">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
                                >
                                  {initialsFromName(row.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-[#111111]">{row.full_name ?? '—'}</p>
                                  {row.email && (
                                    <p className="truncate text-xs text-[#6B7280]">{row.email}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Mã SV */}
                            <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                              <span className="font-mono text-sm text-[#444444]">{row.student_code ?? '—'}</span>
                            </TableCell>

                            {/* Mức rủi ro */}
                            <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                              <span
                                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}
                              >
                                {label}
                              </span>
                            </TableCell>

                            {/* Cảnh báo — badge nằm ngang */}
                            <TableCell className="px-4 py-3.5 align-middle">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(row.alerts?.high_risk ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F0] px-2.5 py-1 text-[11px] font-medium text-[#B01818]">
                                    <span className="size-1.5 shrink-0 rounded-full bg-[#E02020]" />
                                    {row.alerts!.high_risk} học tập
                                  </span>
                                )}
                                {(row.alerts?.negative_sentiment_30d ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-medium text-[#92400E]">
                                    <span className="size-1.5 shrink-0 rounded-full bg-[#eab308]" />
                                    {row.alerts!.negative_sentiment_30d} cảm xúc
                                  </span>
                                )}
                                {(row.alert_count ?? 0) === 0 && (
                                  <span className="text-xs text-[#9CA3AF]">—</span>
                                )}
                              </div>
                            </TableCell>

                            {/* Đề xuất hành động */}
                            <TableCell className="px-4 py-3.5 align-middle">
                              <ul className="space-y-1.5">
                                {actions.map((a, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#444444]">
                                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#E02020]/40" aria-hidden />
                                    {a}
                                  </li>
                                ))}
                              </ul>
                            </TableCell>

                            {/* Thao tác */}
                            <TableCell className="whitespace-nowrap px-5 py-3.5 text-right align-middle">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-xl border-[#E02020]/30 text-[#E02020] hover:bg-[#FFF0F0]"
                                startIcon={<UserCircleIcon className="size-3.5" />}
                                endIcon={<ArrowRightIcon className="size-3.5" />}
                                onClick={() => openDetail(row.student_user_id)}
                              >
                                Xem hồ sơ
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination bar — chỉ hiện khi có > 1 trang */}
                {urgentTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-[#F0F0F0] pt-4">
                    <p className="text-xs text-[#6B7280]">
                      Hiển thị{' '}
                      <span className="font-semibold text-[#111111]">
                        {(urgentPage - 1) * URGENT_PAGE_SIZE + 1}–{Math.min(urgentPage * URGENT_PAGE_SIZE, urgentRows.length)}
                      </span>{' '}
                      / {urgentRows.length} sinh viên
                    </p>
                    <div className="flex items-center gap-1">
                      {/* Prev */}
                      <button
                        type="button"
                        onClick={() => setUrgentPage(p => Math.max(1, p - 1))}
                        disabled={urgentPage === 1}
                        aria-label="Trang trước"
                        className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {/* Số trang */}
                      {Array.from({ length: urgentTotalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === urgentTotalPages || Math.abs(p - urgentPage) <= 1)
                        .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                          acc.push(p)
                          return acc
                        }, [])
                        .map((item, idx) =>
                          item === 'ellipsis' ? (
                            <span key={`e-${idx}`} className="flex size-8 items-center justify-center text-xs text-[#9CA3AF]">…</span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setUrgentPage(item)}
                              aria-label={`Trang ${item}`}
                              aria-current={urgentPage === item ? 'page' : undefined}
                              className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${urgentPage === item
                                ? 'border-[#E02020] bg-[#E02020] text-white'
                                : 'border-[#F0F0F0] bg-white text-[#444444] hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              {item}
                            </button>
                          )
                        )}

                      {/* Next */}
                      <button
                        type="button"
                        onClick={() => setUrgentPage(p => Math.min(urgentTotalPages, p + 1))}
                        disabled={urgentPage === urgentTotalPages}
                        aria-label="Trang sau"
                        className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <AdvisorStudentDetailModal
        isOpen={detailOpen}
        studentUserId={detailStudentId}
        onClose={closeDetail}
      />
    </>
  )
}
