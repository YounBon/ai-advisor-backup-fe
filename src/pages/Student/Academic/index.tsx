import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { viApiError, viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { academicService } from '@/services/AcademicService'
import { dashboardService } from '@/services/DashboardService'
import { masterDataService } from '@/services/MasterDataService'
import { studentService } from '@/services/StudentService'
import {
  CheckLineIcon,
  CloseLineIcon,
  GroupIcon,
  PencilIcon,
  TimeIcon,
} from '@/icons'

// ─── Helper: initials từ họ tên ───────────────────────────────────────────────
function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('')
}

// ─── Helper: màu GPA ──────────────────────────────────────────────────────────
function gpaColorClass(gpa: number | null | undefined): string {
  if (gpa == null) return 'text-gray-400'
  if (gpa >= 3.2) return 'text-[#12B76A]'
  if (gpa >= 2.0) return 'text-[#FB6514]'
  return 'text-[#E02020]'
}

// ─── Helper: màu tỉ lệ tham dự ────────────────────────────────────────────────
function attendanceColorClass(rate: number | null | undefined): string {
  if (rate == null) return 'text-gray-400'
  if (rate >= 0.8) return 'text-[#12B76A]'
  if (rate >= 0.7) return 'text-[#FB6514]'
  return 'text-[#E02020]'
}

// ─── Emoji rating component ────────────────────────────────────────────────────
const MOTIVATION_OPTIONS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😞', label: 'Rất thấp' },
  { value: 2, emoji: '😕', label: 'Thấp' },
  { value: 3, emoji: '😐', label: 'Bình thường' },
  { value: 4, emoji: '🙂', label: 'Tốt' },
  { value: 5, emoji: '😄', label: 'Rất tốt' },
]

const STRESS_OPTIONS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😌', label: 'Rất thư giãn' },
  { value: 2, emoji: '🙂', label: 'Nhẹ nhàng' },
  { value: 3, emoji: '😐', label: 'Bình thường' },
  { value: 4, emoji: '😟', label: 'Căng thẳng' },
  { value: 5, emoji: '😰', label: 'Rất căng thẳng' },
]

function EmojiRating({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: number; emoji: string; label: string }[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const selected = value ? Number(value) : null
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(String(opt.value))}
          title={opt.label}
          className={`flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xl transition-all
            ${selected === opt.value
              ? 'border-[#E02020] bg-[#FFF0F0] ring-2 ring-[#E02020]/20'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
            }
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
        >
          <span>{opt.emoji}</span>
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

type AcademicRow = {
  term_id?: string | { _id?: string; term_code?: string; term_name?: string }
  gpa_prev_sem?: number | null
  gpa_current?: number | null
  num_failed?: number | null
  attendance_rate?: number | null
  shcvht_participation?: number | null
  study_hours?: number | null
  motivation_score?: number | null
  stress_level?: number | null
  sentiment_score?: number | null
  recorded_at?: string
}

type TermItem = { _id: string; term_code: string; term_name: string }
type MyAdvisorData = {
  advisor?: {
    _id?: string
    email?: string
    profile?: { full_name?: string }
    advisor_info?: { staff_code?: string; title?: string }
  } | null
  advisor_class?: {
    _id?: string
    class_code?: string
    class_name?: string
    department_id?: string
    major_id?: string
    department_display?: string | null
    major_display?: string | null
    status?: string
  } | null
}

type AcademicFormState = {
  termId: string
  gpaPrev: string
  gpaCur: string
  numFailed: string
  attendance: string
  shcvht: string
  studyHours: string
  motivation: string
  stress: string
}

const initialFormState: AcademicFormState = {
  termId: '',
  gpaPrev: '',
  gpaCur: '',
  numFailed: '',
  attendance: '',
  shcvht: '',
  studyHours: '',
  motivation: '',
  stress: '',
}

function termIdOf(row: AcademicRow): string {
  const t = row.term_id
  if (t && typeof t === 'object' && '_id' in t) return String(t._id)
  if (t) return String(t)
  return ''
}

const PAGE_SIZE = 5

export default function AcademicPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AcademicRow[]>([])
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const [advisorData, setAdvisorData] = useState<MyAdvisorData | null>(null)
  const [terms, setTerms] = useState<TermItem[]>([])
  const [defaultTermId, setDefaultTermId] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<AcademicFormState>(initialFormState)

  const resolveTermLabel = useMemo(() => {
    const byId = new Map(terms.map(t => [t._id, t.term_name || t.term_code] as const))
    return (row: AcademicRow) => {
      const t = row.term_id
      if (t && typeof t === 'object') {
        if (t.term_name) return t.term_name
        if (t.term_code) return t.term_code
      }
      const id = termIdOf(row)
      return (id && byId.get(id)) || '—'
    }
  }, [terms])

  const setFormField = <K extends keyof AcademicFormState>(key: K, value: AcademicFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const gpaPrevByTerm = useMemo(() => {
    const sorted = [...rows].sort(
      (a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime()
    )
    const byTerm = new Map<string, number>()
    for (const row of sorted) {
      const termId = termIdOf(row)
      if (!termId || byTerm.has(termId)) continue
      if (row.gpa_prev_sem == null) continue
      byTerm.set(termId, Number(row.gpa_prev_sem))
    }
    return byTerm
  }, [rows])

  const lockedGpaPrevValue = form.termId ? gpaPrevByTerm.get(form.termId) : undefined
  const isGpaPrevLocked = lockedGpaPrevValue != null

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime()),
    [rows]
  )
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const pagedRows = useMemo(
    () => sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedRows, page]
  )

  const onTermChange = (termId: string) => {
    const existingGpaPrev = gpaPrevByTerm.get(termId)
    setForm(prev => ({
      ...prev,
      termId,
      gpaPrev: existingGpaPrev != null ? String(existingGpaPrev) : '',
    }))
  }

  const loadTable = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dashboardService.getStudentDashboard({ history_limit: 24 })
      const d = res.data as { academic_trend?: AcademicRow[] }
      setRows(d.academic_trend ?? [])
      setPage(1)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTerms = useCallback(async () => {
    try {
      const [listRes, activeRes] = await Promise.all([
        masterDataService.getTermsList({ page: 1, limit: 100 }),
        masterDataService.getActiveTerm(),
      ])
      const listData = listRes.data as { items?: (TermItem & { start_date?: string; status?: string })[] }
      const active = activeRes.data as { _id?: string; start_date?: string } | null
      if (active?._id) setDefaultTermId(String(active._id))

      // Chỉ hiển thị kỳ hiện tại và các kỳ trước — lọc bỏ kỳ tương lai
      const activeStart = active?.start_date ? new Date(active.start_date).getTime() : null
      const allTerms = listData.items ?? []
      const filtered = activeStart
        ? allTerms.filter(t => !t.start_date || new Date(t.start_date).getTime() <= activeStart)
        : allTerms
      setTerms(filtered)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    }
  }, [])

  const loadMyAdvisor = useCallback(async () => {
    setAdvisorLoading(true)
    try {
      const res = await studentService.getMyAdvisor()
      setAdvisorData((res.data as MyAdvisorData) ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setAdvisorData(null)
    } finally {
      setAdvisorLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTable()
    void loadTerms()
    void loadMyAdvisor()
  }, [loadTable, loadTerms, loadMyAdvisor])

  const openModal = () => {
    const initialTermId = defaultTermId || terms[0]?._id || ''
    const existingGpaPrev = initialTermId ? gpaPrevByTerm.get(initialTermId) : undefined
    setForm({
      ...initialFormState,
      termId: initialTermId,
      gpaPrev: existingGpaPrev != null ? String(existingGpaPrev) : '',
    })
    setModalOpen(true)
  }

  const submit = async () => {
    if (!form.termId) {
      toast.error('Vui lòng chọn học kỳ')
      return
    }
    const body: Record<string, unknown> = { term_id: form.termId }

    // GPA kỳ trước
    if (form.gpaPrev.trim()) {
      const n = Number(form.gpaPrev)
      if (Number.isNaN(n) || n < 0 || n > 4) { toast.error('GPA kỳ trước phải từ 0 đến 4'); return }
      body['gpa_prev_sem'] = n
    }
    // GPA hiện tại
    if (form.gpaCur.trim()) {
      const n = Number(form.gpaCur)
      if (Number.isNaN(n) || n < 0 || n > 4) { toast.error('GPA hiện tại phải từ 0 đến 4'); return }
      body['gpa_current'] = n
    }
    // Số môn trượt
    if (form.numFailed.trim()) {
      const n = Number(form.numFailed)
      if (Number.isNaN(n) || !Number.isInteger(n) || n < 0) { toast.error('Số môn trượt phải là số nguyên ≥ 0'); return }
      body['num_failed'] = n
    }
    // Tỉ lệ tham dự — validate 0–100 trước, convert /100 sau
    if (form.attendance.trim()) {
      const pct = Number(form.attendance)
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('Tỉ lệ tham dự phải từ 0 đến 100 (%)')
        return
      }
      body['attendance_rate'] = pct / 100
    }
    // Số buổi SHCVHT
    if (form.shcvht.trim()) {
      const n = Number(form.shcvht)
      if (Number.isNaN(n) || !Number.isInteger(n) || n < 0) { toast.error('Số buổi SHCVHT phải là số nguyên ≥ 0'); return }
      body['shcvht_participation'] = n
    }
    // Giờ tự học
    if (form.studyHours.trim()) {
      const n = Number(form.studyHours)
      if (Number.isNaN(n) || n < 0) { toast.error('Giờ tự học phải ≥ 0'); return }
      body['study_hours'] = n
    }
    // Động lực
    if (form.motivation.trim()) {
      const n = Number(form.motivation)
      if (Number.isNaN(n) || !Number.isInteger(n) || n < 1 || n > 5) { toast.error('Mức độ hứng thú phải từ 1 đến 5'); return }
      body['motivation_score'] = n
    }
    // Stress
    if (form.stress.trim()) {
      const n = Number(form.stress)
      if (Number.isNaN(n) || !Number.isInteger(n) || n < 1 || n > 5) { toast.error('Mức độ áp lực phải từ 1 đến 5'); return }
      body['stress_level'] = n
    }

    setSaving(true)
    try {
      const res = await academicService.submitAcademic(body)
      toast.success(viApiMessage(res.message, 'Đã lưu kết quả học tập'))
      setModalOpen(false)
      void loadTable()
    } catch (error: any) {
      if (error?.response?.data?.remainingTime) {
        const remainingMs = error.response.data.remainingTime
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))
        if (remainingSeconds > 0) {
          const days = Math.floor(remainingSeconds / 86400)
          const hours = Math.floor((remainingSeconds % 86400) / 3600)
          const minutes = Math.floor((remainingSeconds % 3600) / 60)
          let timeMessage = ''
          if (days > 0) timeMessage = `Còn ${days} ngày ${hours} giờ nữa mới được cập nhật.`
          else if (hours > 0) timeMessage = `Còn ${hours} giờ ${minutes} phút nữa mới được cập nhật.`
          else timeMessage = `Còn ${minutes} phút nữa mới được cập nhật.`
          toast.error(timeMessage)
        } else {
          toast.error('Không thể cập nhật. Vui lòng thử lại.')
        }
      } else {
        toast.error(viApiError(error?.response?.data?.message, 'Đã có lỗi xảy ra'))
      }
    } finally {
      setSaving(false)
    }
  }

  const termOptions = terms.map(t => ({
    value: t._id,
    label: `${t.term_code} — ${t.term_name}`,
  }))

  return (
    <>
      <PageMeta title="Kết quả học tập | Sinh viên" description="Theo dõi và cập nhật kết quả học tập theo học kỳ" />

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white/90">Kết quả học tập</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Theo dõi tiến độ học tập và cập nhật kết quả theo từng học kỳ
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)', boxShadow: '0 4px 16px -2px rgba(224,32,32,0.45)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
          >
            <PencilIcon className="size-4 shrink-0" aria-hidden />
            Cập nhật kết quả học tập
          </button>
        </div>
      </div>

      {/* ── CARD CỐ VẤN ─────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white/90">
            <GroupIcon className="size-5 text-[#E02020]" aria-hidden />
            Cố vấn học tập của tôi
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            onClick={() => { void loadMyAdvisor(); void loadTable() }}
            disabled={advisorLoading || loading}
            startIcon={
              advisorLoading || loading
                ? (
                  <svg className="size-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10h-2a8 8 0 01-8-8z" />
                  </svg>
                )
                : (
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
            }
          >
            {advisorLoading || loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>

        {!advisorData?.advisor ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-10 text-center dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
              <GroupIcon className="size-6 text-gray-400" aria-hidden />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Chưa được phân công cố vấn</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Liên hệ phòng đào tạo để được hỗ trợ phân lớp cố vấn.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-5">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white select-none"
              style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
            >
              {getInitials(advisorData.advisor.profile?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-gray-900 dark:text-white/90">
                  {advisorData.advisor.profile?.full_name || '—'}
                </p>
                {advisorData.advisor.advisor_info?.title && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {advisorData.advisor.advisor_info.title}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                {advisorData.advisor.email && (
                  <a
                    href={`mailto:${advisorData.advisor.email}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-[#E02020]"
                  >
                    <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 6.667 10 11.25l7.5-4.583M2.5 6.667A1.667 1.667 0 0 1 4.167 5h11.666A1.667 1.667 0 0 1 17.5 6.667v6.666A1.667 1.667 0 0 1 15.833 15H4.167A1.667 1.667 0 0 1 2.5 13.333V6.667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {advisorData.advisor.email}
                  </a>
                )}
                {advisorData.advisor.advisor_info?.staff_code && (
                  <span className="flex items-center gap-1.5">
                    <svg className="size-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 10a3.333 3.333 0 1 0 0-6.667A3.333 3.333 0 0 0 10 10Zm0 0c-3.682 0-6.667 1.79-6.667 4v.667h13.334V14c0-2.21-2.985-4-6.667-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Mã CB: {advisorData.advisor.advisor_info.staff_code}
                  </span>
                )}
              </div>
              {advisorData.advisor_class && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Lớp:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {advisorData.advisor_class.class_code || '—'}
                    {advisorData.advisor_class.class_name ? ` — ${advisorData.advisor_class.class_name}` : ''}
                  </span>
                  {advisorData.advisor_class.status && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${advisorData.advisor_class.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                      }`}>
                      {advisorData.advisor_class.status === 'ACTIVE' ? 'Đang hoạt động' : advisorData.advisor_class.status}
                    </span>
                  )}
                  {advisorData.advisor_class.department_display && (
                    <span className="text-gray-500 dark:text-gray-400">
                      · {advisorData.advisor_class.department_display}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BẢNG LỊCH SỬ ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
          <TimeIcon className="size-5 text-[#E02020]" aria-hidden />
          Lịch sử học tập
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
                    {['Học kỳ', 'Ngày cập nhật', 'GPA hiện tại', 'GPA kỳ trước', 'Môn trượt', 'Tỉ lệ tham dự', 'Chỉ số Áp lực'].map((h, i) => (
                      <TableCell key={h} isHeader className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${i >= 2 ? 'text-center' : 'text-left'}`}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <TimeIcon className="size-12 text-gray-200 dark:text-gray-700" aria-hidden />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Chưa có dữ liệu học tập.{' '}
                            <button type="button" onClick={openModal} className="font-semibold text-[#E02020] hover:underline">
                              Cập nhật kết quả ngay
                            </button>
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((row, i) => {
                      const att = row.attendance_rate
                      return (
                        <TableRow
                          key={`${termIdOf(row)}-${row.recorded_at}-${i}`}
                          className="border-b border-[#F0F0F0] transition-colors hover:bg-[#F9FAFB] dark:border-gray-800 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="max-w-[200px] px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                            {resolveTermLabel(row)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {row.recorded_at
                              ? new Date(row.recorded_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : '—'}
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center tabular-nums font-semibold ${gpaColorClass(row.gpa_current)}`}>
                            {row.gpa_current != null ? Number(row.gpa_current).toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center tabular-nums text-gray-600 dark:text-gray-400">
                            {row.gpa_prev_sem != null ? Number(row.gpa_prev_sem).toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center tabular-nums text-gray-700 dark:text-gray-300">
                            {row.num_failed ?? '—'}
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center tabular-nums font-medium ${attendanceColorClass(att)}`}>
                            {att != null ? `${(Number(att) * 100).toFixed(0)}%` : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center tabular-nums text-gray-700 dark:text-gray-300">
                            {row.stress_level ?? '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination bar — chỉ hiện khi có > 1 trang */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-[#F0F0F0] pt-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hiển thị{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedRows.length)}
                  </span>{' '}
                  / {sortedRows.length} bản ghi
                </p>
                <div className="flex items-center gap-1">
                  {/* Prev */}
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Trang trước"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="flex size-8 items-center justify-center text-xs text-gray-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          aria-label={`Trang ${item}`}
                          aria-current={page === item ? 'page' : undefined}
                          className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors
                            ${page === item
                              ? 'border-[#E02020] bg-[#E02020] text-white'
                              : 'border-[#F0F0F0] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                            }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  {/* Next */}
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Trang sau"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.05]"
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

      {/* ── MODAL FORM ───────────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        showCloseButton={false}
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-0"
      >
        {/* Header */}
        <div className="border-b border-[#F0F0F0] px-6 py-4 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
            >
              <PencilIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white/90">
                Cập nhật kết quả học tập
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Điền thông tin học kỳ này để hệ thống theo dõi tiến độ của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Banner 7 ngày */}
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <svg className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 7v4m0 3h.01M8.615 3.346 1.923 15.077A1.6 1.6 0 0 0 3.308 17.5h13.384a1.6 1.6 0 0 0 1.385-2.423L11.385 3.346a1.6 1.6 0 0 0-2.77 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Bạn chỉ có thể cập nhật kết quả <span className="font-bold">mỗi 7 ngày một lần</span>. Hãy điền đầy đủ và chính xác.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Học kỳ */}
            <div className="sm:col-span-2">
              <Label>Học kỳ <span className="text-[#E02020]">*</span></Label>
              <Select
                key={`term-${modalOpen}-${terms.length}-${defaultTermId}`}
                options={termOptions}
                placeholder="Chọn học kỳ"
                onChange={onTermChange}
                defaultValue={form.termId}
              />
            </div>

            {/* GPA kỳ trước */}
            <div>
              <Label htmlFor="gpa-prev">GPA kỳ trước</Label>
              <InputField
                id="gpa-prev"
                type="number"
                min="0"
                max="4"
                step={0.01}
                placeholder="VD: 3.20"
                value={form.gpaPrev}
                onChange={e => setFormField('gpaPrev', e.target.value)}
                disabled={saving || isGpaPrevLocked}
              />
              <p className="mt-1 text-xs text-gray-400">
                {isGpaPrevLocked
                  ? 'Đã có dữ liệu kỳ trước, không thể thay đổi.'
                  : 'Điểm trung bình học kỳ liền trước (thang 4.0)'}
              </p>
            </div>

            {/* GPA hiện tại */}
            <div>
              <Label htmlFor="gpa-cur">GPA học kỳ này</Label>
              <InputField
                id="gpa-cur"
                type="number"
                min="0"
                max="4"
                step={0.01}
                placeholder="VD: 3.50"
                value={form.gpaCur}
                onChange={e => setFormField('gpaCur', e.target.value)}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-400">Điểm trung bình học kỳ hiện tại (thang 4.0)</p>
            </div>

            {/* Số môn trượt */}
            <div>
              <Label htmlFor="failed">Số môn chưa đạt</Label>
              <InputField
                id="failed"
                type="number"
                min="0"
                step={1}
                placeholder="VD: 0"
                value={form.numFailed}
                onChange={e => setFormField('numFailed', e.target.value)}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-400">Số môn học chưa đạt điểm qua trong học kỳ này</p>
            </div>

            {/* Tỉ lệ tham dự — nhập %, validate 0–100, convert /100 khi submit */}
            <div>
              <Label htmlFor="att">Tỉ lệ tham dự (%)</Label>
              <InputField
                id="att"
                type="number"
                min="0"
                max="100"
                step={1}
                placeholder="VD: 92"
                value={form.attendance}
                onChange={e => setFormField('attendance', e.target.value)}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-400">Phần trăm buổi học bạn đã tham dự (0–100)</p>
            </div>

            {/* Số buổi SHCVHT */}
            <div>
              <Label htmlFor="sh">Số buổi sinh hoạt cố vấn</Label>
              <InputField
                id="sh"
                type="number"
                min="0"
                step={1}
                placeholder="VD: 3"
                value={form.shcvht}
                onChange={e => setFormField('shcvht', e.target.value)}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-400">Số buổi SHCVHT bạn đã tham gia trong học kỳ</p>
            </div>

            {/* Giờ tự học */}
            <div>
              <Label htmlFor="hrs">Giờ tự học mỗi tuần</Label>
              <InputField
                id="hrs"
                type="number"
                min="0"
                step={0.5}
                placeholder="VD: 10"
                value={form.studyHours}
                onChange={e => setFormField('studyHours', e.target.value)}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-gray-400">Số giờ tự học trung bình mỗi tuần</p>
            </div>

            {/* Động lực — emoji rating */}
            <div className="sm:col-span-2">
              <Label>Mức độ hứng thú học tập</Label>
              <p className="mb-2 text-xs text-gray-400">Bạn cảm thấy thế nào về việc học trong học kỳ này?</p>
              <EmojiRating
                options={MOTIVATION_OPTIONS}
                value={form.motivation}
                onChange={v => setFormField('motivation', v)}
                disabled={saving}
              />
            </div>

            {/* Stress — emoji rating */}
            <div className="sm:col-span-2">
              <Label>Mức độ áp lực học tập</Label>
              <p className="mb-2 text-xs text-gray-400">Bạn cảm thấy áp lực học tập ở mức nào?</p>
              <EmojiRating
                options={STRESS_OPTIONS}
                value={form.stress}
                onChange={v => setFormField('stress', v)}
                disabled={saving}
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
            onClick={() => setModalOpen(false)}
          >
            Hủy
          </Button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)', boxShadow: '0 4px 16px -2px rgba(224,32,32,0.45)' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
          >
            {saving
              ? <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              : <CheckLineIcon className="size-4 shrink-0" aria-hidden />
            }
            {saving ? 'Đang lưu...' : 'Lưu kết quả'}
          </button>
        </div>
      </Modal>
    </>
  )
}
