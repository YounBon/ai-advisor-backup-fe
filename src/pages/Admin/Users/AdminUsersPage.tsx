import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
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
  return [code, name].filter(Boolean).join(' - ')
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

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRows, setDetailRows] = useState<[string, string][]>([])
  const [detailTitle, setDetailTitle] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

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

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userService.getUsers({ role: roleFilter, page, limit })
      const data = res.data as { items: ListUser[]; pagination: Pagination }
      setRows(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, page])

  useEffect(() => {
    setPage(1)
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
      toast.error('Phải chọn khoa và ngành cùng lúc (org.department_id + org.major_id)')
      return
    }
    if (tab === 'student' && !createForm.studentCode.trim()) {
      toast.error('Mã sinh viên (student_info.student_code) là bắt buộc')
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
      if (createForm.staffCode.trim() || createForm.advisorTitle.trim()) {
        body.advisor_info = {
          ...(createForm.staffCode.trim() ? { staff_code: createForm.staffCode.trim() } : {}),
          ...(createForm.advisorTitle.trim() ? { title: createForm.advisorTitle.trim() } : {}),
        }
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
        ['ID', detail._id],
        ['Username', detail.username],
        ['Email', detail.email],
        ['Họ tên', fullName],
        ['Vai trò', detail.role],
        ['Trạng thái', detail.status],
        ['Khoa', departmentDisplay],
        ['Ngành', majorDisplay],
      ]
      if (detail.role === 'STUDENT') {
        lines.push(['Mã SV', detail.student_info?.student_code ?? '—'])
      }
      if (detail.role === 'ADVISOR') {
        lines.push(['Mã CB', detail.advisor_info?.staff_code ?? '—'])
        lines.push(['Chức danh', detail.advisor_info?.title ?? '—'])
      }
      setDetailRows(lines)
    } catch {
      setDetailRows([
        ['ID', row._id],
        ['Họ tên', row.full_name || row.profile?.full_name || row.username || '—'],
        [
          'Khoa',
          row.department_name ||
            extractOrgName(row.org?.department_id, 'department_code', 'department_name') ||
            normalizeRefId(row.org?.department_id) ||
            '—',
        ],
        [
          'Ngành',
          row.major_name ||
            extractOrgName(row.org?.major_id, 'major_code', 'major_name') ||
            normalizeRefId(row.org?.major_id) ||
            '—',
        ],
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
        <PageMeta title="Người dùng | Advisor" description="Chỉ ADMIN" />
        <PageBreadcrumb pageTitle="Cố vấn & sinh viên" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Chỉ tài khoản ADMIN mới tạo cố vấn/sinh viên được.
        </p>
      </>
    )
  }

  return (
    <>
      <PageMeta
        title="Cố vấn & sinh viên | Advisor"
        description="Tạo tài khoản cố vấn và sinh viên (admin-provisioning-flow)"
      />
      <PageBreadcrumb pageTitle="Cố vấn & sinh viên" />

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('advisor')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'advisor'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Cố vấn (ADVISOR)
            </button>
            <button
              type="button"
              onClick={() => setTab('student')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'student'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Sinh viên (STUDENT)
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {tab === 'advisor' ? 'Danh sách cố vấn' : 'Danh sách sinh viên'}
            </h2>
            <Button size="sm" onClick={() => void openCreate()}>
              {tab === 'advisor' ? 'Thêm cố vấn' : 'Thêm sinh viên'}
            </Button>
          </div>

          {loading ? (
            <p className="py-6 text-gray-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Họ tên
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Email
                    </TableCell>
                    {tab === 'student' && (
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Mã SV
                      </TableCell>
                    )}
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Trạng thái
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <td className="px-3 py-6 text-gray-500" colSpan={tab === 'student' ? 5 : 4}>
                        Chưa có dữ liệu.
                      </td>
                    </TableRow>
                  ) : (
                    rows.map(row => (
                      <TableRow
                        key={row._id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-3 py-2">
                          {row.full_name || row.profile?.full_name || row.username}
                        </TableCell>
                        <TableCell className="px-3 py-2">{row.email}</TableCell>
                        {tab === 'student' && (
                          <TableCell className="px-3 py-2">
                            {row.student_info?.student_code ?? '—'}
                          </TableCell>
                        )}
                        <TableCell className="px-3 py-2">{row.status}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => void openDetail(row)}>
                            Xem
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
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Trang {pagination.page}/{pagination.total_pages} — {pagination.total} bản ghi
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.total_pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-lg p-6">
        <h3 className="mb-4 text-lg font-semibold">{detailTitle}</h3>
        {detailLoading ? (
          <p className="py-6 text-sm text-gray-500">Đang tải...</p>
        ) : (
          <dl className="space-y-2 text-sm">
            {detailRows.map(([k, v]) => (
              <div key={k} className="flex gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
                <dt className="w-28 shrink-0 font-medium text-gray-500">{k}</dt>
                <dd className="break-all text-gray-800 dark:text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-6 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
            Đóng
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8"
      >
        <h3 className="mb-2 text-lg font-semibold sm:text-xl">
          {tab === 'advisor' ? 'Thêm cố vấn' : 'Thêm sinh viên'}
        </h3>
        <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
          API: <code>POST /api/users/create</code> — khoa và ngành bắt buộc cùng nhau.
        </p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0">
            <Label htmlFor="u-fullname">Họ tên *</Label>
            <InputField
              id="u-fullname"
              value={createForm.fullName}
              onChange={e => setCreateFormField('fullName', e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="u-email">Email *</Label>
            <InputField
              id="u-email"
              type="email"
              value={createForm.email}
              onChange={e => setCreateFormField('email', e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="u-username">Username (tùy, ≥3 ký tự)</Label>
            <InputField
              id="u-username"
              value={createForm.username}
              onChange={e => setCreateFormField('username', e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="u-password">Mật khẩu *</Label>
            <InputField
              id="u-password"
              type="password"
              value={createForm.password}
              onChange={e => setCreateFormField('password', e.target.value)}
              disabled={saving}
            />
          </div>
          {tab === 'student' ? (
            <div className="min-w-0 sm:col-span-2">
              <Label htmlFor="u-masv">Mã sinh viên *</Label>
              <InputField
                id="u-masv"
                value={createForm.studentCode}
                onChange={e => setCreateFormField('studentCode', e.target.value)}
                disabled={saving}
              />
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <Label htmlFor="u-staff">Mã cán bộ (tùy)</Label>
                <InputField
                  id="u-staff"
                  value={createForm.staffCode}
                  onChange={e => setCreateFormField('staffCode', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="u-title">Chức danh (tùy)</Label>
                <InputField
                  id="u-title"
                  value={createForm.advisorTitle}
                  onChange={e => setCreateFormField('advisorTitle', e.target.value)}
                  disabled={saving}
                  placeholder="VD: ThS"
                />
              </div>
            </>
          )}
          <div className="min-w-0">
            <Label>Khoa *</Label>
            <Select
              key={`creat-dept-${createOpen}-${deptPicklist.length}`}
              options={deptOptions}
              placeholder="Chọn khoa"
              onChange={v => void onDeptChange(v)}
              defaultValue={createForm.deptId}
            />
          </div>
          <div className="min-w-0">
            <Label>Ngành *</Label>
            <Select
              key={`creat-maj-${createForm.deptId}-${majorPicklist.length}`}
              options={majorOptions}
              placeholder="Chọn ngành (sau khi chọn khoa)"
              onChange={v => setCreateFormField('majorId', v)}
              defaultValue={createForm.majorId}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => setCreateOpen(false)}
          >
            Hủy
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void submitCreate()}>
            {saving ? 'Đang lưu...' : 'Tạo'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
