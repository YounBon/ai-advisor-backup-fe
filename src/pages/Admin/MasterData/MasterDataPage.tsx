import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'

type TabKey = 'departments' | 'majors' | 'terms'
type Pagination = { page: number; limit: number; total: number; total_pages: number }
type DepartmentItem = { _id: string; department_code: string; department_name: string; created_at?: string }
type MajorItem = { _id: string; major_code: string; major_name: string; department_id?: { _id?: string; department_code?: string; department_name?: string }; created_at?: string }
type TermItem = { _id: string; term_code: string; academic_year: string; term_name: string; start_date: string; end_date: string; status: string; created_at?: string }
type DepartmentFormState = { deptCode: string; deptName: string }
type MajorFormState = { majorCode: string; majorName: string; majorDeptId: string }
type TermFormState = { termCode: string; academicYear: string; termName: string; startDate: string; endDate: string; termStatus: 'ACTIVE' | 'INACTIVE' | '' }

const initialDepartmentForm: DepartmentFormState = { deptCode: '', deptName: '' }
const initialMajorForm: MajorFormState = { majorCode: '', majorName: '', majorDeptId: '' }
const initialTermForm: TermFormState = { termCode: '', academicYear: '', termName: '', startDate: '', endDate: '', termStatus: '' }

function PaginationBar({ pagination, page, setPage }: { pagination: Pagination; page: number; setPage: (p: number) => void }) {
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
                {' / '}{pagination.total_pages} &middot;{' '}
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
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>
        </div>
    )
}

export default function MasterDataPage() {
    const user = useAuthStore(s => s.user)
    const isAdmin = user?.role === 'ADMIN'
    const [tab, setTab] = useState<TabKey>('departments')
    const [page, setPage] = useState(1)
    const limit = 10
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
    const [majorDeptFilter, setMajorDeptFilter] = useState<string>('')

    const loadDepartments = useCallback(async () => {
        setLoading(true)
        try {
            const res = await masterDataService.getDepartmentsList({ page, limit })
            const data = res.data as { items: DepartmentItem[]; pagination: Pagination }
            setDepartments(data.items ?? [])
            setPagination(data.pagination ?? null)
        } catch { toast.error('Đã có lỗi xảy ra') } finally { setLoading(false) }
    }, [page])

    const loadMajors = useCallback(async () => {
        setLoading(true)
        try {
            const body: Record<string, unknown> = { page, limit }
            if (majorDeptFilter) body.department_id = majorDeptFilter
            const res = await masterDataService.getMajorsList(body)
            const data = res.data as { items: MajorItem[]; pagination: Pagination }
            setMajors(data.items ?? [])
            setPagination(data.pagination ?? null)
        } catch { toast.error('Đã có lỗi xảy ra') } finally { setLoading(false) }
    }, [page, majorDeptFilter])

    const loadTerms = useCallback(async () => {
        setLoading(true)
        try {
            const res = await masterDataService.getTermsList({ page, limit })
            const data = res.data as { items: TermItem[]; pagination: Pagination }
            setTerms(data.items ?? [])
            setPagination(data.pagination ?? null)
        } catch { toast.error('Đã có lỗi xảy ra') } finally { setLoading(false) }
    }, [page])

    useEffect(() => { setPage(1) }, [tab])
    useEffect(() => { setPage(1) }, [majorDeptFilter])
    useEffect(() => {
        if (tab === 'departments') loadDepartments()
        else if (tab === 'majors') loadMajors()
        else loadTerms()
    }, [tab, page, loadDepartments, loadMajors, loadTerms])

    // Load danh sách khoa cho filter ngành học khi vào tab majors
    useEffect(() => {
        if (tab !== 'majors') return
        let cancelled = false
            ; (async () => {
                try {
                    const res = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
                    const data = res.data as { items: DepartmentItem[] }
                    if (!cancelled) setDepartmentPicklist(data.items ?? [])
                } catch { /* silent */ }
            })()
        return () => { cancelled = true }
    }, [tab])

    useEffect(() => {
        if (!createMajorOpen) return
        let cancelled = false
            ; (async () => {
                try {
                    const res = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
                    const data = res.data as { items: DepartmentItem[] }
                    if (!cancelled) setDepartmentPicklist(data.items ?? [])
                } catch { if (!cancelled) toast.error('Đã có lỗi xảy ra') }
            })()
        return () => { cancelled = true }
    }, [createMajorOpen])

    const openDetailDepartment = (row: DepartmentItem) => {
        setDetailTitle('Chi tiết khoa / đơn vị')
        setDetailRows([['Mã khoa', row.department_code], ['Tên khoa', row.department_name]])
        setDetailOpen(true)
    }

    const openDetailMajor = (row: MajorItem) => {
        const d = row.department_id
        setDetailTitle('Chi tiết ngành học')
        setDetailRows([
            ['Mã ngành', row.major_code],
            ['Tên ngành', row.major_name],
            ['Khoa', d && typeof d === 'object' ? `${d.department_code ?? ''} — ${d.department_name ?? ''}` : '—'],
        ])
        setDetailOpen(true)
    }

    const openDetailTerm = (row: TermItem) => {
        setDetailTitle('Chi tiết học kỳ')
        setDetailRows([
            ['Mã học kỳ', row.term_code],
            ['Năm học', row.academic_year],
            ['Tên học kỳ', row.term_name],
            ['Ngày bắt đầu', row.start_date ? new Date(row.start_date).toLocaleDateString('vi-VN') : '—'],
            ['Ngày kết thúc', row.end_date ? new Date(row.end_date).toLocaleDateString('vi-VN') : '—'],
            ['Trạng thái', row.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'],
        ])
        setDetailOpen(true)
    }

    const submitDepartment = async () => {
        if (!deptForm.deptCode.trim() || !deptForm.deptName.trim()) { toast.error('Nhập đủ mã và tên khoa'); return }
        setSavingDept(true)
        try {
            const res = await masterDataService.createDepartment({ department_code: deptForm.deptCode.trim(), department_name: deptForm.deptName.trim() })
            toast.success(viApiMessage(res.message, 'Tạo khoa thành công'))
            setCreateDeptOpen(false); setDeptForm(initialDepartmentForm); loadDepartments()
        } catch { toast.error('Đã có lỗi xảy ra') } finally { setSavingDept(false) }
    }

    const submitMajor = async () => {
        if (!majorForm.majorCode.trim() || !majorForm.majorName.trim() || !majorForm.majorDeptId) { toast.error('Nhập đủ thông tin và chọn khoa'); return }
        setSavingMajor(true)
        try {
            const res = await masterDataService.createMajor({ major_code: majorForm.majorCode.trim(), major_name: majorForm.majorName.trim(), department_id: majorForm.majorDeptId })
            toast.success(viApiMessage(res.message, 'Tạo ngành thành công'))
            setCreateMajorOpen(false); setMajorForm(initialMajorForm); loadMajors()
        } catch { toast.error('Đã có lỗi xảy ra') } finally { setSavingMajor(false) }
    }

    const submitTerm = async () => {
        if (!termForm.termCode.trim() || !termForm.academicYear.trim() || !termForm.termName.trim() || !termForm.startDate || !termForm.endDate) { toast.error('Nhập đủ các trường học kỳ'); return }
        const startIso = new Date(termForm.startDate).toISOString()
        const endIso = new Date(termForm.endDate).toISOString()
        setSavingTerm(true)
        try {
            const body: Record<string, string> = { term_code: termForm.termCode.trim(), academic_year: termForm.academicYear.trim(), term_name: termForm.termName.trim(), start_date: startIso, end_date: endIso }
            if (termForm.termStatus) body.status = termForm.termStatus
            const res = await masterDataService.createTerm(body)
            toast.success(viApiMessage(res.message, 'Tạo học kỳ thành công'))
            setCreateTermOpen(false); setTermForm(initialTermForm); loadTerms()
        } catch { toast.error('Đã có lỗi xảy ra') } finally { setSavingTerm(false) }
    }

    const deptOptions = departmentPicklist.map(d => ({ value: d._id, label: `${d.department_code} — ${d.department_name}` }))

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'departments', label: 'Khoa / Đơn vị' },
        { key: 'majors', label: 'Ngành học' },
        { key: 'terms', label: 'Học kỳ' },
    ]

    return (
        <>
            <PageMeta
                title="Quản lý học tập | Quản trị hệ thống"
                description="Quản lý danh mục khoa, ngành học và học kỳ trong hệ thống"
            />

            {/* ── Tiêu đề trang ── */}
            <div
                className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                style={{ borderLeft: '4px solid #E02020' }}
            >
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Quản trị hệ thống</p>
                    <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Quản lý học tập</h1>
                    <p className="mt-0.5 text-sm text-[#6B7280]">Quản lý danh mục khoa, ngành học và học kỳ trong hệ thống</p>
                </div>
            </div>

            {/* ── Tabs + nội dung ── */}
            <div className="rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">

                {/* Tab bar */}
                <div className="flex items-center gap-2 border-b border-[#F0F0F0] px-5 py-3 flex-wrap">
                    {tabs.map(t => (
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

                    {/* Nút thêm mới — đẩy sang phải */}
                    <div className="ml-auto flex items-center gap-2">
                        {/* Dropdown lọc theo khoa — chỉ hiện ở tab ngành học */}
                        {tab === 'majors' && departmentPicklist.length > 0 && (
                            <div className="relative">
                                <select
                                    value={majorDeptFilter}
                                    onChange={e => setMajorDeptFilter(e.target.value)}
                                    className="h-10 rounded-xl border border-[#E0E0E0] bg-white pl-9 pr-4 text-sm text-[#444444] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15 hover:border-[#E02020]/40"
                                >
                                    <option value="">Tất cả khoa</option>
                                    {departmentPicklist.map(d => (
                                        <option key={d._id} value={d._id}>
                                            {d.department_code} — {d.department_name}
                                        </option>
                                    ))}
                                </select>
                                {/* icon filter */}
                                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                                        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </span>
                            </div>
                        )}
                        {tab === 'departments' && isAdmin && (
                            <button
                                type="button"
                                onClick={() => setCreateDeptOpen(true)}
                                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(to bottom, #E02020, #C01818)',
                                    boxShadow: '0 4px 14px rgba(224,32,32,0.35)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                Thêm khoa
                            </button>
                        )}
                        {tab === 'majors' && isAdmin && (
                            <button
                                type="button"
                                onClick={() => setCreateMajorOpen(true)}
                                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(to bottom, #E02020, #C01818)',
                                    boxShadow: '0 4px 14px rgba(224,32,32,0.35)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                Thêm ngành
                            </button>
                        )}
                        {tab === 'terms' && isAdmin && (
                            <button
                                type="button"
                                onClick={() => setCreateTermOpen(true)}
                                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(to bottom, #E02020, #C01818)',
                                    boxShadow: '0 4px 14px rgba(224,32,32,0.35)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                Thêm học kỳ
                            </button>
                        )}
                    </div>
                </div>

                {/* Nội dung bảng */}
                {loading ? (
                    <div className="space-y-2 p-5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-11 animate-pulse rounded-xl bg-[#F9FAFB]" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">

                            {/* ── Bảng Khoa ── */}
                            {tab === 'departments' && (
                                <Table className="w-full text-left text-sm">
                                    <TableHeader>
                                        <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                                            <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã khoa</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tên khoa / đơn vị</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {departments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="px-4 py-14 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 21h18M9 8h1m5 0h1M9 12h1m5 0h1M9 16h1m5 0h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        </div>
                                                        <p className="text-sm font-semibold text-[#111111]">Chưa có khoa nào</p>
                                                        <p className="text-xs text-[#6B7280]">Nhấn <span className="font-semibold text-[#E02020]">Thêm khoa</span> để bắt đầu.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            departments.map(row => (
                                                <TableRow key={row._id} className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]">
                                                    <TableCell className="px-5 py-3.5 font-mono text-sm font-semibold text-[#111111]">{row.department_code}</TableCell>
                                                    <TableCell className="px-4 py-3.5 text-[#444444]">{row.department_name}</TableCell>
                                                    <TableCell className="px-4 py-3.5 text-right">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                                                            onClick={() => openDetailDepartment(row)}
                                                        >
                                                            Chi tiết
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {/* ── Bảng Ngành ── */}
                            {tab === 'majors' && (
                                <Table className="w-full text-left text-sm">
                                    <TableHeader>
                                        <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                                            <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã ngành</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tên ngành</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Khoa</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {majors.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="px-4 py-14 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 14l9-5-9-5-9 5 9 5z" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        </div>
                                                        <p className="text-sm font-semibold text-[#111111]">Chưa có ngành nào</p>
                                                        <p className="text-xs text-[#6B7280]">Nhấn <span className="font-semibold text-[#E02020]">Thêm ngành</span> để bắt đầu.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            majors.map(row => {
                                                const d = row.department_id
                                                const deptLabel = d && typeof d === 'object'
                                                    ? `${d.department_code ?? ''} — ${d.department_name ?? ''}`
                                                    : '—'
                                                return (
                                                    <TableRow key={row._id} className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]">
                                                        <TableCell className="px-5 py-3.5 font-mono text-sm font-semibold text-[#111111]">{row.major_code}</TableCell>
                                                        <TableCell className="px-4 py-3.5 text-[#444444]">{row.major_name}</TableCell>
                                                        <TableCell className="px-4 py-3.5 text-sm text-[#6B7280]">{deptLabel}</TableCell>
                                                        <TableCell className="px-4 py-3.5 text-right">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                                                                onClick={() => openDetailMajor(row)}
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
                            )}

                            {/* ── Bảng Học kỳ ── */}
                            {tab === 'terms' && (
                                <Table className="w-full text-left text-sm">
                                    <TableHeader>
                                        <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                                            <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã học kỳ</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tên học kỳ</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Năm học</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Trạng thái</TableCell>
                                            <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {terms.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="px-4 py-14 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" stroke="#E02020" strokeWidth="1.5" /><path d="M16 2v4M8 2v4M3 10h18" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                        </div>
                                                        <p className="text-sm font-semibold text-[#111111]">Chưa có học kỳ nào</p>
                                                        <p className="text-xs text-[#6B7280]">Nhấn <span className="font-semibold text-[#E02020]">Thêm học kỳ</span> để bắt đầu.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            terms.map(row => (
                                                <TableRow key={row._id} className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]">
                                                    <TableCell className="px-5 py-3.5 font-mono text-sm font-semibold text-[#111111]">{row.term_code}</TableCell>
                                                    <TableCell className="px-4 py-3.5 text-[#444444]">{row.term_name}</TableCell>
                                                    <TableCell className="px-4 py-3.5 text-sm text-[#6B7280]">{row.academic_year}</TableCell>
                                                    <TableCell className="px-4 py-3.5">
                                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.status === 'ACTIVE'
                                                            ? 'bg-[#F0FDF4] text-emerald-700'
                                                            : 'bg-[#F9FAFB] text-[#6B7280]'
                                                            }`}>
                                                            {row.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3.5 text-right">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-[#E0E0E0] text-[#444444] hover:border-[#E02020]/40 hover:text-[#E02020]"
                                                            onClick={() => openDetailTerm(row)}
                                                        >
                                                            Chi tiết
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {/* Phân trang */}
                        {pagination && <PaginationBar pagination={pagination} page={page} setPage={setPage} />}
                    </>
                )}
            </div>

            {/* ── Modal chi tiết ── */}
            <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-md overflow-hidden p-0">
                <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF0F0] text-[#E02020]">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M10 12a4 4 0 100-8 4 4 0 000 8zM2 18c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-[#111111]">{detailTitle}</h3>
                            <p className="text-xs text-[#6B7280]">Thông tin chi tiết bản ghi</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <dl className="grid gap-3 rounded-2xl border border-[#F0F0F0] bg-[#F9FAFB] p-4 text-sm">
                        {detailRows.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">{label}</dt>
                                <dd className="mt-1 font-semibold text-[#111111]">{value || '—'}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-5 flex justify-end border-t border-[#F0F0F0] pt-4">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-[#E0E0E0] text-[#444444]"
                            onClick={() => setDetailOpen(false)}
                        >
                            Đóng
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── Modal thêm khoa ── */}
            <Modal
                isOpen={createDeptOpen}
                onClose={() => !savingDept && setCreateDeptOpen(false)}
                className="max-w-md overflow-hidden p-0"
            >
                <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Thêm khoa / đơn vị mới</h3>
                    <p className="text-xs text-[#6B7280]">Điền đầy đủ thông tin để tạo khoa mới</p>
                </div>
                <div className="space-y-4 p-6">
                    <div>
                        <Label htmlFor="dept-code">Mã khoa</Label>
                        <InputField
                            id="dept-code"
                            type="text"
                            placeholder="Ví dụ: CNTT"
                            value={deptForm.deptCode}
                            onChange={e => setDeptForm(f => ({ ...f, deptCode: e.target.value }))}
                            disabled={savingDept}
                        />
                    </div>
                    <div>
                        <Label htmlFor="dept-name">Tên khoa / đơn vị</Label>
                        <InputField
                            id="dept-name"
                            type="text"
                            placeholder="Ví dụ: Khoa Công nghệ thông tin"
                            value={deptForm.deptName}
                            onChange={e => setDeptForm(f => ({ ...f, deptName: e.target.value }))}
                            disabled={savingDept}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[#E0E0E0] text-[#444444]"
                        disabled={savingDept}
                        onClick={() => setCreateDeptOpen(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={savingDept}
                        onClick={() => void submitDepartment()}
                    >
                        {savingDept ? 'Đang lưu...' : 'Lưu khoa'}
                    </Button>
                </div>
            </Modal>

            {/* ── Modal thêm ngành ── */}
            <Modal
                isOpen={createMajorOpen}
                onClose={() => !savingMajor && setCreateMajorOpen(false)}
                className="max-w-md overflow-hidden p-0"
            >
                <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Thêm ngành học mới</h3>
                    <p className="text-xs text-[#6B7280]">Điền đầy đủ thông tin để tạo ngành mới</p>
                </div>
                <div className="space-y-4 p-6">
                    <div>
                        <Label htmlFor="major-code">Mã ngành</Label>
                        <InputField
                            id="major-code"
                            type="text"
                            placeholder="Ví dụ: KTPM"
                            value={majorForm.majorCode}
                            onChange={e => setMajorForm(f => ({ ...f, majorCode: e.target.value }))}
                            disabled={savingMajor}
                        />
                    </div>
                    <div>
                        <Label htmlFor="major-name">Tên ngành</Label>
                        <InputField
                            id="major-name"
                            type="text"
                            placeholder="Ví dụ: Kỹ thuật phần mềm"
                            value={majorForm.majorName}
                            onChange={e => setMajorForm(f => ({ ...f, majorName: e.target.value }))}
                            disabled={savingMajor}
                        />
                    </div>
                    <div>
                        <Label htmlFor="major-dept">Khoa / đơn vị</Label>
                        <Select
                            options={deptOptions}
                            placeholder="Chọn khoa"
                            onChange={val => setMajorForm(f => ({ ...f, majorDeptId: val }))}
                            defaultValue={majorForm.majorDeptId}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[#E0E0E0] text-[#444444]"
                        disabled={savingMajor}
                        onClick={() => setCreateMajorOpen(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={savingMajor}
                        onClick={() => void submitMajor()}
                    >
                        {savingMajor ? 'Đang lưu...' : 'Lưu ngành'}
                    </Button>
                </div>
            </Modal>

            {/* ── Modal thêm học kỳ ── */}
            <Modal
                isOpen={createTermOpen}
                onClose={() => !savingTerm && setCreateTermOpen(false)}
                className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0"
            >
                <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Thêm học kỳ mới</h3>
                    <p className="text-xs text-[#6B7280]">Điền đầy đủ thông tin để tạo học kỳ mới</p>
                </div>
                <div className="overflow-y-auto p-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="term-code">Mã học kỳ</Label>
                            <InputField
                                id="term-code"
                                type="text"
                                placeholder="Ví dụ: HK1-2024"
                                value={termForm.termCode}
                                onChange={e => setTermForm(f => ({ ...f, termCode: e.target.value }))}
                                disabled={savingTerm}
                            />
                        </div>
                        <div>
                            <Label htmlFor="term-year">Năm học</Label>
                            <InputField
                                id="term-year"
                                type="text"
                                placeholder="Ví dụ: 2024-2025"
                                value={termForm.academicYear}
                                onChange={e => setTermForm(f => ({ ...f, academicYear: e.target.value }))}
                                disabled={savingTerm}
                            />
                        </div>
                        <div>
                            <Label htmlFor="term-name">Tên học kỳ</Label>
                            <InputField
                                id="term-name"
                                type="text"
                                placeholder="Ví dụ: Học kỳ 1"
                                value={termForm.termName}
                                onChange={e => setTermForm(f => ({ ...f, termName: e.target.value }))}
                                disabled={savingTerm}
                            />
                        </div>
                        <div>
                            <Label htmlFor="term-start">Ngày bắt đầu</Label>
                            <input
                                id="term-start"
                                type="date"
                                value={termForm.startDate}
                                onChange={e => setTermForm(f => ({ ...f, startDate: e.target.value }))}
                                disabled={savingTerm}
                                className="mt-1.5 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                            />
                        </div>
                        <div>
                            <Label htmlFor="term-end">Ngày kết thúc</Label>
                            <input
                                id="term-end"
                                type="date"
                                value={termForm.endDate}
                                onChange={e => setTermForm(f => ({ ...f, endDate: e.target.value }))}
                                disabled={savingTerm}
                                className="mt-1.5 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2 text-sm text-[#111111] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                            />
                        </div>
                        <div>
                            <Label htmlFor="term-status">Trạng thái</Label>
                            <Select
                                options={[
                                    { value: 'ACTIVE', label: 'Đang hoạt động' },
                                    { value: 'INACTIVE', label: 'Không hoạt động' },
                                ]}
                                placeholder="Không hoạt động (mặc định)"
                                onChange={val => setTermForm(f => ({ ...f, termStatus: val as 'ACTIVE' | 'INACTIVE' | '' }))}
                                defaultValue={termForm.termStatus}
                            />
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[#E0E0E0] text-[#444444]"
                        disabled={savingTerm}
                        onClick={() => setCreateTermOpen(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={savingTerm}
                        onClick={() => void submitTerm()}
                    >
                        {savingTerm ? 'Đang lưu...' : 'Lưu học kỳ'}
                    </Button>
                </div>
            </Modal>
        </>
    )
}
