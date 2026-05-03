import { useCallback, useEffect, useState } from 'react'
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
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'

type TabKey = 'departments' | 'majors' | 'terms'

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
  created_at?: string
}

type MajorItem = {
  _id: string
  major_code: string
  major_name: string
  department_id?: { _id?: string; department_code?: string; department_name?: string }
  created_at?: string
}

type TermItem = {
  _id: string
  term_code: string
  academic_year: string
  term_name: string
  start_date: string
  end_date: string
  status: string
  created_at?: string
}

type DepartmentFormState = {
  deptCode: string
  deptName: string
}

type MajorFormState = {
  majorCode: string
  majorName: string
  majorDeptId: string
}

type TermFormState = {
  termCode: string
  academicYear: string
  termName: string
  startDate: string
  endDate: string
  termStatus: 'ACTIVE' | 'INACTIVE' | ''
}

const initialDepartmentForm: DepartmentFormState = {
  deptCode: '',
  deptName: '',
}

const initialMajorForm: MajorFormState = {
  majorCode: '',
  majorName: '',
  majorDeptId: '',
}

const initialTermForm: TermFormState = {
  termCode: '',
  academicYear: '',
  termName: '',
  startDate: '',
  endDate: '',
  termStatus: '',
}

export default function MasterDataPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState<TabKey>('departments')
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [majors, setMajors] = useState<MajorItem[]>([])
  const [terms, setTerms] = useState<TermItem[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTitle, setDetailTitle] = useState('')
  const [detailRows, setDetailRows] = useState<[string, string][]>([])

  const [createDeptOpen, setCreateDeptOpen] = useState(false)
  const [deptForm, setDeptForm] = useState<DepartmentFormState>(initialDepartmentForm)
  const [savingDept, setSavingDept] = useState(false)

  const [createMajorOpen, setCreateMajorOpen] = useState(false)
  const [majorForm, setMajorForm] = useState<MajorFormState>(initialMajorForm)
  const [savingMajor, setSavingMajor] = useState(false)
  const [departmentPicklist, setDepartmentPicklist] = useState<DepartmentItem[]>([])

  const [createTermOpen, setCreateTermOpen] = useState(false)
  const [termForm, setTermForm] = useState<TermFormState>(initialTermForm)
  const [savingTerm, setSavingTerm] = useState(false)

  const loadDepartments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await masterDataService.getDepartmentsList({ page, limit })
      const data = res.data as { items: DepartmentItem[]; pagination: Pagination }
      setDepartments(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [page])

  const loadMajors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await masterDataService.getMajorsList({ page, limit })
      const data = res.data as { items: MajorItem[]; pagination: Pagination }
      setMajors(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [page])

  const loadTerms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await masterDataService.getTermsList({ page, limit })
      const data = res.data as { items: TermItem[]; pagination: Pagination }
      setTerms(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    setPage(1)
  }, [tab])

  useEffect(() => {
    if (tab === 'departments') loadDepartments()
    else if (tab === 'majors') loadMajors()
    else loadTerms()
  }, [tab, page, loadDepartments, loadMajors, loadTerms])

  useEffect(() => {
    if (!createMajorOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
        const data = res.data as { items: DepartmentItem[] }
        if (!cancelled) setDepartmentPicklist(data.items ?? [])
      } catch {
        if (!cancelled) toast.error('Đã có lỗi xảy ra')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [createMajorOpen])

  const openDetailDepartment = (row: DepartmentItem) => {
    setDetailTitle('Chi tiết khoa')
    setDetailRows([
      ['ID', row._id],
      ['Mã khoa', row.department_code],
      ['Tên khoa', row.department_name],
      ['Tạo lúc', row.created_at ? String(row.created_at) : '—'],
    ])
    setDetailOpen(true)
  }

  const openDetailMajor = (row: MajorItem) => {
    const d = row.department_id
    setDetailTitle('Chi tiết ngành')
    setDetailRows([
      ['ID', row._id],
      ['Mã ngành', row.major_code],
      ['Tên ngành', row.major_name],
      [
        'Khoa',
        d && typeof d === 'object'
          ? `${d.department_code ?? ''} — ${d.department_name ?? d._id ?? ''}`
          : '—',
      ],
      ['Tạo lúc', row.created_at ? String(row.created_at) : '—'],
    ])
    setDetailOpen(true)
  }

  const openDetailTerm = (row: TermItem) => {
    setDetailTitle('Chi tiết học kỳ')
    setDetailRows([
      ['ID', row._id],
      ['Mã HK', row.term_code],
      ['Năm học', row.academic_year],
      ['Tên HK', row.term_name],
      ['Bắt đầu', row.start_date ? String(row.start_date) : '—'],
      ['Kết thúc', row.end_date ? String(row.end_date) : '—'],
      ['Trạng thái', row.status],
      ['Tạo lúc', row.created_at ? String(row.created_at) : '—'],
    ])
    setDetailOpen(true)
  }

  const submitDepartment = async () => {
    if (!deptForm.deptCode.trim() || !deptForm.deptName.trim()) {
      toast.error('Nhập đủ mã và tên khoa')
      return
    }
    setSavingDept(true)
    try {
      const res = await masterDataService.createDepartment({
        department_code: deptForm.deptCode.trim(),
        department_name: deptForm.deptName.trim(),
      })
      toast.success(viApiMessage(res.message, 'Tạo khoa thành công'))
      setCreateDeptOpen(false)
      setDeptForm(initialDepartmentForm)
      loadDepartments()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setSavingDept(false)
    }
  }

  const submitMajor = async () => {
    if (!majorForm.majorCode.trim() || !majorForm.majorName.trim() || !majorForm.majorDeptId) {
      toast.error('Nhập đủ thông tin và chọn khoa')
      return
    }
    setSavingMajor(true)
    try {
      const res = await masterDataService.createMajor({
        major_code: majorForm.majorCode.trim(),
        major_name: majorForm.majorName.trim(),
        department_id: majorForm.majorDeptId,
      })
      toast.success(viApiMessage(res.message, 'Tạo ngành thành công'))
      setCreateMajorOpen(false)
      setMajorForm(initialMajorForm)
      loadMajors()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setSavingMajor(false)
    }
  }

  const submitTerm = async () => {
    if (
      !termForm.termCode.trim() ||
      !termForm.academicYear.trim() ||
      !termForm.termName.trim() ||
      !termForm.startDate ||
      !termForm.endDate
    ) {
      toast.error('Nhập đủ các trường học kỳ')
      return
    }
    const startIso = new Date(termForm.startDate).toISOString()
    const endIso = new Date(termForm.endDate).toISOString()
    setSavingTerm(true)
    try {
      const body: Record<string, string> = {
        term_code: termForm.termCode.trim(),
        academic_year: termForm.academicYear.trim(),
        term_name: termForm.termName.trim(),
        start_date: startIso,
        end_date: endIso,
      }
      if (termForm.termStatus) body.status = termForm.termStatus
      const res = await masterDataService.createTerm(body)
      toast.success(viApiMessage(res.message, 'Tạo học kỳ thành công'))
      setCreateTermOpen(false)
      setTermForm(initialTermForm)
      loadTerms()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setSavingTerm(false)
    }
  }

  const deptOptions = departmentPicklist.map(d => ({
    value: d._id,
    label: `${d.department_code} — ${d.department_name}`,
  }))

  return (
    <>
      <PageMeta
        title="Dữ liệu nền | Advisor"
        description="Quản lý khoa, ngành, học kỳ (master data)"
      />
      <PageBreadcrumb pageTitle="Dữ liệu nền" />

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['departments', 'Khoa'],
                ['majors', 'Ngành'],
                ['terms', 'Học kỳ'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!isAdmin && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Bạn có thể xem danh sách. Chỉ vai trò ADMIN mới tạo mới được (API §2 trong
              admin-apis.md).
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {tab === 'departments' && 'Danh sách khoa'}
              {tab === 'majors' && 'Danh sách ngành'}
              {tab === 'terms' && 'Danh sách học kỳ'}
            </h2>
            {isAdmin && (
              <div className="flex gap-2">
                {tab === 'departments' && (
                  <Button size="sm" onClick={() => setCreateDeptOpen(true)}>
                    Thêm khoa
                  </Button>
                )}
                {tab === 'majors' && (
                  <Button size="sm" onClick={() => setCreateMajorOpen(true)}>
                    Thêm ngành
                  </Button>
                )}
                {tab === 'terms' && (
                  <Button size="sm" onClick={() => setCreateTermOpen(true)}>
                    Thêm học kỳ
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <p className="py-8 text-center text-gray-500">Đang tải...</p>
            ) : (
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    {tab === 'departments' && (
                      <>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Mã
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Tên khoa
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Thao tác
                        </TableCell>
                      </>
                    )}
                    {tab === 'majors' && (
                      <>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Mã ngành
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Tên ngành
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Khoa
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Thao tác
                        </TableCell>
                      </>
                    )}
                    {tab === 'terms' && (
                      <>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Mã HK
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Năm học
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Tên
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Trạng thái
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Thao tác
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tab === 'departments' &&
                    departments.map(row => (
                      <TableRow
                        key={row._id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-3 py-2">{row.department_code}</TableCell>
                        <TableCell className="px-3 py-2">{row.department_name}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailDepartment(row)}
                          >
                            Xem
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {tab === 'majors' &&
                    majors.map(row => (
                      <TableRow
                        key={row._id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-3 py-2">{row.major_code}</TableCell>
                        <TableCell className="px-3 py-2">{row.major_name}</TableCell>
                        <TableCell className="px-3 py-2">
                          {row.department_id && typeof row.department_id === 'object'
                            ? `${row.department_id.department_code ?? ''} ${row.department_id.department_name ?? ''}`
                            : '—'}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => openDetailMajor(row)}>
                            Xem
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {tab === 'terms' &&
                    terms.map(row => (
                      <TableRow
                        key={row._id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-3 py-2">{row.term_code}</TableCell>
                        <TableCell className="px-3 py-2">{row.academic_year}</TableCell>
                        <TableCell className="px-3 py-2">{row.term_name}</TableCell>
                        <TableCell className="px-3 py-2">{row.status}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => openDetailTerm(row)}>
                            Xem
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>

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
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          {detailTitle}
        </h3>
        <dl className="space-y-2 text-sm">
          {detailRows.map(([k, v]) => (
            <div key={k} className="flex gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
              <dt className="w-28 shrink-0 font-medium text-gray-500">{k}</dt>
              <dd className="text-gray-800 dark:text-white/90">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
            Đóng
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={createDeptOpen}
        onClose={() => !savingDept && setCreateDeptOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Thêm khoa</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="md-dept-code">Mã khoa</Label>
            <InputField
              id="md-dept-code"
              value={deptForm.deptCode}
              onChange={e => setDeptForm(prev => ({ ...prev, deptCode: e.target.value }))}
              placeholder="VD: CNTT"
              disabled={savingDept}
            />
          </div>
          <div>
            <Label htmlFor="md-dept-name">Tên khoa</Label>
            <InputField
              id="md-dept-name"
              value={deptForm.deptName}
              onChange={e => setDeptForm(prev => ({ ...prev, deptName: e.target.value }))}
              placeholder="Tên đầy đủ"
              disabled={savingDept}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={savingDept}
            onClick={() => setCreateDeptOpen(false)}
          >
            Hủy
          </Button>
          <Button size="sm" disabled={savingDept} onClick={() => void submitDepartment()}>
            {savingDept ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={createMajorOpen}
        onClose={() => !savingMajor && setCreateMajorOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Thêm ngành</h3>
        <p className="mb-3 text-xs text-gray-500">
          Nếu danh sách khoa trống, mở tab Khoa trước hoặc nhấn Thêm ngành lại sau khi có dữ liệu.
        </p>
        <div className="space-y-4">
          <div>
            <Label>Khoa</Label>
            <Select
              key={createMajorOpen ? 'open' : 'closed'}
              options={deptOptions}
              placeholder="Chọn khoa"
              onChange={v => setMajorForm(prev => ({ ...prev, majorDeptId: v }))}
            />
          </div>
          <div>
            <Label htmlFor="md-major-code">Mã ngành</Label>
            <InputField
              id="md-major-code"
              value={majorForm.majorCode}
              onChange={e => setMajorForm(prev => ({ ...prev, majorCode: e.target.value }))}
              disabled={savingMajor}
            />
          </div>
          <div>
            <Label htmlFor="md-major-name">Tên ngành</Label>
            <InputField
              id="md-major-name"
              value={majorForm.majorName}
              onChange={e => setMajorForm(prev => ({ ...prev, majorName: e.target.value }))}
              disabled={savingMajor}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={savingMajor}
            onClick={() => setCreateMajorOpen(false)}
          >
            Hủy
          </Button>
          <Button size="sm" disabled={savingMajor} onClick={() => void submitMajor()}>
            {savingMajor ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={createTermOpen}
        onClose={() => !savingTerm && setCreateTermOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Thêm học kỳ</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="md-term-code">Mã học kỳ</Label>
            <InputField
              id="md-term-code"
              value={termForm.termCode}
              onChange={e => setTermForm(prev => ({ ...prev, termCode: e.target.value }))}
              placeholder="VD: 2026-1"
              disabled={savingTerm}
            />
          </div>
          <div>
            <Label htmlFor="md-academic-year">Năm học</Label>
            <InputField
              id="md-academic-year"
              value={termForm.academicYear}
              onChange={e => setTermForm(prev => ({ ...prev, academicYear: e.target.value }))}
              placeholder="VD: 2026-2027"
              disabled={savingTerm}
            />
          </div>
          <div>
            <Label htmlFor="md-term-name">Tên học kỳ</Label>
            <InputField
              id="md-term-name"
              value={termForm.termName}
              onChange={e => setTermForm(prev => ({ ...prev, termName: e.target.value }))}
              disabled={savingTerm}
            />
          </div>
          <div>
            <Label htmlFor="md-start">Bắt đầu</Label>
            <input
              id="md-start"
              type="datetime-local"
              value={termForm.startDate}
              onChange={e => setTermForm(prev => ({ ...prev, startDate: e.target.value }))}
              disabled={savingTerm}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="md-end">Kết thúc</Label>
            <input
              id="md-end"
              type="datetime-local"
              value={termForm.endDate}
              onChange={e => setTermForm(prev => ({ ...prev, endDate: e.target.value }))}
              disabled={savingTerm}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="md-term-status">Trạng thái (tùy chọn)</Label>
            <select
              id="md-term-status"
              value={termForm.termStatus}
              onChange={e =>
                setTermForm(prev => ({
                  ...prev,
                  termStatus: e.target.value as 'ACTIVE' | 'INACTIVE' | '',
                }))
              }
              disabled={savingTerm}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Mặc định (INACTIVE)</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={savingTerm}
            onClick={() => setCreateTermOpen(false)}
          >
            Hủy
          </Button>
          <Button size="sm" disabled={savingTerm} onClick={() => void submitTerm()}>
            {savingTerm ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
