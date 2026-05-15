import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { userService } from '@/services/UserService'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'

type TabKey = 'advisor' | 'student'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type DepartmentItem = {
  _id: string
  department_code: string
  department_name: string
}

type MajorItem = {
  _id: string
  major_code: string
  major_name: string
}

type TermItem = {
  _id: string
  term_code: string
  term_name: string
  academic_year: string
  status: string
}

type ListUser = {
  _id: string
  username: string
  email: string
  role: string
  status: string
  full_name?: string | null
  department_name?: string | null
  major_name?: string | null
  profile?: { full_name?: string }
  org?: {
    department_id?:
    | string
    | { _id?: string; department_code?: string; department_name?: string }
    | null
    major_id?: string | { _id?: string; major_code?: string; major_name?: string } | null
  }
  student_info?: { student_code?: string }
  advisor_info?: { staff_code?: string; title?: string }
}

type UserCreateFormState = {
  fullName: string
  username: string
  email: string
  password: string
  studentCode: string
  staffCode: string
  advisorTitle: string
  deptId: string
  majorId: string
}

const initialCreateFormState: UserCreateFormState = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  studentCode: '',
  staffCode: '',
  advisorTitle: '',
  deptId: '',
  majorId: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function normalizeRefId(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id: unknown })._id)
  }
  return String(raw)
}

function extractOrgName(
  ref: unknown,
  keyCode: 'department_code' | 'major_code',
  keyName: 'department_name' | 'major_name'
): string {
  if (!ref || typeof ref !== 'object') return ''
  const item = ref as Record<string, unknown>
  const code = typeof item[keyCode] === 'string' ? item[keyCode] : ''
  const name = typeof item[keyName] === 'string' ? item[keyName] : ''
  return [code, name].filter(Boolean).join(' — ')
}

// Chuyển chức danh viết tắt → đầy đủ
function expandAdvisorTitle(raw: string | null | undefined): string {
  if (!raw) return '—'
  return raw
    .replace(/\bThS\b\.?/gi, 'Thạc sĩ')
    .replace(/\bTS\b\.?/gi, 'Tiến sĩ')
    .replace(/\bPGS\b\.?/gi, 'Phó Giáo sư')
    .replace(/\bGS\b\.?/gi, 'Giáo sư')
    .replace(/\bCN\b\.?/gi, 'Cử nhân')
    .replace(/\bKS\b\.?/gi, 'Kỹ sư')
    .trim() || '—'
}// ─── Pagination Bar ───────────────────────────────────────────────────────────

function PaginationBar({
  pagination,
  page,
  setPage,
}: {
  pagination: Pagination
  page: number
  setPage: (p: number) => void
}) {
  if (pagination.total_pages <= 1) return null
  const pages = Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === pagination.total_pages || Math.abs(p - page) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="flex items-center justify-between border-t border-[#F0F0F0] px-5 py-3.5">
      <p className="text-xs text-[#6B7280]">
        Trang <span className="font-semibold text-[#111111]">{pagination.page}</span>
        {' / '}
        {pagination.total_pages} &middot;{' '}
        <span className="font-semibold text-[#111111]">{pagination.total}</span> bản ghi
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Trang trước"
          className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {pages.map((item, idx) =>
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
          onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
          disabled={page >= pagination.total_pages}
          aria-label="Trang sau"
          className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState<TabKey>('advisor')
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [rows, setRows] = useState<ListUser[]>([])

  // ── Filter & search state ──
  const [activeTerm, setActiveTerm] = useState<TermItem | null>(null)
  const [deptFilterList, setDeptFilterList] = useState<DepartmentItem[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRows, setDetailRows] = useState<[string, string][]>([])
  const [detailTitle, setDetailTitle] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

  const [lockingId, setLockingId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState<UserCreateFormState>(initialCreateFormState)
  const [deptPicklist, setDeptPicklist] = useState<DepartmentItem[]>([])
  const [majorPicklist, setMajorPicklist] = useState<MajorItem[]>([])

  const setCreateFormField = <K extends keyof UserCreateFormState>(
    key: K,
    value: UserCreateFormState[K]
  ) => {
    setCreateForm(prev => ({ ...prev, [key]: value }))
  }

  const roleFilter = useMemo(() => (tab === 'advisor' ? 'ADVISOR' : 'STUDENT'), [tab])

  // Load active term + department list once on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [termRes, deptRes] = await Promise.all([
          masterDataService.getActiveTerm(),
          masterDataService.getDepartmentsList({ page: 1, limit: 100 }),
        ])
        setActiveTerm((termRes.data as TermItem | null) ?? null)
        const deptData = deptRes.data as { items: DepartmentItem[] }
        const depts = deptData.items ?? []
        console.log('[AdminUsers] Loaded departments:', depts)
        setDeptFilterList(depts)
        // Mặc định chọn khoa đầu tiên
        if (depts.length > 0 && !selectedDeptId) {
          console.log('[AdminUsers] Auto-selecting first dept:', depts[0])
          setSelectedDeptId(depts[0]._id)
        }
      } catch (err) {
        console.error('[AdminUsers] Failed to load departments:', err)
        toast.error('Không thể tải danh sách khoa')
      }
    }
    void init()
  }, [])

  // Debounce search input → searchQuery
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value.trim())
      setPage(1)
    }, 400)
  }

  const loadList = useCallback(async () => {
    // Bắt buộc phải chọn khoa
    if (!selectedDeptId) {
      setRows([])
      setPagination(null)
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        role: roleFilter,
        page,
        limit,
        department_id: selectedDeptId
      }
      if (searchQuery) body.search = searchQuery
      const res = await userService.getUsers(body)
      const data = res.data as { items: ListUser[]; pagination: Pagination }
      setRows(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, page, selectedDeptId, searchQuery])

  useEffect(() => {
    setPage(1)
    setSearchInput('')
    setSearchQuery('')
  }, [tab])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const loadPicklists = async () => {
    try {
      const resDept = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
      const d = resDept.data as { items: DepartmentItem[] }
      setDeptPicklist(d.items ?? [])
    } catch {
      toast.error('Đã có lỗi xảy ra')
    }
  }

  const onDeptChange = async (v: string) => {
    setCreateForm(prev => ({ ...prev, deptId: v, majorId: '' }))
    if (!v) {
      setMajorPicklist([])
      return
    }
    try {
      const rm = await masterDataService.getMajorsList({ department_id: v, limit: 100, page: 1 })
      const md = rm.data as { items: MajorItem[] }
      setMajorPicklist(md.items ?? [])
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setMajorPicklist([])
    }
  }

  const openCreate = async () => {
    setCreateForm(initialCreateFormState)
    setMajorPicklist([])
    await loadPicklists()
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error('Họ tên, email và mật khẩu là bắt buộc')
      return
    }
    if (createForm.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    if (!createForm.deptId || !createForm.majorId) {
      toast.error('Vui lòng chọn khoa và ngành học')
      return
    }
    if (tab === 'student' && !createForm.studentCode.trim()) {
      toast.error('Mã sinh viên là bắt buộc')
      return
    }
    if (tab === 'advisor' && !createForm.staffCode.trim()) {
      toast.error('Mã cán bộ là bắt buộc')
      return
    }
    const usernameTrim = createForm.username.trim()
    const body: Record<string, unknown> = {
      profile: { full_name: createForm.fullName.trim() },
      email: createForm.email.trim(),
      password: createForm.password,
      role: tab === 'advisor' ? 'ADVISOR' : 'STUDENT',
      org: { department_id: createForm.deptId, major_id: createForm.majorId },
    }
    if (usernameTrim.length >= 3) body.username = usernameTrim
    if (tab === 'advisor') {
      body.advisor_info = {
        staff_code: createForm.staffCode.trim(),
        ...(createForm.advisorTitle.trim() ? { title: createForm.advisorTitle.trim() } : {}),
      }
    } else {
      body.student_info = { student_code: createForm.studentCode.trim() }
    }

    setSaving(true)
    try {
      const res = await userService.createUser(body)
      toast.success(viApiMessage(res.message, 'Tạo tài khoản thành công'))
      setCreateOpen(false)
      void loadList()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLock = async (row: ListUser) => {
    const isLocked = row.status === 'LOCKED'
    const action = isLocked ? 'mở khóa' : 'khóa'
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản "${row.full_name || row.profile?.full_name || row.username}"?`)) return

    setLockingId(row._id)
    try {
      const res = isLocked
        ? await userService.unlockUser(row._id)
        : await userService.lockUser(row._id)
      toast.success(viApiMessage(res.message, `${isLocked ? 'Mở khóa' : 'Khóa'} tài khoản thành công`))
      void loadList()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLockingId(null)
    }
  }

  const openDetail = async (row: ListUser) => {
    setDetailTitle(row.role === 'ADVISOR' ? 'Chi tiết cố vấn' : 'Chi tiết sinh viên')
    setDetailRows([])
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await userService.getInfoUser({ user_id: row._id })
      const detail = (res.data as ListUser | undefined) ?? row

      const fullName = detail.full_name || detail.profile?.full_name || '—'
      const deptNameFromOrg = extractOrgName(
        detail.org?.department_id,
        'department_code',
        'department_name'
      )
      const majorNameFromOrg = extractOrgName(detail.org?.major_id, 'major_code', 'major_name')
      const departmentDisplay =
        detail.department_name || deptNameFromOrg || normalizeRefId(detail.org?.department_id) || '—'
      const majorDisplay =
        detail.major_name || majorNameFromOrg || normalizeRefId(detail.org?.major_id) || '—'

      const lines: [string, string][] = [
        ['Họ và tên', fullName],
        ['Tên đăng nhập', detail.username],
        ['Địa chỉ email', detail.email],
        ['Trạng thái', detail.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'],
        ['Khoa / Đơn vị', departmentDisplay],
      ]
      if (detail.role === 'STUDENT') {
        lines.push(['Ngành học', majorDisplay])
        lines.push(['Mã sinh viên', detail.student_info?.student_code ?? '—'])
      }
      if (detail.role === 'ADVISOR') {
        lines.push(['Mã cán bộ', detail.advisor_info?.staff_code ?? '—'])
        lines.push(['Chức danh', expandAdvisorTitle(detail.advisor_info?.title)])
      }
      setDetailRows(lines)
    } catch {
      setDetailRows([
        ['Họ và tên', row.full_name || row.profile?.full_name || row.username || '—'],
        [
          'Khoa / Đơn vị',
          row.department_name ||
          extractOrgName(row.org?.department_id, 'department_code', 'department_name') ||
          normalizeRefId(row.org?.department_id) ||
          '—',
        ],
        ...(row.role === 'STUDENT' ? [[
          'Ngành học',
          row.major_name ||
          extractOrgName(row.org?.major_id, 'major_code', 'major_name') ||
          normalizeRefId(row.org?.major_id) ||
          '—',
        ] as [string, string]] : []),
        ...(row.role === 'ADVISOR' ? [
          ['Mã cán bộ', row.advisor_info?.staff_code ?? '—'] as [string, string],
          ['Chức danh', expandAdvisorTitle(row.advisor_info?.title)] as [string, string],
        ] : []),
      ])
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setDetailLoading(false)
    }
  }

  const deptOptions = deptPicklist.map(d => ({
    value: d._id,
    label: `${d.department_code} — ${d.department_name}`,
  }))
  const majorOptions = majorPicklist.map(m => ({
    value: m._id,
    label: `${m.major_code} — ${m.major_name}`,
  }))

  if (!isAdmin) {
    return (
      <>
        <PageMeta title="Quản lý người dùng | Quản trị hệ thống" description="Chỉ quản trị viên mới có quyền truy cập" />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#FFF0F0]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[#111111]">Không có quyền truy cập</p>
          <p className="text-sm text-[#6B7280]">Chức năng này chỉ dành cho quản trị viên hệ thống.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageMeta
        title="Quản lý người dùng | Quản trị hệ thống"
        description="Quản lý tài khoản cố vấn học tập và sinh viên trong hệ thống"
      />

      {/* ── Tiêu đề trang ── */}
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderLeft: '4px solid #E02020' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Quản trị hệ thống</p>
          <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Quản lý người dùng</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">Quản lý tài khoản cố vấn học tập và sinh viên trong hệ thống</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Active term badge */}
          {activeTerm && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">{activeTerm.term_name}</span>
            </div>
          )}
          {pagination && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-semibold text-[#111111]">{pagination.total}</span>
              <span className="text-xs text-[#6B7280]">{tab === 'advisor' ? 'cố vấn' : 'sinh viên'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs + nội dung ── */}
      <div className="rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        {/* Tab bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F0F0F0] px-5 py-3">
          {([
            { key: 'advisor' as TabKey, label: 'Cố vấn học tập' },
            { key: 'student' as TabKey, label: 'Sinh viên' },
          ]).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key
                ? 'border-[#E02020] bg-[#E02020] text-white'
                : 'border-[#E0E0E0] bg-white text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]'
                }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => void openCreate()}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(to bottom, #E02020, #C01818)',
                boxShadow: '0 4px 14px rgba(224,32,32,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {tab === 'advisor' ? 'Thêm cố vấn' : 'Thêm sinh viên'}
            </button>
          </div>
        </div>

        {/* ── Filter bar: search + khoa ── */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#F0F0F0] px-5 py-3">
          {/* Searchbar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden
            >
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={
                tab === 'advisor'
                  ? 'Tìm theo tên hoặc mã cán bộ...'
                  : 'Tìm theo tên hoặc mã sinh viên...'
              }
              className="w-full rounded-xl border border-[#E0E0E0] bg-white py-2 pl-9 pr-9 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#444444]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown lọc theo khoa — bắt buộc chọn, không có "Tất cả" */}
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[#6B7280]" aria-hidden>
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <select
              value={selectedDeptId}
              onChange={e => { setSelectedDeptId(e.target.value); setPage(1) }}
              className="rounded-xl border border-[#E0E0E0] bg-white py-2 pl-3 pr-8 text-sm text-[#444444] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10"
              disabled={deptFilterList.length === 0}
            >
              {deptFilterList.length === 0 ? (
                <option value="">Không có khoa nào</option>
              ) : (
                deptFilterList.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.department_code} — {d.department_name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Tổng kết quả */}
          {pagination && selectedDeptId && (
            <span className="ml-auto text-xs text-[#6B7280]">
              <span className="font-semibold text-[#111111]">{pagination.total}</span>
              {' '}{tab === 'advisor' ? 'cố vấn' : 'sinh viên'}
              {searchQuery && <span className="text-[#E02020]"> · đang lọc</span>}
            </span>
          )}
        </div>

        {/* Nội dung bảng */}
        {!selectedDeptId ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#FFF0F0]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M2 4h12M4 8h8M6 12h4" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#111111]">Vui lòng chọn khoa</p>
            <p className="text-xs text-[#6B7280]">Chọn khoa từ dropdown bên trên để xem danh sách {tab === 'advisor' ? 'cố vấn' : 'sinh viên'}</p>
          </div>
        ) : loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-[#F9FAFB]" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {tab === 'advisor' ? (
                <Table className="w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                      <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Họ và tên</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Email</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã cán bộ</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Chức danh</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Trạng thái</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="9" cy="7" r="4" stroke="#E02020" strokeWidth="1.5" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-[#111111]">Chưa có cố vấn nào</p>
                            <p className="text-xs text-[#6B7280]">Nhấn <span className="font-semibold text-[#E02020]">Thêm cố vấn</span> để bắt đầu.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map(row => (
                        <TableRow key={row._id} className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]">
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F0] text-xs font-bold text-[#E02020]">
                                {initialsFromName(row.full_name || row.profile?.full_name)}
                              </div>
                              <span className="font-semibold text-[#111111]">
                                {row.full_name || row.profile?.full_name || row.username || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-[#444444]">{row.email}</TableCell>
                          <TableCell className="px-4 py-3.5 font-mono text-sm text-[#6B7280]">
                            {row.advisor_info?.staff_code ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-[#6B7280]">
                            {row.advisor_info?.title ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.status === 'ACTIVE'
                              ? 'bg-[#F0FDF4] text-emerald-700'
                              : row.status === 'LOCKED'
                                ? 'bg-[#FFF0F0] text-[#E02020]'
                                : 'bg-[#F9FAFB] text-[#6B7280]'
                              }`}>
                              {row.status === 'ACTIVE' ? 'Đang hoạt động' : row.status === 'LOCKED' ? 'Đã khóa' : 'Không hoạt động'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" size="sm" variant="outline"
                                className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                                onClick={() => void openDetail(row)}>
                                Chi tiết
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={lockingId === row._id}
                                className={row.status === 'LOCKED'
                                  ? 'border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50'
                                  : 'border-orange-300 text-orange-600 hover:border-orange-500 hover:bg-orange-50'
                                }
                                onClick={() => void handleToggleLock(row)}
                              >
                                {lockingId === row._id
                                  ? '...'
                                  : row.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table className="w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                      <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Họ và tên</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Email</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã sinh viên</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Trạng thái</TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M12 14l9-5-9-5-9 5 9 5z" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-[#111111]">Chưa có sinh viên nào</p>
                            <p className="text-xs text-[#6B7280]">Nhấn <span className="font-semibold text-[#E02020]">Thêm sinh viên</span> để bắt đầu.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map(row => (
                        <TableRow key={row._id} className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]">
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0F0] text-xs font-bold text-[#E02020]">
                                {initialsFromName(row.full_name || row.profile?.full_name)}
                              </div>
                              <span className="font-semibold text-[#111111]">
                                {row.full_name || row.profile?.full_name || row.username || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-[#444444]">{row.email}</TableCell>
                          <TableCell className="px-4 py-3.5 font-mono text-sm font-semibold text-[#111111]">
                            {row.student_info?.student_code ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.status === 'ACTIVE'
                              ? 'bg-[#F0FDF4] text-emerald-700'
                              : row.status === 'LOCKED'
                                ? 'bg-[#FFF0F0] text-[#E02020]'
                                : 'bg-[#F9FAFB] text-[#6B7280]'
                              }`}>
                              {row.status === 'ACTIVE' ? 'Đang hoạt động' : row.status === 'LOCKED' ? 'Đã khóa' : 'Không hoạt động'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" size="sm" variant="outline"
                                className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                                onClick={() => void openDetail(row)}>
                                Chi tiết
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={lockingId === row._id}
                                className={row.status === 'LOCKED'
                                  ? 'border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50'
                                  : 'border-orange-300 text-orange-600 hover:border-orange-500 hover:bg-orange-50'
                                }
                                onClick={() => void handleToggleLock(row)}
                              >
                                {lockingId === row._id
                                  ? '...'
                                  : row.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            {pagination && <PaginationBar pagination={pagination} page={page} setPage={setPage} />}
          </>
        )}
      </div>

      {/* ── Modal chi tiết ── */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-md overflow-hidden p-0">
        <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF0F0]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="#E02020" strokeWidth="1.5" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-bold text-[#111111]">{detailTitle}</h3>
              <p className="text-xs text-[#6B7280]">Thông tin chi tiết tài khoản</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {detailLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-[#F9FAFB]" />
              ))}
            </div>
          ) : (
            <dl className="grid gap-3 rounded-2xl border border-[#F0F0F0] bg-[#F9FAFB] p-4 text-sm">
              {detailRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">{label}</dt>
                  <dd className="mt-1 break-all font-semibold text-[#111111]">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-5 flex justify-end border-t border-[#F0F0F0] pt-4">
            <Button type="button" size="sm" variant="outline"
              className="border-[#E0E0E0] text-[#444444]"
              onClick={() => setDetailOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal thêm tài khoản ── */}
      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
          <h3 className="text-base font-bold text-[#111111]">
            {tab === 'advisor' ? 'Thêm cố vấn học tập mới' : 'Thêm sinh viên mới'}
          </h3>
          <p className="text-xs text-[#6B7280]">
            {tab === 'advisor'
              ? 'Điền đầy đủ thông tin để tạo tài khoản cố vấn'
              : 'Điền đầy đủ thông tin để tạo tài khoản sinh viên'}
          </p>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="u-fullname">Họ và tên <span className="text-[#E02020]">*</span></Label>
              <InputField id="u-fullname" placeholder="Nhập họ và tên đầy đủ"
                value={createForm.fullName} onChange={e => setCreateFormField('fullName', e.target.value)} disabled={saving} />
            </div>
            <div>
              <Label htmlFor="u-email">Địa chỉ email <span className="text-[#E02020]">*</span></Label>
              <InputField id="u-email" type="email" placeholder="Nhập địa chỉ email"
                value={createForm.email} onChange={e => setCreateFormField('email', e.target.value)} disabled={saving} />
            </div>
            <div>
              <Label htmlFor="u-username">Tên đăng nhập <span className="text-xs font-normal text-[#6B7280]">(không bắt buộc, tối thiểu 3 ký tự)</span></Label>
              <InputField id="u-username" placeholder="Để trống hệ thống sẽ tự tạo"
                value={createForm.username} onChange={e => setCreateFormField('username', e.target.value)} disabled={saving} />
            </div>
            <div>
              <Label htmlFor="u-password">Mật khẩu <span className="text-[#E02020]">*</span></Label>
              <InputField id="u-password" type="password" placeholder="Tối thiểu 6 ký tự"
                value={createForm.password} onChange={e => setCreateFormField('password', e.target.value)} disabled={saving} />
            </div>
            {tab === 'student' ? (
              <div className="sm:col-span-2">
                <Label htmlFor="u-masv">Mã sinh viên <span className="text-[#E02020]">*</span></Label>
                <InputField id="u-masv" placeholder="Nhập mã sinh viên"
                  value={createForm.studentCode} onChange={e => setCreateFormField('studentCode', e.target.value)} disabled={saving} />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="u-staff">Mã cán bộ <span className="text-[#E02020]">*</span></Label>
                  <InputField id="u-staff" placeholder="Nhập mã cán bộ"
                    value={createForm.staffCode} onChange={e => setCreateFormField('staffCode', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <Label htmlFor="u-title">Chức danh <span className="text-xs font-normal text-[#6B7280]">(không bắt buộc)</span></Label>
                  <InputField id="u-title" placeholder="Ví dụ: Thạc sĩ, Tiến sĩ"
                    value={createForm.advisorTitle} onChange={e => setCreateFormField('advisorTitle', e.target.value)} disabled={saving} />
                </div>
              </>
            )}
            <div>
              <Label>Khoa / Đơn vị <span className="text-[#E02020]">*</span></Label>
              <Select
                key={`dept-${createOpen}-${deptPicklist.length}`}
                options={deptOptions} placeholder="Chọn khoa"
                onChange={v => void onDeptChange(v)} defaultValue={createForm.deptId} />
            </div>
            <div>
              <Label>Ngành đào tạo <span className="text-[#E02020]">*</span></Label>
              <Select
                key={`maj-${createForm.deptId}-${majorPicklist.length}`}
                options={majorOptions}
                placeholder={createForm.deptId ? 'Chọn ngành' : 'Chọn khoa trước'}
                onChange={v => setCreateFormField('majorId', v)} defaultValue={createForm.majorId} />
            </div>
          </div>
        </div>
        <div className="shrink-0 flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
          <Button type="button" size="sm" variant="outline"
            className="border-[#E0E0E0] text-[#444444]"
            disabled={saving} onClick={() => setCreateOpen(false)}>
            Hủy
          </Button>
          <Button type="button" size="sm" variant="danger"
            disabled={saving} onClick={() => void submitCreate()}>
            {saving ? 'Đang lưu...' : tab === 'advisor' ? 'Tạo cố vấn' : 'Tạo sinh viên'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
