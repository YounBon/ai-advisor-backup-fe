import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
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
  AngleLeftIcon,
  AngleRightIcon,
  CalenderIcon,
  ChatIcon,
  CheckLineIcon,
  CloseLineIcon,
  EyeIcon,
  GroupIcon,
  PlusIcon,
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
  notes_summary?: string
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
  const limit = 15
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<MeetingRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classId, setClassId] = useState<string | null>(null)
  const [classDisplayLabel, setClassDisplayLabel] = useState<string | null>(null)
  const [loadingPrep, setLoadingPrep] = useState(false)
  const [studentOptions, setStudentOptions] = useState<{ value: string; text: string }[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [meetingStart, setMeetingStart] = useState('')
  const [meetingEnd, setMeetingEnd] = useState('')
  const [notesRaw, setNotesRaw] = useState('')
  const [termId, setTermId] = useState('')
  const [termOptions, setTermOptions] = useState<{ value: string; label: string }[]>([])
  const [termSelectKey, setTermSelectKey] = useState(0)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailMeeting, setDetailMeeting] = useState<MeetingRow | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('students')
  const [feedbackRows, setFeedbackRows] = useState<FeedbackForMeeting[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await meetingService.listAdvisorMeetings({ page, limit })
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
  }, [page, limit])

  useEffect(() => {
    void loadMeetings()
  }, [loadMeetings])

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

  const openCreate = async () => {
    setCreateOpen(true)
    setSelectedStudents([])
    setMeetingStart('')
    setMeetingEnd('')
    setNotesRaw('')
    setTermId('')
    setLoadingPrep(true)
    try {
      const [clsRes, termsRes, activeRes] = await Promise.all([
        advisorClassService.getMyAdvisorClasses({}),
        masterDataService.getTermsList({ page: 1, limit: 50 }),
        masterDataService.getActiveTerm().catch(() => null),
      ])
      const cls = clsRes.data as {
        _id?: string
        class_code?: string
        class_name?: string
      } | null
      setClassId(cls?._id ? String(cls._id) : null)
      const cParts = [cls?.class_code, cls?.class_name].filter(Boolean)
      setClassDisplayLabel(cParts.length ? cParts.join(' — ') : null)

      const tdata = termsRes.data as { items?: { _id: string; term_code?: string; term_name?: string }[] }
      const opts =
        tdata.items?.map(t => ({
          value: t._id,
          label:
            t.term_code && t.term_name
              ? `${t.term_code} — ${t.term_name}`
              : (t.term_code ?? t.term_name ?? 'Học kỳ'),
        })) ?? []
      setTermOptions(opts)

      const active = activeRes?.data as { _id?: string } | undefined
      if (active?._id) {
        setTermId(String(active._id))
      } else {
        setTermId('')
      }
      setTermSelectKey(k => k + 1)

      if (cls?._id) {
        const memRes = await classMemberService.listMembers({ page: 1, limit: 50 })
        const mdata = memRes.data as { items: MemberRow[] }
        const studs = mdata.items ?? []
        setStudentOptions(
          studs.map(r => {
            const name =
              r.student?.profile?.full_name ||
              r.student?.username ||
              (r.student?._id ? 'Sinh viên' : '')
            return {
              value: String(r.student?._id ?? ''),
              text: `${name}${r.student?.email ? ` (${r.student.email})` : ''}`,
            }
          }).filter(o => o.value)
        )
      } else {
        setStudentOptions([])
        toast.message('Chưa có lớp cố vấn — không thể mời sinh viên')
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
        title="Cuộc họp tư vấn | Advisor"
        description="POST /api/meeting/ — tạo lịch họp với sinh viên"
      />
      <PageBreadcrumb pageTitle="Cuộc họp tư vấn" />

      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/45 bg-gradient-to-br from-brand-50 via-white to-violet-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.28)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/45 dark:via-gray-900 dark:to-violet-950/30 dark:ring-brand-400/10 sm:p-6 md:flex md:items-center md:justify-between md:gap-8"
        aria-labelledby="meetings-hero-title"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-500/15" aria-hidden />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/25">
            <CalenderIcon className="size-3.5 shrink-0" aria-hidden />
            Lịch SHCVHT
          </p>
          <h2 id="meetings-hero-title" className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Tạo buổi họp, mời sinh viên, theo dõi phản hồi sau họp
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Một luồng rõ ràng: danh sách bên dưới để tra cứu nhanh — nút chính bên phải để lên lịch mới.
          </p>
        </div>
        <div className="relative z-10 mt-5 shrink-0 md:mt-0">
          <Button
            type="button"
            size="md"
            variant="primary"
            className="shadow-lg"
            startIcon={<PlusIcon className="size-[18px] shrink-0" aria-hidden />}
            endIcon={<CalenderIcon className="size-[18px] shrink-0 opacity-95" aria-hidden />}
            onClick={() => void openCreate()}
          >
            Tạo cuộc họp
          </Button>
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
              Cuộc họp đã lên lịch
            </h3>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="font-semibold"
            startIcon={<PlusIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => void openCreate()}
          >
            Thêm buổi họp
          </Button>
        </div>
        {loading ? (
          <div className="space-y-3 py-4" aria-busy="true">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
            ))}
          </div>
        ) : (
          <>
            <Table className="text-left text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Lớp
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Bắt đầu
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Kết thúc
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-4 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          <CalenderIcon className="size-6" aria-hidden />
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Chưa có cuộc họp nào
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Bấm <span className="font-semibold text-brand-600">Tạo cuộc họp</span> phía trên để bắt đầu.
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
                      <TableCell className="px-4 py-3.5">
                        <span className="font-medium text-gray-900 dark:text-white">{classLabel(row)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300">
                        {formatDt(row.meeting_time)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300">
                        {formatDt(row.meeting_end_time)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right">
                        <Button
                          type="button"
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
            {pagination && pagination.total_pages > 1 && (
              <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                <span className="tabular-nums">
                  <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span>
                  <span className="mx-1 text-gray-400">/</span>
                  {pagination.total_pages} trang —{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> buổi
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

      <Modal
        isOpen={detailOpen}
        onClose={closeDetail}
        className="max-w-3xl overflow-hidden p-0"
      >
        {detailMeeting ? (
          <>
            <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/95 to-violet-50/50 px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
                    <EyeIcon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
                      Chi tiết cuộc họp
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {classLabel(detailMeeting)} · {formatDt(detailMeeting.meeting_time)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 pt-4">
            <dl className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm sm:grid-cols-2 dark:border-gray-800 dark:bg-white/[0.03]">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lớp</dt>
                <dd className="mt-1 font-semibold text-gray-900 dark:text-white/90">
                  {classLabel(detailMeeting)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Khung giờ</dt>
                <dd className="mt-1 text-gray-800 dark:text-white/90">
                  {formatDt(detailMeeting.meeting_time)} → {formatDt(detailMeeting.meeting_end_time)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tóm tắt</dt>
                <dd className="mt-1 whitespace-pre-wrap text-gray-800 dark:text-white/90">
                  {detailMeeting.notes_summary ?? '—'}
                </dd>
              </div>
            </dl>

            <nav
              className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-1.5 dark:border-gray-700 dark:bg-gray-900/50"
              aria-label="Chi tiết cuộc họp"
            >
              <button
                type="button"
                onClick={() => setDetailTab('students')}
                aria-current={detailTab === 'students' ? 'true' : undefined}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 sm:flex-none ${
                  detailTab === 'students'
                    ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md ring-1 ring-brand-400/30'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <GroupIcon className="size-4 shrink-0" aria-hidden />
                Sinh viên tham dự
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('feedback')}
                aria-current={detailTab === 'feedback' ? 'true' : undefined}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 sm:flex-none ${
                  detailTab === 'feedback'
                    ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md ring-1 ring-brand-400/30'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <ChatIcon className="size-4 shrink-0" aria-hidden />
                Phản hồi sau họp
              </button>
            </nav>

            <div className="mt-4 max-h-[50vh] overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
              {detailTab === 'students' ? (
                <Table className="text-left text-sm" framed={false}>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Họ tên
                      </TableCell>
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Email
                      </TableCell>
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Mã SV
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailStudentList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                          Chưa có danh sách sinh viên cho cuộc họp này.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detailStudentList.map(s => (
                        <TableRow
                          key={s._id}
                          className="border-b border-gray-100 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                            {s.profile?.full_name ?? s.username ?? 'Sinh viên'}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">{s.email ?? '—'}</TableCell>
                          <TableCell className="px-4 py-2.5 font-mono text-sm text-gray-800 dark:text-gray-200">
                            {s.student_info?.student_code ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : feedbackLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <TimeIcon className="size-5 animate-pulse" aria-hidden />
                  Đang tải phản hồi...
                </div>
              ) : (
                <Table className="text-left text-sm" framed={false}>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Thời gian
                      </TableCell>
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Lớp / Cố vấn
                      </TableCell>
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Cảm xúc
                      </TableCell>
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Đánh giá
                      </TableCell>
                      <TableCell isHeader className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Nội dung
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbackRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                          Chưa có phản hồi sau buổi họp này.
                        </TableCell>
                      </TableRow>
                    ) : (
                      feedbackRows.map(fb => (
                        <TableRow
                          key={fb._id}
                          className="border-b border-gray-100 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">
                            {formatDt(fb.submitted_at)}
                          </TableCell>
                          <TableCell className="max-w-[200px] px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                            <div className="line-clamp-2">{fb.class_display || '—'}</div>
                            <div className="mt-0.5 line-clamp-1 text-gray-500">
                              {fb.advisor_display || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                            {fb.sentiment_label ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 tabular-nums text-sm font-semibold text-gray-900 dark:text-white">
                            {fb.rating != null ? fb.rating : '—'}
                          </TableCell>
                          <TableCell className="max-w-md px-4 py-2.5">
                            <span className="line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
                              {fb.feedback_text}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="font-semibold"
                startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
                onClick={closeDetail}
              >
                Đóng
              </Button>
            </div>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="max-w-lg overflow-hidden p-0"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/95 to-violet-50/50 px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
              <PlusIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
                Tạo cuộc họp tư vấn
              </h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Chọn khung giờ, sinh viên và ghi chú tối thiểu {NOTES_MIN} ký tự.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {loadingPrep ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <TimeIcon className="size-5 animate-pulse" aria-hidden />
              Đang tải dữ liệu lớp...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-100/80 bg-gradient-to-br from-brand-50/60 to-white px-4 py-3 dark:border-brand-500/20 dark:from-brand-950/30 dark:to-gray-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  Lớp cố vấn
                </span>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">
                  {classDisplayLabel || 'Chưa có lớp'}
                </p>
              </div>
              <div>
                <Label htmlFor="m-term">Học kỳ (tuỳ chọn)</Label>
                <select
                  id="m-term"
                  key={termSelectKey}
                  value={termId}
                  onChange={e => setTermId(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">— Không gửi term_id —</option>
                  {termOptions.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="m-start">Bắt đầu</Label>
                <input
                  id="m-start"
                  type="datetime-local"
                  value={meetingStart}
                  onChange={e => setMeetingStart(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="m-end">Kết thúc</Label>
                <input
                  id="m-end"
                  type="datetime-local"
                  value={meetingEnd}
                  onChange={e => setMeetingEnd(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <MultiSelect
                label="Sinh viên tham dự"
                options={studentOptions}
                value={selectedStudents}
                onChange={setSelectedStudents}
                disabled={saving || !classId}
                placeholder="Chọn sinh viên trong lớp"
              />
              <div>
                <Label htmlFor="m-notes">Nội dung / ghi chú buổi họp (≥ {NOTES_MIN} ký tự)</Label>
                <TextArea
                  rows={5}
                  value={notesRaw}
                  onChange={v => setNotesRaw(v)}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            className="font-semibold"
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setCreateOpen(false)}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="font-semibold shadow-md"
            disabled={saving || loadingPrep}
            startIcon={
              saving ? (
                <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              ) : (
                <CheckLineIcon className="size-4 shrink-0" aria-hidden />
              )
            }
            onClick={() => void submitCreate()}
          >
            {saving ? 'Đang lưu...' : 'Tạo buổi họp'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
