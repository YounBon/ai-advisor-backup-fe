import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import TextArea from '@/components/form/input/TextArea'
import MultiSelect from '@/components/form/MultiSelect'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { meetingService } from '@/services/MeetingService'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { masterDataService } from '@/services/MasterDataService'
import { feedbackService } from '@/services/FeedbackService'
import {
  CalenderIcon,
  ChatIcon,
  CheckLineIcon,
  CloseLineIcon,
  EyeIcon,
  GroupIcon,
  TimeIcon,
} from '@/icons'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type ClassPop = { _id?: string; class_code?: string; class_name?: string }

type StudentInMeeting = {
  _id: string
  username?: string
  email?: string
  profile?: { full_name?: string }
  student_info?: { student_code?: string }
}

type MeetingRow = {
  _id: string
  class_id?: string | ClassPop
  meeting_time?: string
  meeting_end_time?: string
  notes_raw?: string
  notes_summary?: string
  status?: 'ACTIVE' | 'ARCHIVED'
  student_user_ids?: (string | StudentInMeeting)[]
}

type FeedbackForMeeting = {
  _id: string
  student_user_id?: string
  feedback_text: string
  rating?: number
  sentiment_label?: string
  submitted_at?: string
  class_display?: string | null
  advisor_display?: string | null
  student_display?: string | null
  meeting_time?: string | null
}

type DetailTab = 'students' | 'feedback'

function studentsFromMeeting(m: MeetingRow): StudentInMeeting[] {
  const raw = m.student_user_ids
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (item && typeof item === 'object' && '_id' in item) {
      const u = item as StudentInMeeting
      return { ...u, _id: String(u._id) }
    }
    return { _id: String(item) }
  })
}

type MemberRow = {
  _id: string
  student?: {
    _id?: string
    username?: string
    email?: string
    profile?: { full_name?: string }
  } | null
}

function classLabel(m: MeetingRow): string {
  const c = m.class_id
  if (c && typeof c === 'object') {
    const parts = [c.class_code, c.class_name].filter(Boolean)
    return parts.length ? parts.join(' — ') : String(c._id ?? '')
  }
  return c ? String(c) : '—'
}

function formatDt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

const NOTES_MIN = 30

export default function AdvisorMeetingsPage() {
  const [page, setPage] = useState(1)
  const limit = 10
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<MeetingRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  // ── Search / filter state ──
  const [searchName, setSearchName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // debounced values actually sent to API
  const [debouncedName, setDebouncedName] = useState('')
  const [debouncedDateFrom, setDebouncedDateFrom] = useState('')
  const [debouncedDateTo, setDebouncedDateTo] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classId, setClassId] = useState<string | null>(null)
  const [classDisplayLabel, setClassDisplayLabel] = useState<string | null>(null)
  const [classOptions, setClassOptions] = useState<{ value: string; label: string }[]>([])
  const [loadingPrep, setLoadingPrep] = useState(false)
  const [studentOptions, setStudentOptions] = useState<{ value: string; text: string }[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [meetingStart, setMeetingStart] = useState('')
  const [meetingEnd, setMeetingEnd] = useState('')
  const [notesRaw, setNotesRaw] = useState('')
  const [termId, setTermId] = useState('')
  const [activeTermLabel, setActiveTermLabel] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailMeeting, setDetailMeeting] = useState<MeetingRow | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('students')
  const [feedbackRows, setFeedbackRows] = useState<FeedbackForMeeting[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  // ── Edit notes state ──
  const [editNotesOpen, setEditNotesOpen] = useState(false)
  const [editNotesRaw, setEditNotesRaw] = useState('')
  const [editNotesSaving, setEditNotesSaving] = useState(false)

  // ── Archive / Delete state ──
  const [viewArchived, setViewArchived] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'archive' | 'unarchive' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (debouncedName) body.student_name = debouncedName
      if (debouncedDateFrom) body.date_from = new Date(debouncedDateFrom).toISOString()
      if (debouncedDateTo) body.date_to = new Date(debouncedDateTo).toISOString()
      if (viewArchived) body.status = 'ARCHIVED'
      const res = await meetingService.listAdvisorMeetings(body)
      const data = res.data as { items: MeetingRow[]; pagination: Pagination }
      setRows(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Không tải được danh sách họp')
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedName, debouncedDateFrom, debouncedDateTo, viewArchived])

  useEffect(() => {
    void loadMeetings()
  }, [loadMeetings])

  // Debounce search inputs → reset to page 1 when filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setDebouncedName(searchName)
      setDebouncedDateFrom(dateFrom)
      setDebouncedDateTo(dateTo)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchName, dateFrom, dateTo])

  // Reset page when switching archived tab
  useEffect(() => {
    setPage(1)
  }, [viewArchived])

  const clearSearch = () => {
    setSearchName('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilter = searchName || dateFrom || dateTo

  const executeAction = async () => {
    if (!detailMeeting || !confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction === 'archive') {
        const res = await meetingService.archiveMeeting(detailMeeting._id)
        toast.success(viApiMessage(res.message, 'Đã lưu trữ cuộc họp'))
        setRows(prev => prev.filter(r => r._id !== detailMeeting._id))
        setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : prev)
        closeDetail()
      } else if (confirmAction === 'unarchive') {
        const res = await meetingService.unarchiveMeeting(detailMeeting._id)
        toast.success(viApiMessage(res.message, 'Đã khôi phục cuộc họp'))
        setRows(prev => prev.filter(r => r._id !== detailMeeting._id))
        setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : prev)
        closeDetail()
      } else if (confirmAction === 'delete') {
        const res = await meetingService.deleteMeeting(detailMeeting._id)
        toast.success(viApiMessage(res.message, 'Đã xóa cuộc họp'))
        setRows(prev => prev.filter(r => r._id !== detailMeeting._id))
        setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : prev)
        closeDetail()
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      const msg = e?.response?.data?.message
      toast.error(msg ?? 'Thao tác thất bại')
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  const openDetail = (row: MeetingRow) => {
    setDetailMeeting(row)
    setDetailTab('students')
    setFeedbackRows([])
    setDetailOpen(true)
  }

  const loadFeedbackForMeeting = useCallback(async (meetingId: string) => {
    setFeedbackLoading(true)
    try {
      const res = await feedbackService.listFeedback({
        meeting_id: meetingId,
        page: 1,
        limit: 50,
      })
      const data = res.data as { items?: FeedbackForMeeting[] }
      setFeedbackRows(data.items ?? [])
    } catch {
      toast.error('Không tải được phản hồi')
      setFeedbackRows([])
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!detailOpen || !detailMeeting || detailTab !== 'feedback') return
    void loadFeedbackForMeeting(detailMeeting._id)
  }, [detailOpen, detailMeeting, detailTab, loadFeedbackForMeeting])

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailMeeting(null)
    setFeedbackRows([])
  }

  const openEditNotes = () => {
    if (!detailMeeting) return
    setEditNotesRaw(detailMeeting.notes_raw ?? '')
    setEditNotesOpen(true)
  }

  const closeEditNotes = () => {
    setEditNotesOpen(false)
    setEditNotesRaw('')
  }

  const submitEditNotes = async () => {
    if (!detailMeeting) return
    if (editNotesRaw.trim().length < NOTES_MIN) {
      toast.error(`Nội dung ghi chú tối thiểu ${NOTES_MIN} ký tự`)
      return
    }
    setEditNotesSaving(true)
    try {
      const res = await meetingService.updateNotes(detailMeeting._id, { notes_raw: editNotesRaw.trim() })
      toast.success(viApiMessage(res.message, 'Đã cập nhật ghi chú'))
      // Cập nhật local state
      const updated = res.data as MeetingRow
      setDetailMeeting(prev => prev ? { ...prev, notes_raw: updated.notes_raw, notes_summary: updated.notes_summary } : prev)
      setRows(prev => prev.map(r => r._id === detailMeeting._id ? { ...r, notes_raw: updated.notes_raw, notes_summary: updated.notes_summary } : r))
      closeEditNotes()
    } catch {
      toast.error('Cập nhật ghi chú thất bại')
    } finally {
      setEditNotesSaving(false)
    }
  }

  const loadStudentsForClass = async (cid: string) => {
    try {
      // Truyền class_id để backend lấy đúng lớp; backend sẽ verify ownership
      const memRes = await classMemberService.listMembers({ class_id: cid, page: 1, limit: 100 })
      const mdata = memRes.data as { items: MemberRow[]; pagination?: unknown }
      const studs = mdata.items ?? []
      const opts = studs.map(r => {
        const name =
          r.student?.profile?.full_name ||
          r.student?.username ||
          (r.student?._id ? 'Sinh viên' : '')
        return {
          value: String(r.student?._id ?? ''),
          text: `${name}${r.student?.email ? ` (${r.student.email})` : ''}`,
        }
      }).filter(o => o.value)
      setStudentOptions(opts)
      if (opts.length === 0) {
        toast.message('Lớp này chưa có sinh viên nào')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } }
      const msg = e?.response?.data?.message
      const status = e?.response?.status
      if (status === 403 || status === 404) {
        toast.error('Không có quyền truy cập lớp này hoặc lớp không tồn tại')
      } else {
        toast.error(msg ?? 'Không tải được danh sách sinh viên')
      }
      setStudentOptions([])
    }
  }

  const openCreate = async () => {
    setCreateOpen(true)
    setSelectedStudents([])
    setMeetingStart('')
    setMeetingEnd('')
    setNotesRaw('')
    setTermId('')
    setClassId(null)
    setClassDisplayLabel(null)
    setClassOptions([])
    setStudentOptions([])
    setLoadingPrep(true)
    try {
      const [clsRes, activeRes] = await Promise.all([
        advisorClassService.getMyAdvisorClasses({}),
        masterDataService.getActiveTerm().catch(() => null),
      ])

      // Backend trả về array (1–3 lớp)
      const clsList = (Array.isArray(clsRes.data) ? clsRes.data : []) as {
        _id?: string
        class_code?: string
        class_name?: string
      }[]

      if (clsList.length === 0) {
        setStudentOptions([])
        toast.message('Chưa có lớp cố vấn — không thể mời sinh viên')
      } else if (clsList.length === 1) {
        // Chỉ 1 lớp → chọn luôn
        const cls = clsList[0]
        const id = String(cls._id ?? '')
        setClassId(id)
        const cParts = [cls.class_code, cls.class_name].filter(Boolean)
        setClassDisplayLabel(cParts.length ? cParts.join(' — ') : id)
        await loadStudentsForClass(id)
      } else {
        // Nhiều lớp → cho chọn
        const opts = clsList.map(c => ({
          value: String(c._id ?? ''),
          label: [c.class_code, c.class_name].filter(Boolean).join(' — ') || String(c._id ?? ''),
        }))
        setClassOptions(opts)
        // Mặc định chọn lớp đầu tiên
        const first = opts[0]
        setClassId(first.value)
        setClassDisplayLabel(first.label)
        await loadStudentsForClass(first.value)
      }

      const active = activeRes?.data as { _id?: string; term_code?: string; term_name?: string } | undefined
      if (active?._id) {
        setTermId(String(active._id))
        const parts = [active.term_code, active.term_name].filter(Boolean)
        setActiveTermLabel(parts.length ? parts.join(' — ') : String(active._id))
      } else {
        setTermId('')
        setActiveTermLabel(null)
      }
    } catch {
      toast.error('Không tải được dữ liệu form')
    } finally {
      setLoadingPrep(false)
    }
  }

  const submitCreate = async () => {
    if (!classId) {
      toast.error('Thiếu lớp cố vấn')
      return
    }
    if (selectedStudents.length === 0) {
      toast.error('Chọn ít nhất một sinh viên')
      return
    }
    if (!meetingStart || !meetingEnd) {
      toast.error('Nhập thời gian bắt đầu và kết thúc')
      return
    }
    if (notesRaw.trim().length < NOTES_MIN) {
      toast.error(`Nội dung ghi chú tối thiểu ${NOTES_MIN} ký tự (theo API)`)
      return
    }
    const startIso = new Date(meetingStart).toISOString()
    const endIso = new Date(meetingEnd).toISOString()
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('Giờ kết thúc phải sau giờ bắt đầu')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        class_id: classId,
        student_user_ids: selectedStudents,
        meeting_time: startIso,
        meeting_end_time: endIso,
        notes_raw: notesRaw.trim(),
      }
      if (termId) body.term_id = termId
      const res = await meetingService.createMeeting(body)
      toast.success(viApiMessage(res.message, 'Đã tạo cuộc họp'))
      setCreateOpen(false)
      setPage(1)
      void loadMeetings()
    } catch {
      toast.error('Tạo họp thất bại')
    } finally {
      setSaving(false)
    }
  }

  const detailStudentList = detailMeeting ? studentsFromMeeting(detailMeeting) : []

  return (
    <>
      <PageMeta
        title="Cuộc họp tư vấn | Cố vấn học tập"
        description="Tạo và quản lý lịch họp tư vấn với sinh viên"
      />

      {/* ── Tiêu đề trang ── */}
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderLeft: '4px solid #E02020' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Cố vấn học tập</p>
          <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Cuộc họp tư vấn</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">Lên lịch buổi họp, mời sinh viên và theo dõi phản hồi sau họp</p>
        </div>
        <button
          type="button"
          onClick={() => void openCreate()}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white text-center shadow-md transition-all active:scale-[0.98] min-w-[180px]"
          style={{
            background: 'linear-gradient(to bottom, #E02020, #C01818)',
            boxShadow: '0 6px 18px rgba(224,32,32,0.35)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background =
              'linear-gradient(to bottom, #C01818, #A01010)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background =
              'linear-gradient(to bottom, #E02020, #C01818)'
          }}
        >
          <CalenderIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="leading-none">Tạo cuộc họp</span>
        </button>
      </div>

      {/* ── Bảng danh sách họp ── */}
      <div className="rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#F0F0F0] px-5 py-4">
          <CalenderIcon className="size-5 shrink-0 text-[#E02020]" aria-hidden />
          <h2 className="text-base font-bold text-[#111111]">Lịch sử cuộc họp</h2>
          {pagination && (
            <span className="text-xs text-[#6B7280]">{pagination.total} buổi</span>
          )}

          {/* Toggle Active / Archived */}
          <div className="flex rounded-xl border border-[#E0E0E0] bg-[#F9FAFB] p-0.5">
            <button
              type="button"
              onClick={() => setViewArchived(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${!viewArchived ? 'bg-white text-[#E02020] shadow-sm ring-1 ring-[#F0F0F0]' : 'text-[#6B7280] hover:text-[#111111]'}`}
            >
              Đang hoạt động
            </button>
            <button
              type="button"
              onClick={() => setViewArchived(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${viewArchived ? 'bg-white text-[#6B7280] shadow-sm ring-1 ring-[#F0F0F0]' : 'text-[#6B7280] hover:text-[#111111]'}`}
            >
              Lưu trữ
            </button>
          </div>

          {/* Search bar */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Tìm theo tên sinh viên */}
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="Tên / mã sinh viên..."
                aria-label="Tìm theo tên hoặc mã sinh viên"
                className="h-9 w-48 rounded-xl border border-[#E0E0E0] bg-white pl-8 pr-3 text-sm text-[#111111] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
              />
            </div>

            {/* Từ ngày */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              aria-label="Từ ngày"
              title="Từ ngày"
              className="h-9 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
            />

            {/* Đến ngày */}
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              aria-label="Đến ngày"
              title="Đến ngày"
              className="h-9 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
            />

            {/* Xóa filter */}
            {hasFilter && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Xóa bộ lọc"
                className="flex h-9 items-center gap-1 rounded-xl border border-[#E0E0E0] bg-white px-3 text-xs font-semibold text-[#6B7280] transition-colors hover:border-[#E02020]/40 hover:text-[#E02020]"
              >
                <CloseLineIcon className="size-3.5 shrink-0" aria-hidden />
                Xóa lọc
              </button>
            )}
          </div>
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
                    <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                      Lớp
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                      Sinh viên
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                      Bắt đầu
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                      Kết thúc
                    </TableCell>
                    <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                            <CalenderIcon className="size-6 text-[#E02020]" aria-hidden />
                          </div>
                          {hasFilter ? (
                            <>
                              <p className="text-sm font-semibold text-[#111111]">Không tìm thấy kết quả</p>
                              <p className="text-xs text-[#6B7280]">
                                Thử thay đổi từ khóa hoặc{' '}
                                <button type="button" onClick={clearSearch} className="font-semibold text-[#E02020] underline-offset-2 hover:underline">xóa bộ lọc</button>.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-[#111111]">Chưa có cuộc họp nào</p>
                              <p className="text-xs text-[#6B7280]">
                                Nhấn <span className="font-semibold text-[#E02020]">Tạo cuộc họp</span> phía trên để bắt đầu.
                              </p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => {
                      const studs = studentsFromMeeting(row)
                      const studentSummary = studs.length === 0
                        ? '—'
                        : studs.length === 1
                          ? (studs[0].profile?.full_name ?? studs[0].username ?? 'Sinh viên')
                          : `${studs[0].profile?.full_name ?? studs[0].username ?? 'Sinh viên'} +${studs.length - 1}`
                      return (
                        <TableRow
                          key={row._id}
                          className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]"
                        >
                          <TableCell className="px-5 py-3.5 font-medium text-[#111111]">
                            {classLabel(row)}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate px-4 py-3.5 text-sm text-[#444444]">
                            <span title={studs.map(s => s.profile?.full_name ?? s.username ?? '').join(', ')}>
                              {studentSummary}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3.5 text-sm text-[#444444]">
                            {formatDt(row.meeting_time)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3.5 text-sm text-[#444444]">
                            {formatDt(row.meeting_end_time)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                              startIcon={<EyeIcon className="size-4 shrink-0" aria-hidden />}
                              onClick={() => openDetail(row)}
                            >
                              Chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Phân trang */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-[#F0F0F0] px-5 py-3.5">
                <p className="text-xs text-[#6B7280]">
                  Trang <span className="font-semibold text-[#111111]">{pagination.page}</span>
                  {' / '}{pagination.total_pages} ·{' '}
                  <span className="font-semibold text-[#111111]">{pagination.total}</span> buổi
                </p>
                <div className="flex items-center gap-1">
                  {/* Nút trước */}
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Trang trước"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>

                  {/* Số trang */}
                  {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === pagination.total_pages || Math.abs(p - page) <= 1)
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

                  {/* Nút sau */}
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                    disabled={page >= pagination.total_pages}
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

      {/* ── Modal chi tiết cuộc họp ── */}
      <Modal isOpen={detailOpen} onClose={closeDetail} className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        {detailMeeting ? (
          <>
            {/* Header — cố định */}
            <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF0F0] text-[#E02020]">
                  <EyeIcon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Chi tiết cuộc họp</h3>
                  <p className="text-xs text-[#6B7280]">
                    {classLabel(detailMeeting)} · {formatDt(detailMeeting.meeting_time)}
                  </p>
                </div>
              </div>
            </div>

            {/* Body — scroll được */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
              {/* Thông tin cơ bản */}
              <dl className="grid gap-3 rounded-2xl border border-[#F0F0F0] bg-[#F9FAFB] p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Lớp</dt>
                  <dd className="mt-1 font-semibold text-[#111111]">{classLabel(detailMeeting)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Khung giờ</dt>
                  <dd className="mt-1 text-[#444444]">
                    {formatDt(detailMeeting.meeting_time)} → {formatDt(detailMeeting.meeting_end_time)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Ghi chú buổi họp</dt>
                    <button
                      type="button"
                      onClick={openEditNotes}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E02020]/30 bg-[#FFF0F0] px-2 py-0.5 text-[11px] font-semibold text-[#E02020] transition-colors hover:bg-[#FFE0E0]"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Sửa ghi chú
                    </button>
                  </div>
                  <dd className="mt-1 whitespace-pre-wrap text-[#444444]">
                    {detailMeeting.notes_raw
                      ? <span className="line-clamp-4">{detailMeeting.notes_raw}</span>
                      : <span className="text-[#9CA3AF]">—</span>}
                  </dd>
                </div>
                {detailMeeting.notes_summary && (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Tóm tắt (AI)</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[#444444]">
                      {detailMeeting.notes_summary}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Tab chuyển đổi */}
              <div className="mt-5 flex gap-1 rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] p-1">
                <button
                  type="button"
                  onClick={() => setDetailTab('students')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${detailTab === 'students'
                    ? 'bg-white text-[#E02020] shadow-sm ring-1 ring-[#F0F0F0]'
                    : 'text-[#6B7280] hover:text-[#111111]'
                    }`}
                >
                  <GroupIcon className="size-4 shrink-0" aria-hidden />
                  Sinh viên tham dự
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('feedback')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${detailTab === 'feedback'
                    ? 'bg-white text-[#E02020] shadow-sm ring-1 ring-[#F0F0F0]'
                    : 'text-[#6B7280] hover:text-[#111111]'
                    }`}
                >
                  <ChatIcon className="size-4 shrink-0" aria-hidden />
                  Phản hồi sau họp
                </button>
              </div>

              {/* Nội dung tab */}
              <div className="mt-3 max-h-[40vh] overflow-auto rounded-2xl border border-[#F0F0F0]">
                {detailTab === 'students' ? (
                  <Table className="text-left text-sm" framed={false}>
                    <TableHeader>
                      <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                        <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Họ tên</TableCell>
                        <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Email</TableCell>
                        <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã SV</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailStudentList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                            Chưa có danh sách sinh viên cho cuộc họp này.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailStudentList.map(s => (
                          <TableRow key={s._id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FFF8F8]">
                            <TableCell className="px-4 py-2.5 font-medium text-[#111111]">
                              {s.profile?.full_name ?? s.username ?? 'Sinh viên'}
                            </TableCell>
                            <TableCell className="px-4 py-2.5 text-sm text-[#6B7280]">{s.email ?? '—'}</TableCell>
                            <TableCell className="px-4 py-2.5 font-mono text-sm text-[#444444]">
                              {s.student_info?.student_code ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : feedbackLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
                    <TimeIcon className="size-5 animate-pulse" aria-hidden />
                    Đang tải phản hồi...
                  </div>
                ) : (
                  <Table className="text-left text-sm" framed={false}>
                    <TableHeader>
                      <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                        <TableCell isHeader className="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Sinh viên</TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Cảm xúc</TableCell>
                        <TableCell isHeader className="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Đánh giá</TableCell>
                        <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Nội dung phản hồi</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                            Chưa có phản hồi sau buổi họp này.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feedbackRows.map(fb => (
                          <TableRow key={fb._id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FFF8F8]">
                            <TableCell className="whitespace-nowrap px-4 py-2.5 text-xs text-[#6B7280]">
                              {fb.student_display ?? '—'}
                            </TableCell>
                            <TableCell className="px-4 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${fb.sentiment_label === 'POSITIVE' ? 'bg-[#F0FDF4] text-emerald-700'
                                : fb.sentiment_label === 'NEGATIVE' ? 'bg-[#FFF0F0] text-[#B01818]'
                                  : 'bg-[#F9FAFB] text-[#6B7280]'
                                }`}>
                                {fb.sentiment_label === 'POSITIVE' ? 'Tích cực'
                                  : fb.sentiment_label === 'NEGATIVE' ? 'Tiêu cực'
                                    : fb.sentiment_label === 'NEUTRAL' ? 'Trung tính'
                                      : (fb.sentiment_label ?? '—')}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-2.5 tabular-nums font-semibold text-[#111111]">
                              {fb.rating != null ? `${fb.rating}/5` : '—'}
                            </TableCell>
                            <TableCell className="max-w-xs px-4 py-2.5">
                              <span className="line-clamp-3 text-sm text-[#444444]">{fb.feedback_text}</span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F0F0] pt-4">
                {/* Destructive actions — left side */}
                <div className="flex items-center gap-2">
                  {detailMeeting.status !== 'ARCHIVED' ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction('archive')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-xs font-semibold text-[#6B7280] transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M2 4h12v1.5H2V4Zm1.5 2.5h9l-.75 7h-7.5l-.75-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        <path d="M6 8v3M10 8v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      Lưu trữ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmAction('unarchive')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-xs font-semibold text-[#6B7280] transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M8 3v7M5 7l3-4 3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Khôi phục
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmAction('delete')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-xs font-semibold text-[#6B7280] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-[#E02020]"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 4h10M6 4V2.5h4V4M5.5 4l.5 9h4l.5-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Xóa
                  </button>
                </div>

                {/* Close — right side */}
                <Button type="button" size="sm" variant="outline"
                  className="border-[#E0E0E0] text-[#444444]"
                  startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
                  onClick={closeDetail}>
                  Đóng
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </Modal>

      {/* ── Confirm action dialog ── */}
      <Modal
        isOpen={confirmAction !== null}
        onClose={() => !actionLoading && setConfirmAction(null)}
        className="max-w-sm overflow-hidden p-0"
      >
        <div className="p-6">
          {confirmAction === 'archive' && (
            <>
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M2 4h12v1.5H2V4Zm1.5 2.5h9l-.75 7h-7.5l-.75-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 8v3M10 8v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#111111]">Lưu trữ cuộc họp?</h3>
              <p className="mt-1.5 text-sm text-[#6B7280]">
                Cuộc họp sẽ được chuyển sang mục <span className="font-semibold text-[#444444]">Lưu trữ</span> và không hiển thị trong danh sách chính. Bạn có thể khôi phục bất cứ lúc nào.
              </p>
            </>
          )}
          {confirmAction === 'unarchive' && (
            <>
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 3v7M5 7l3-4 3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#111111]">Khôi phục cuộc họp?</h3>
              <p className="mt-1.5 text-sm text-[#6B7280]">
                Cuộc họp sẽ được chuyển lại về danh sách <span className="font-semibold text-[#444444]">Đang hoạt động</span>.
              </p>
            </>
          )}
          {confirmAction === 'delete' && (
            <>
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#FFF0F0] text-[#E02020]">
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 4h10M6 4V2.5h4V4M5.5 4l.5 9h4l.5-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#111111]">Xóa cuộc họp?</h3>
              <p className="mt-1.5 text-sm text-[#6B7280]">
                Hành động này <span className="font-semibold text-[#E02020]">không thể hoàn tác</span>. Cuộc họp sẽ bị xóa vĩnh viễn. Nếu đã có phản hồi từ sinh viên, hệ thống sẽ từ chối xóa — hãy dùng <span className="font-semibold text-[#444444]">Lưu trữ</span> thay thế.
              </p>
            </>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button" size="sm" variant="outline"
              className="border-[#E0E0E0] text-[#444444]"
              disabled={actionLoading}
              onClick={() => setConfirmAction(null)}
            >
              Hủy
            </Button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void executeAction()}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${confirmAction === 'delete'
                ? 'bg-[#E02020] hover:bg-[#C01818]'
                : confirmAction === 'unarchive'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-500 hover:bg-amber-600'
                }`}
            >
              {actionLoading
                ? <TimeIcon className="size-4 animate-pulse" aria-hidden />
                : null}
              {actionLoading
                ? 'Đang xử lý...'
                : confirmAction === 'delete'
                  ? 'Xóa vĩnh viễn'
                  : confirmAction === 'unarchive'
                    ? 'Khôi phục'
                    : 'Lưu trữ'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal sửa ghi chú ── */}
      <Modal
        isOpen={editNotesOpen}
        onClose={() => !editNotesSaving && closeEditNotes()}
        className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
          <h3 className="text-base font-bold text-[#111111]">Sửa ghi chú buổi họp</h3>
          <p className="text-xs text-[#6B7280]">
            {detailMeeting ? `${classLabel(detailMeeting)} · ${formatDt(detailMeeting.meeting_time)}` : ''}
          </p>
        </div>
        <div className="overflow-y-auto p-6">
          <Label htmlFor="edit-notes">
            Nội dung ghi chú
            <span className="ml-1 text-[#9CA3AF]">(tối thiểu {NOTES_MIN} ký tự)</span>
          </Label>
          <TextArea
            rows={8}
            value={editNotesRaw}
            onChange={v => setEditNotesRaw(v)}
            disabled={editNotesSaving}
          />
          {editNotesRaw.length > 0 && editNotesRaw.length < NOTES_MIN && (
            <p className="mt-1 text-xs text-[#E02020]">
              Còn thiếu {NOTES_MIN - editNotesRaw.length} ký tự
            </p>
          )}
          <p className="mt-1 text-right text-xs text-[#9CA3AF]">{editNotesRaw.length} ký tự</p>
        </div>
        <div className="shrink-0 flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
          <Button type="button" size="sm" variant="outline"
            className="border-[#E0E0E0] text-[#444444]"
            disabled={editNotesSaving}
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={closeEditNotes}>
            Hủy
          </Button>
          <Button type="button" size="sm" variant="danger"
            disabled={editNotesSaving || editNotesRaw.trim().length < NOTES_MIN}
            startIcon={editNotesSaving
              ? <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              : <CheckLineIcon className="size-4 shrink-0" aria-hidden />
            }
            onClick={() => void submitEditNotes()}>
            {editNotesSaving ? 'Đang lưu...' : 'Lưu ghi chú'}
          </Button>
        </div>
      </Modal>

      {/* ── Modal tạo cuộc họp ── */}
      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
          <div>
            <h3 className="text-base font-bold text-[#111111]">Tạo cuộc họp tư vấn</h3>
            <p className="text-xs text-[#6B7280]">
              Chọn khung giờ, sinh viên và ghi chú.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          {loadingPrep ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B7280]">
              <TimeIcon className="size-5 animate-pulse" aria-hidden />
              Đang tải dữ liệu lớp...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lớp cố vấn */}
              {classOptions.length > 1 ? (
                <div>
                  <Label htmlFor="m-class">Lớp cố vấn</Label>
                  <select
                    id="m-class"
                    value={classId ?? ''}
                    onChange={async e => {
                      const id = e.target.value
                      const opt = classOptions.find(o => o.value === id)
                      setClassId(id)
                      setClassDisplayLabel(opt?.label ?? id)
                      setSelectedStudents([])
                      setStudentOptions([])
                      await loadStudentsForClass(id)
                    }}
                    disabled={saving}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                  >
                    {classOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Lớp cố vấn</p>
                  <p className="mt-1 text-sm font-semibold text-[#111111]">
                    {classDisplayLabel || 'Chưa có lớp'}
                  </p>
                </div>
              )}

              {/* Học kỳ */}
              <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Học kỳ</p>
                <p className="mt-1 text-sm font-semibold text-[#111111]">
                  {activeTermLabel ?? <span className="font-normal text-[#9CA3AF]">Không có học kỳ active</span>}
                </p>
              </div>

              {/* Thời gian */}
              <div>
                <Label htmlFor="m-start">Thời gian bắt đầu</Label>
                <input
                  id="m-start"
                  type="datetime-local"
                  value={meetingStart}
                  onChange={e => setMeetingStart(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                />
              </div>
              <div>
                <Label htmlFor="m-end">Thời gian kết thúc</Label>
                <input
                  id="m-end"
                  type="datetime-local"
                  value={meetingEnd}
                  onChange={e => setMeetingEnd(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                />
              </div>

              {/* Sinh viên */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111111]">Sinh viên tham dự</span>
                  {studentOptions.length > 0 && (
                    <button
                      type="button"
                      disabled={saving || !classId}
                      onClick={() =>
                        selectedStudents.length === studentOptions.length
                          ? setSelectedStudents([])
                          : setSelectedStudents(studentOptions.map(o => o.value))
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-[#E02020]/30 bg-[#FFF0F0] px-2 py-0.5 text-[11px] font-semibold text-[#E02020] transition-colors hover:bg-[#FFE0E0] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {selectedStudents.length === studentOptions.length ? (
                        <>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                          Bỏ chọn tất cả
                        </>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                          Chọn tất cả ({studentOptions.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
                <MultiSelect
                  options={studentOptions}
                  value={selectedStudents}
                  onChange={setSelectedStudents}
                  disabled={saving || !classId}
                  placeholder="Chọn sinh viên trong lớp"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <Label htmlFor="m-notes">
                  Nội dung / ghi chú buổi họp
                  <span className="ml-1 text-[#9CA3AF]">(tối thiểu {NOTES_MIN} ký tự)</span>
                </Label>
                <TextArea
                  rows={5}
                  value={notesRaw}
                  onChange={v => setNotesRaw(v)}
                  disabled={saving}
                />
                {notesRaw.length > 0 && notesRaw.length < NOTES_MIN && (
                  <p className="mt-1 text-xs text-[#E02020]">
                    Còn thiếu {NOTES_MIN - notesRaw.length} ký tự
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
          <Button type="button" size="sm" variant="outline"
            className="border-[#E0E0E0] text-[#444444]"
            disabled={saving}
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setCreateOpen(false)}>
            Hủy
          </Button>
          <Button type="button" size="sm" variant="danger"
            disabled={saving || loadingPrep}
            startIcon={saving
              ? <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              : <CheckLineIcon className="size-4 shrink-0" aria-hidden />
            }
            onClick={() => void submitCreate()}>
            {saving ? 'Đang lưu...' : 'Tạo buổi họp'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
