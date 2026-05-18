import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { viApiMessage } from '@/utils/viApiMessage'
import PageMeta from '@/components/common/PageMeta'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { masterDataService } from '@/services/MasterDataService'
import { userService } from '@/services/UserService'
import useAuthStore from '@/stores/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type Pagination = { page: number; limit: number; total: number; total_pages: number }

type DepartmentItem = { _id: string; department_code: string; department_name: string }
type MajorItem = { _id: string; major_code: string; major_name: string }
type TermItem = { _id: string; term_code: string; term_name: string; status: string }

type AdvisorRef = {
    _id: string
    username: string
    email: string
    profile?: { full_name?: string }
    advisor_info?: { staff_code?: string; title?: string }
}

type AdvisorClassDoc = {
    _id: string
    class_code: string
    class_name?: string
    advisor_user_id: AdvisorRef | string
    department_id?: { _id: string; department_code: string; department_name: string } | string
    major_id?: { _id: string; major_code: string; major_name: string } | string
    cohort_year?: number
    status: string
}

type MemberRow = {
    _id: string
    class_id: string
    student_user_id: string
    joined_at?: string
    status: string
    student?: {
        _id: string
        username: string
        email: string
        profile?: { full_name?: string }
        student_info?: { student_code?: string }
        org?: { major_id?: { _id: string } | string }
    } | null
}

type StudentItem = {
    _id: string
    username: string
    email: string
    profile?: { full_name?: string }
    student_info?: { student_code?: string }
    org?: { department_id?: string; major_id?: string }
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

function getAdvisorName(ref: AdvisorRef | string | undefined): string {
    if (!ref || typeof ref === 'string') return '—'
    return ref.profile?.full_name || ref.username || '—'
}

function getRefName(ref: { _id: string;[key: string]: unknown } | string | undefined, codeKey: string, nameKey: string): string {
    if (!ref || typeof ref === 'string') return '—'
    const code = ref[codeKey] as string | undefined
    const name = ref[nameKey] as string | undefined
    return [code, name].filter(Boolean).join(' — ') || '—'
}

function getRefId(ref: { _id: string } | string | undefined): string {
    if (!ref) return ''
    if (typeof ref === 'string') return ref
    return ref._id
}

const CARD = 'rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
const PAGE_SIZE = 15
const MEMBER_PAGE_SIZE = 10
const STUDENT_PAGE_SIZE = 20

// ─── Pagination Bar ───────────────────────────────────────────────────────────

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
                Trang <span className="font-semibold text-[#111111]">{pagination.page}</span> / {pagination.total_pages}
                {' · '}<span className="font-semibold text-[#111111]">{pagination.total}</span> bản ghi
            </p>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {pages.map((item, idx) =>
                    item === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="flex size-8 items-center justify-center text-xs text-[#9CA3AF]">…</span>
                    ) : (
                        <button key={item} type="button" onClick={() => setPage(item)}
                            className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${page === item ? 'border-[#E02020] bg-[#E02020] text-white' : 'border-[#F0F0F0] bg-white text-[#444444] hover:border-gray-300 hover:bg-gray-50'}`}>
                            {item}
                        </button>
                    )
                )}
                <button type="button" onClick={() => setPage(Math.min(pagination.total_pages, page + 1))} disabled={page >= pagination.total_pages}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAdvisorClassPage() {
    const user = useAuthStore(s => s.user)
    const isAdmin = user?.role === 'ADMIN'

    // ── Master data ──
    const [activeTerm, setActiveTerm] = useState<TermItem | null>(null)
    const [deptList, setDeptList] = useState<DepartmentItem[]>([])
    const [majorList, setMajorList] = useState<MajorItem[]>([])

    // ── Filter state ──
    const [selectedDeptId, setSelectedDeptId] = useState('')
    const [selectedMajorId, setSelectedMajorId] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Class list ──
    const [classes, setClasses] = useState<AdvisorClassDoc[]>([])
    const [classPagination, setClassPagination] = useState<Pagination | null>(null)
    const [classPage, setClassPage] = useState(1)
    const [loadingClasses, setLoadingClasses] = useState(false)

    // ── Selected class & members ──
    const [selectedClass, setSelectedClass] = useState<AdvisorClassDoc | null>(null)
    const [members, setMembers] = useState<MemberRow[]>([])
    const [memberPagination, setMemberPagination] = useState<Pagination | null>(null)
    const [memberPage, setMemberPage] = useState(1)
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [memberSearch, setMemberSearch] = useState('')
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const memberSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Create class modal ──
    const [createOpen, setCreateOpen] = useState(false)
    const [createOpenKey, setCreateOpenKey] = useState(0)
    const [saving, setSaving] = useState(false)
    const [createForm, setCreateForm] = useState({
        class_code: '', class_name: '', advisor_user_id: '', department_id: '',
        major_id: '', cohort_year: '', status: 'ACTIVE',
    })
    const [advisorPicklist, setAdvisorPicklist] = useState<{ _id: string; label: string }[]>([])
    const [majorPicklistCreate, setMajorPicklistCreate] = useState<MajorItem[]>([])

    // ── Change advisor modal ──
    const [changeAdvisorOpen, setChangeAdvisorOpen] = useState(false)
    const [changeAdvisorOpenKey, setChangeAdvisorOpenKey] = useState(0)
    const [changeAdvisorClassId, setChangeAdvisorClassId] = useState('')
    const [newAdvisorId, setNewAdvisorId] = useState('')
    const [changingAdvisor, setChangingAdvisor] = useState(false)
    const [advisorPicklistChange, setAdvisorPicklistChange] = useState<{ _id: string; label: string }[]>([])

    // ── Add students modal ──
    const [addStudentsOpen, setAddStudentsOpen] = useState(false)
    const [unassignedStudents, setUnassignedStudents] = useState<StudentItem[]>([])
    const [unassignedPagination, setUnassignedPagination] = useState<Pagination | null>(null)
    const [unassignedPage, setUnassignedPage] = useState(1)
    const [loadingUnassigned, setLoadingUnassigned] = useState(false)
    const [unassignedSearch, setUnassignedSearch] = useState('')
    const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('')
    const unassignedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
    const [addingStudents, setAddingStudents] = useState(false)

    // ── Transfer students modal ──
    const [transferOpen, setTransferOpen] = useState(false)
    const [transferOpenKey, setTransferOpenKey] = useState(0)
    const [transferStudentIds, setTransferStudentIds] = useState<Set<string>>(new Set())
    const [targetClassId, setTargetClassId] = useState('')
    const [transferring, setTransferring] = useState(false)
    const [targetClassPicklist, setTargetClassPicklist] = useState<AdvisorClassDoc[]>([])

    // ── Remove students ──
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

    // ── Delete class ──
    const [deletingClass, setDeletingClass] = useState(false)

    // ─────────────────────────────────────────────────────────────────────────────
    // Load master data on mount
    // ─────────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        void (async () => {
            try {
                const [termRes, deptRes] = await Promise.all([
                    masterDataService.getActiveTerm(),
                    masterDataService.getDepartmentsList({ page: 1, limit: 100 }),
                ])
                setActiveTerm((termRes.data as TermItem | null) ?? null)
                const depts = ((deptRes.data as { items: DepartmentItem[] }).items) ?? []
                setDeptList(depts)
                if (depts.length > 0) setSelectedDeptId(depts[0]._id)
            } catch {
                toast.error('Không tải được dữ liệu khoa')
            }
        })()
    }, [])

    // Load majors when dept changes
    useEffect(() => {
        if (!selectedDeptId) { setMajorList([]); setSelectedMajorId(''); return }
        void (async () => {
            try {
                const res = await masterDataService.getMajorsList({ department_id: selectedDeptId, limit: 100 })
                const majors = ((res.data as { items: MajorItem[] }).items) ?? []
                setMajorList(majors)
                setSelectedMajorId('')
            } catch {
                toast.error('Không tải được danh sách ngành')
            }
        })()
    }, [selectedDeptId])

    // ─────────────────────────────────────────────────────────────────────────────
    // Load class list
    // ─────────────────────────────────────────────────────────────────────────────
    const loadClasses = useCallback(async () => {
        if (!selectedDeptId) { setClasses([]); setClassPagination(null); return }
        setLoadingClasses(true)
        try {
            const body: Record<string, unknown> = {
                department_id: selectedDeptId,
                page: classPage,
                limit: PAGE_SIZE,
                status: 'ACTIVE',
            }
            if (selectedMajorId) body.major_id = selectedMajorId
            if (searchQuery) body.search = searchQuery
            const res = await advisorClassService.listAllAdvisorClasses(body)
            const data = res.data as { items: AdvisorClassDoc[]; pagination: Pagination }
            setClasses(data.items ?? [])
            setClassPagination(data.pagination ?? null)
        } catch {
            toast.error('Không tải được danh sách lớp cố vấn')
        } finally {
            setLoadingClasses(false)
        }
    }, [selectedDeptId, selectedMajorId, classPage, searchQuery])

    useEffect(() => { void loadClasses() }, [loadClasses])

    useEffect(() => { setClassPage(1); setSelectedClass(null) }, [selectedDeptId, selectedMajorId, searchQuery])

    const handleSearchChange = (value: string) => {
        setSearchInput(value)
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = setTimeout(() => { setSearchQuery(value.trim()); setClassPage(1) }, 400)
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Load members of selected class
    // ─────────────────────────────────────────────────────────────────────────────
    const loadMembers = useCallback(async () => {
        if (!selectedClass) return
        setLoadingMembers(true)
        try {
            const body: Record<string, unknown> = { class_id: selectedClass._id, page: memberPage, limit: MEMBER_PAGE_SIZE }
            if (memberSearchQuery) body.search = memberSearchQuery
            const res = await classMemberService.listMembers(body)
            const data = res.data as { items: MemberRow[]; pagination: Pagination }
            setMembers(data.items ?? [])
            setMemberPagination(data.pagination ?? null)
        } catch {
            toast.error('Không tải được danh sách sinh viên')
        } finally {
            setLoadingMembers(false)
        }
    }, [selectedClass, memberPage, memberSearchQuery])

    useEffect(() => { if (selectedClass) void loadMembers() }, [loadMembers, selectedClass])

    useEffect(() => { setMemberPage(1); setMemberSearch(''); setMemberSearchQuery('') }, [selectedClass?._id])

    const filteredMembers = members

    const handleMemberSearchChange = (value: string) => {
        setMemberSearch(value)
        if (memberSearchDebounceRef.current) clearTimeout(memberSearchDebounceRef.current)
        memberSearchDebounceRef.current = setTimeout(() => {
            setMemberSearchQuery(value.trim())
            setMemberPage(1)
        }, 400)
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Create class
    // ─────────────────────────────────────────────────────────────────────────────
    const openCreate = async () => {
        setCreateForm({ class_code: '', class_name: '', advisor_user_id: '', department_id: selectedDeptId, major_id: selectedMajorId, cohort_year: '', status: 'ACTIVE' })
        setMajorPicklistCreate([])
        setAdvisorPicklist([])
        // Load advisors for selected dept
        try {
            const [advRes, majRes] = await Promise.all([
                userService.getUsers({ role: 'ADVISOR', department_id: selectedDeptId, limit: 100 }),
                selectedDeptId ? masterDataService.getMajorsList({ department_id: selectedDeptId, limit: 100 }) : Promise.resolve({ data: { items: [] } }),
            ])
            const advData = advRes.data as { items: { _id: string; profile?: { full_name?: string }; username: string; advisor_info?: { staff_code?: string } }[] }
            setAdvisorPicklist((advData.items ?? []).map(a => ({
                _id: a._id,
                label: [a.profile?.full_name || a.username, a.advisor_info?.staff_code].filter(Boolean).join(' — '),
            })))
            const majData = majRes.data as { items: MajorItem[] }
            setMajorPicklistCreate(majData.items ?? [])
        } catch {
            toast.error('Không tải được danh sách cố vấn')
        }
        setCreateOpen(true)
        setCreateOpenKey(k => k + 1)
    }

    const onCreateDeptChange = async (deptId: string) => {
        setCreateForm(prev => ({ ...prev, department_id: deptId, major_id: '', advisor_user_id: '' }))
        if (!deptId) { setMajorPicklistCreate([]); setAdvisorPicklist([]); return }
        try {
            const [majRes, advRes] = await Promise.all([
                masterDataService.getMajorsList({ department_id: deptId, limit: 100 }),
                userService.getUsers({ role: 'ADVISOR', department_id: deptId, limit: 100 }),
            ])
            const majData = majRes.data as { items: MajorItem[] }
            setMajorPicklistCreate(majData.items ?? [])
            const advData = advRes.data as { items: { _id: string; profile?: { full_name?: string }; username: string; advisor_info?: { staff_code?: string } }[] }
            setAdvisorPicklist((advData.items ?? []).map(a => ({
                _id: a._id,
                label: [a.profile?.full_name || a.username, a.advisor_info?.staff_code].filter(Boolean).join(' — '),
            })))
        } catch {
            toast.error('Đã có lỗi xảy ra')
        }
    }

    const submitCreate = async () => {
        if (!createForm.class_code.trim()) { toast.error('Mã lớp là bắt buộc'); return }
        if (!createForm.advisor_user_id) { toast.error('Vui lòng chọn cố vấn'); return }
        if (!createForm.department_id) { toast.error('Vui lòng chọn khoa'); return }
        setSaving(true)
        try {
            const body: Record<string, unknown> = {
                class_code: createForm.class_code.trim(),
                class_name: createForm.class_name.trim() || undefined,
                advisor_user_id: createForm.advisor_user_id,
                department_id: createForm.department_id,
                status: createForm.status,
            }
            if (createForm.major_id) body.major_id = createForm.major_id
            if (createForm.cohort_year) body.cohort_year = Number(createForm.cohort_year)
            const res = await advisorClassService.upsertAdvisorClass(body)
            toast.success(viApiMessage(res.message, 'Tạo lớp cố vấn thành công'))
            setCreateOpen(false)
            void loadClasses()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(viApiMessage(msg, 'Đã có lỗi xảy ra'))
        } finally {
            setSaving(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Change advisor
    // ─────────────────────────────────────────────────────────────────────────────
    const openChangeAdvisor = async (cls: AdvisorClassDoc) => {
        setChangeAdvisorClassId(cls._id)
        setNewAdvisorId('')
        setChangeAdvisorOpenKey(k => k + 1)
        const deptId = getRefId(cls.department_id as { _id: string } | string | undefined)
        try {
            const res = await userService.getUsers({ role: 'ADVISOR', department_id: deptId, limit: 100 })
            const data = res.data as { items: { _id: string; profile?: { full_name?: string }; username: string; advisor_info?: { staff_code?: string } }[] }
            setAdvisorPicklistChange((data.items ?? []).map(a => ({
                _id: a._id,
                label: [a.profile?.full_name || a.username, a.advisor_info?.staff_code].filter(Boolean).join(' — '),
            })))
        } catch {
            toast.error('Không tải được danh sách cố vấn')
        }
        setChangeAdvisorOpen(true)
    }

    const submitChangeAdvisor = async () => {
        if (!newAdvisorId) { toast.error('Vui lòng chọn cố vấn mới'); return }
        setChangingAdvisor(true)
        try {
            const res = await advisorClassService.changeAdvisor({ class_id: changeAdvisorClassId, new_advisor_user_id: newAdvisorId })
            toast.success(viApiMessage(res.message, 'Đổi cố vấn thành công'))
            setChangeAdvisorOpen(false)
            void loadClasses()
            if (selectedClass?._id === changeAdvisorClassId) {
                const updated = res.data as AdvisorClassDoc
                setSelectedClass(updated)
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(viApiMessage(msg, 'Đã có lỗi xảy ra'))
        } finally {
            setChangingAdvisor(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Add students
    // ─────────────────────────────────────────────────────────────────────────────
    const loadUnassigned = useCallback(async () => {
        if (!selectedClass) return
        setLoadingUnassigned(true)
        try {
            const majorId = getRefId(selectedClass.major_id as { _id: string } | string | undefined)
            const deptId = getRefId(selectedClass.department_id as { _id: string } | string | undefined)
            const body: Record<string, unknown> = { page: unassignedPage, limit: STUDENT_PAGE_SIZE, department_id: deptId }
            if (majorId) body.major_id = majorId
            if (unassignedSearchQuery) body.search = unassignedSearchQuery
            const res = await classMemberService.listUnassignedStudents(body)
            const data = res.data as { items: StudentItem[]; pagination: Pagination }
            setUnassignedStudents(data.items ?? [])
            setUnassignedPagination(data.pagination ?? null)
        } catch {
            toast.error('Không tải được danh sách sinh viên')
        } finally {
            setLoadingUnassigned(false)
        }
    }, [selectedClass, unassignedPage, unassignedSearchQuery])

    useEffect(() => { if (addStudentsOpen) void loadUnassigned() }, [loadUnassigned, addStudentsOpen])

    const openAddStudents = () => {
        setSelectedStudentIds(new Set())
        setUnassignedSearch('')
        setUnassignedSearchQuery('')
        setUnassignedPage(1)
        setAddStudentsOpen(true)
    }

    const handleUnassignedSearchChange = (value: string) => {
        setUnassignedSearch(value)
        if (unassignedDebounceRef.current) clearTimeout(unassignedDebounceRef.current)
        unassignedDebounceRef.current = setTimeout(() => { setUnassignedSearchQuery(value.trim()); setUnassignedPage(1) }, 400)
    }

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedStudentIds.size === unassignedStudents.length && unassignedStudents.length > 0) {
            setSelectedStudentIds(new Set())
        } else {
            setSelectedStudentIds(new Set(unassignedStudents.map(s => s._id)))
        }
    }

    const submitAddStudents = async () => {
        if (!selectedClass || selectedStudentIds.size === 0) { toast.error('Vui lòng chọn ít nhất 1 sinh viên'); return }
        setAddingStudents(true)
        try {
            const res = await classMemberService.addMembers({ class_id: selectedClass._id, student_user_ids: Array.from(selectedStudentIds) })
            toast.success(viApiMessage(res.message, `Đã thêm ${selectedStudentIds.size} sinh viên vào lớp`))
            setAddStudentsOpen(false)
            void loadMembers()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(viApiMessage(msg, 'Đã có lỗi xảy ra'))
        } finally {
            setAddingStudents(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Remove student
    // ─────────────────────────────────────────────────────────────────────────────
    const handleRemoveStudent = async (studentUserId: string, studentName: string) => {
        if (!selectedClass) return
        if (!confirm(`Xóa sinh viên "${studentName}" khỏi lớp này?`)) return
        setRemovingIds(prev => new Set(prev).add(studentUserId))
        try {
            const res = await classMemberService.removeMembers({ class_id: selectedClass._id, student_user_ids: [studentUserId] })
            toast.success(viApiMessage(res.message, 'Đã xóa sinh viên khỏi lớp'))
            void loadMembers()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(viApiMessage(msg, 'Đã có lỗi xảy ra'))
        } finally {
            setRemovingIds(prev => { const next = new Set(prev); next.delete(studentUserId); return next })
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Delete class
    // ─────────────────────────────────────────────────────────────────────────────
    const handleDeleteClass = async () => {
        if (!selectedClass) return
        if (!confirm(`Xóa lớp cố vấn "${selectedClass.class_code}"? Hành động này không thể hoàn tác.`)) return
        setDeletingClass(true)
        try {
            const res = await advisorClassService.deleteAdvisorClass(selectedClass._id)
            toast.success(viApiMessage(res.message, 'Đã xóa lớp cố vấn'))
            setSelectedClass(null)
            void loadClasses()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(viApiMessage(msg, 'Đã có lỗi xảy ra'))
        } finally {
            setDeletingClass(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Transfer students
    // ─────────────────────────────────────────────────────────────────────────────
    const openTransfer = async (studentIds: string[]) => {
        if (!selectedClass) return
        setTransferStudentIds(new Set(studentIds))
        setTargetClassId('')
        setTargetClassPicklist([])
        // Load other classes in same dept/major
        try {
            const deptId = getRefId(selectedClass.department_id as { _id: string } | string | undefined)
            if (!deptId) { toast.error('Lớp nguồn chưa có khoa hợp lệ'); return }
            const majorId = getRefId(selectedClass.major_id as { _id: string } | string | undefined)
            if (!majorId) { toast.error('Lớp nguồn chưa có ngành hợp lệ'); return }
            const body: Record<string, unknown> = { department_id: deptId, major_id: majorId, status: 'ACTIVE', limit: 100 }
            const res = await advisorClassService.listAllAdvisorClasses(body)
            const data = res.data as { items: AdvisorClassDoc[] }
            // Loại lớp nguồn ra, giữ tất cả lớp còn lại trong cùng ngành
            // (API đã lọc theo department_id + major_id, không cần filter lại)
            setTargetClassPicklist(
                (data.items ?? []).filter(cls => String(cls._id) !== String(selectedClass._id))
            )
            setTransferOpen(true)
            setTransferOpenKey(k => k + 1)
        } catch {
            toast.error('Không tải được danh sách lớp')
        }
    }

    const submitTransfer = async () => {
        if (!selectedClass || !targetClassId || transferStudentIds.size === 0) { toast.error('Vui lòng chọn lớp đích'); return }
        setTransferring(true)
        try {
            const res = await classMemberService.transferMembers({
                from_class_id: selectedClass._id,
                to_class_id: targetClassId,
                student_user_ids: Array.from(transferStudentIds),
            })
            toast.success(viApiMessage(res.message, `Đã chuyển ${transferStudentIds.size} sinh viên sang lớp mới`))
            setTransferOpen(false)
            void loadMembers()
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { message?: string; errors?: { msg?: string }[] } } })?.response?.data
            const validationMsg = data?.errors?.map(e => e.msg).filter(Boolean).join(', ')
            toast.error(viApiMessage(validationMsg || data?.message, 'Đã có lỗi xảy ra'))
        } finally {
            setTransferring(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Guard
    // ─────────────────────────────────────────────────────────────────────────────
    if (!isAdmin) {
        return (
            <>
                <PageMeta title="Quản lý lớp cố vấn | Quản trị hệ thống" description="Chỉ quản trị viên mới có quyền truy cập" />
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

    // ─────────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────────
    const deptOptions = deptList.map(d => ({ value: d._id, label: `${d.department_code} — ${d.department_name}` }))
    const advisorOptions = advisorPicklist.map(a => ({ value: a._id, label: a.label }))
    const advisorOptionsChange = advisorPicklistChange.map(a => ({ value: a._id, label: a.label }))
    const majorOptionsCreate = majorPicklistCreate.map(m => ({ value: m._id, label: `${m.major_code} — ${m.major_name}` }))
    const targetClassOptions = targetClassPicklist.map(c => ({
        value: c._id,
        label: [c.class_code, c.class_name, getAdvisorName(c.advisor_user_id as AdvisorRef)].filter(Boolean).join(' — '),
    }))

    return (
        <>
            <PageMeta title="Quản lý lớp cố vấn | Quản trị hệ thống" description="Quản lý lớp cố vấn học tập theo khoa và ngành" />

            {/* ── Tiêu đề trang ── */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]" style={{ borderLeft: '4px solid #E02020' }}>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Quản trị hệ thống</p>
                    <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Quản lý lớp cố vấn</h1>
                    <p className="mt-0.5 text-sm text-[#6B7280]">Tạo và quản lý lớp cố vấn học tập theo khoa, ngành</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {activeTerm && (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-700">{activeTerm.term_name}</span>
                        </div>
                    )}
                    {classPagination && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-2.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="9" cy="7" r="4" stroke="#E02020" strokeWidth="1.5" />
                            </svg>
                            <span className="text-sm font-semibold text-[#111111]">{classPagination.total}</span>
                            <span className="text-xs text-[#6B7280]">lớp cố vấn</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bộ lọc + nút tạo lớp ── */}
            <div className={`${CARD} mb-6`}>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input type="text" value={searchInput} onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Tìm theo mã hoặc tên lớp..."
                            className="w-full rounded-xl border border-[#E0E0E0] bg-white py-2 pl-9 pr-9 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10" />
                        {searchInput && (
                            <button type="button" onClick={() => handleSearchChange('')} aria-label="Xóa tìm kiếm"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#444444]">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Khoa */}
                    <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}
                        className="rounded-xl border border-[#E0E0E0] bg-white py-2 pl-3 pr-8 text-sm text-[#444444] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10"
                        disabled={deptList.length === 0}>
                        {deptList.length === 0 ? <option value="">Không có khoa nào</option> : deptList.map(d => (
                            <option key={d._id} value={d._id}>{d.department_code} — {d.department_name}</option>
                        ))}
                    </select>

                    {/* Ngành */}
                    <select value={selectedMajorId} onChange={e => setSelectedMajorId(e.target.value)}
                        className="rounded-xl border border-[#E0E0E0] bg-white py-2 pl-3 pr-8 text-sm text-[#444444] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10"
                        disabled={majorList.length === 0}>
                        <option value="">Tất cả ngành</option>
                        {majorList.map(m => <option key={m._id} value={m._id}>{m.major_code} — {m.major_name}</option>)}
                    </select>

                    <div className="ml-auto">
                        <button type="button" onClick={() => void openCreate()}
                            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                            style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)', boxShadow: '0 4px 14px rgba(224,32,32,0.35)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #C01818, #A01010)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(to bottom, #E02020, #C01818)' }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Tạo lớp cố vấn
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Danh sách lớp ── */}
            <div className={`${CARD} mb-6`}>
                <div className="border-b border-[#F0F0F0] px-5 py-4" style={{ borderLeft: '3px solid #E02020' }}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Danh sách lớp</p>
                    <h2 className="mt-0.5 text-base font-bold text-[#111111]">Lớp cố vấn đang hoạt động</h2>
                </div>

                {!selectedDeptId ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
                        <p className="text-sm font-semibold text-[#111111]">Vui lòng chọn khoa</p>
                        <p className="text-xs text-[#6B7280]">Chọn khoa từ bộ lọc bên trên để xem danh sách lớp cố vấn</p>
                    </div>
                ) : loadingClasses ? (
                    <div className="space-y-2 p-5">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-[#F9FAFB]" />)}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                                        <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã lớp</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tên lớp</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Cố vấn</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Ngành</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Khóa</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="px-4 py-14 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F0]">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                                                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#E02020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <circle cx="9" cy="7" r="4" stroke="#E02020" strokeWidth="1.5" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm font-semibold text-[#111111]">Chưa có lớp cố vấn nào</p>
                                                    <p className="text-xs text-[#6B7280]">Nhấn <span className="font-semibold text-[#E02020]">Tạo lớp cố vấn</span> để bắt đầu.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        classes.map(cls => {
                                            const isSelected = selectedClass?._id === cls._id
                                            return (
                                                <TableRow key={cls._id} className={`border-b border-[#F0F0F0] transition-colors last:border-0 ${isSelected ? 'bg-[#FFF8F8]' : 'bg-white hover:bg-[#FFF8F8]'}`}>
                                                    <TableCell className="px-5 py-3.5 align-middle">
                                                        <span className="font-mono text-sm font-bold text-[#111111]">{cls.class_code}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3.5 align-middle text-[#444444]">{cls.class_name || '—'}</TableCell>
                                                    <TableCell className="px-4 py-3.5 align-middle">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0F0] text-[10px] font-bold text-[#E02020]">
                                                                {initialsFromName(getAdvisorName(cls.advisor_user_id as AdvisorRef))}
                                                            </div>
                                                            <span className="text-sm text-[#111111]">{getAdvisorName(cls.advisor_user_id as AdvisorRef)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3.5 align-middle text-sm text-[#6B7280]">
                                                        {getRefName(cls.major_id as { _id: string; major_code: string; major_name: string } | string | undefined, 'major_code', 'major_name')}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3.5 align-middle text-sm text-[#6B7280]">{cls.cohort_year ?? '—'}</TableCell>
                                                    <TableCell className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button type="button" onClick={() => setSelectedClass(isSelected ? null : cls)}
                                                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected ? 'border-[#E02020] bg-[#E02020] text-white' : 'border-[#E02020]/30 text-[#E02020] hover:bg-[#FFF0F0]'}`}>
                                                                {isSelected ? 'Đang xem' : 'Xem sinh viên'}
                                                            </button>
                                                            <button type="button" onClick={() => void openChangeAdvisor(cls)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0E0E0] px-3 py-1.5 text-xs font-semibold text-[#444444] transition-colors hover:border-[#E02020]/40 hover:text-[#E02020]">
                                                                Đổi cố vấn
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {classPagination && <PaginationBar pagination={classPagination} page={classPage} setPage={setClassPage} />}
                    </>
                )}
            </div>

            {/* ── Danh sách sinh viên của lớp được chọn ── */}
            {selectedClass && (
                <div className={CARD}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F0] px-5 py-4" style={{ borderLeft: '3px solid #E02020' }}>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Danh sách sinh viên</p>
                            <h2 className="mt-0.5 text-base font-bold text-[#111111]">
                                Lớp {selectedClass.class_code}{selectedClass.class_name ? ` — ${selectedClass.class_name}` : ''}
                            </h2>
                            {memberPagination && (
                                <p className="mt-0.5 text-xs text-[#6B7280]">{memberPagination.total} sinh viên trong lớp</p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={openAddStudents}
                                className="flex items-center gap-2 rounded-xl border border-[#E02020]/30 px-4 py-2 text-sm font-semibold text-[#E02020] transition-colors hover:bg-[#FFF0F0]">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Thêm sinh viên
                            </button>
                            {members.length > 0 && (
                                <button type="button" onClick={() => void openTransfer(members.map(m => m.student_user_id))}
                                    className="flex items-center gap-2 rounded-xl border border-[#E0E0E0] px-4 py-2 text-sm font-semibold text-[#444444] transition-colors hover:border-[#E02020]/40 hover:text-[#E02020]">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Chuyển tất cả
                                </button>
                            )}
                            {memberPagination?.total === 0 && (
                                <button type="button" onClick={() => void handleDeleteClass()} disabled={deletingClass}
                                    className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                                        <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {deletingClass ? 'Đang xóa...' : 'Xóa lớp'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search members */}
                    <div className="border-b border-[#F0F0F0] px-5 py-3">
                        <div className="relative max-w-sm">
                            <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" viewBox="0 0 20 20" fill="none">
                                <path d="M17.5 17.5l-3.333-3.333M15.833 9.167a6.667 6.667 0 1 1-13.333 0 6.667 6.667 0 0 1 13.333 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input type="text" value={memberSearch} onChange={e => handleMemberSearchChange(e.target.value)}
                                placeholder="Tìm theo tên hoặc mã sinh viên..."
                                className="h-9 w-full rounded-xl border border-[#E0E0E0] bg-white pl-9 pr-9 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15" />
                            {memberSearch && (
                                <button type="button" onClick={() => handleMemberSearchChange('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]" aria-label="Xóa tìm kiếm">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {loadingMembers ? (
                        <div className="space-y-2 p-5">{[1, 2, 3, 4, 5].map(i => <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl bg-[#F9FAFB] px-4 py-3"><div className="size-9 shrink-0 rounded-full bg-[#F0F0F0]" /><div className="flex-1 space-y-2"><div className="h-3 w-40 rounded bg-[#F0F0F0]" /><div className="h-2.5 w-56 rounded bg-[#F0F0F0]" /></div></div>)}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                                        <TableCell isHeader className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Sinh viên</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã SV</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Email</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Trạng thái</TableCell>
                                        <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6B7280]">Thao tác</TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F9FAFB]">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                                                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <circle cx="9" cy="7" r="4" stroke="#9CA3AF" strokeWidth="1.5" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm font-semibold text-[#111111]">
                                                        {memberSearch ? 'Không tìm thấy sinh viên phù hợp' : 'Chưa có sinh viên trong lớp'}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280]">
                                                        {memberSearch ? 'Thử tìm với từ khóa khác.' : 'Nhấn "Thêm sinh viên" để thêm sinh viên vào lớp.'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMembers.map(row => (
                                            <TableRow key={row._id} className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]">
                                                <TableCell className="px-5 py-3.5 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}>
                                                            {initialsFromName(row.student?.profile?.full_name ?? row.student?.username)}
                                                        </div>
                                                        <p className="truncate font-semibold text-[#111111]">
                                                            {row.student?.profile?.full_name ?? row.student?.username ?? '—'}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                                                    <span className="font-mono text-sm text-[#444444]">{row.student?.student_info?.student_code ?? '—'}</span>
                                                </TableCell>
                                                <TableCell className="px-4 py-3.5 align-middle text-sm text-[#6B7280]">{row.student?.email ?? '—'}</TableCell>
                                                <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.status === 'ACTIVE' ? 'bg-[#F0FDF4] text-emerald-700' : 'bg-[#F9FAFB] text-[#6B7280]'}`}>
                                                        {row.status === 'ACTIVE' ? 'Đang học' : 'Không hoạt động'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button type="button" onClick={() => void openTransfer([row.student_user_id])}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0E0E0] px-3 py-1.5 text-xs font-semibold text-[#444444] transition-colors hover:border-[#E02020]/40 hover:text-[#E02020]">
                                                            Chuyển lớp
                                                        </button>
                                                        <button type="button"
                                                            disabled={removingIds.has(row.student_user_id)}
                                                            onClick={() => void handleRemoveStudent(row.student_user_id, row.student?.profile?.full_name ?? row.student?.username ?? '')}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                                            {removingIds.has(row.student_user_id) ? '...' : 'Xóa khỏi lớp'}
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {memberPagination && !memberSearch && <PaginationBar pagination={memberPagination} page={memberPage} setPage={setMemberPage} />}
                </div>
            )}

            {/* ── Modal tạo lớp cố vấn ── */}
            <Modal isOpen={createOpen} onClose={() => !saving && setCreateOpen(false)} showCloseButton={false} className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
                <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Tạo lớp cố vấn mới</h3>
                    <p className="text-xs text-[#6B7280]">Điền đầy đủ thông tin để tạo lớp cố vấn học tập</p>
                </div>
                <div className="overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="cls-code">Mã lớp <span className="text-[#E02020]">*</span></Label>
                            <InputField id="cls-code" placeholder="Ví dụ: CVHT-CNTT-K22A"
                                value={createForm.class_code} onChange={e => setCreateForm(p => ({ ...p, class_code: e.target.value }))} disabled={saving} />
                        </div>
                        <div>
                            <Label htmlFor="cls-name">Tên lớp <span className="text-xs font-normal text-[#6B7280]">(không bắt buộc)</span></Label>
                            <InputField id="cls-name" placeholder="Ví dụ: Lớp CNTT K22 nhóm A"
                                value={createForm.class_name} onChange={e => setCreateForm(p => ({ ...p, class_name: e.target.value }))} disabled={saving} />
                        </div>
                        <div>
                            <Label>Khoa <span className="text-[#E02020]">*</span></Label>
                            <Select key={`create-dept-${createOpenKey}`} options={deptOptions} placeholder="Chọn khoa"
                                onChange={v => void onCreateDeptChange(v)} defaultValue={createForm.department_id} />
                        </div>
                        <div>
                            <Label>Ngành <span className="text-xs font-normal text-[#6B7280]">(không bắt buộc)</span></Label>
                            <Select key={`create-major-${createOpenKey}-${createForm.department_id}`}
                                options={majorOptionsCreate} placeholder={createForm.department_id ? 'Chọn ngành (tùy chọn)' : 'Chọn khoa trước'}
                                onChange={v => setCreateForm(p => ({ ...p, major_id: v }))} defaultValue={createForm.major_id} />
                        </div>
                        <div className="sm:col-span-2">
                            <Label>Cố vấn phụ trách <span className="text-[#E02020]">*</span></Label>
                            <Select key={`create-adv-${createOpenKey}-${createForm.department_id}`}
                                options={advisorOptions} placeholder={createForm.department_id ? 'Chọn cố vấn' : 'Chọn khoa trước'}
                                onChange={v => setCreateForm(p => ({ ...p, advisor_user_id: v }))} defaultValue={createForm.advisor_user_id} />
                            <p className="mt-1 text-xs text-[#6B7280]">Chỉ hiển thị cố vấn thuộc khoa đã chọn. Mỗi cố vấn tối đa 3 lớp.</p>
                        </div>
                        <div>
                            <Label htmlFor="cls-cohort">Khóa học <span className="text-xs font-normal text-[#6B7280]">(không bắt buộc)</span></Label>
                            <InputField id="cls-cohort" type="number" placeholder="Ví dụ: 2022"
                                value={createForm.cohort_year} onChange={e => setCreateForm(p => ({ ...p, cohort_year: e.target.value }))} disabled={saving} />
                        </div>
                        <div>
                            <Label>Trạng thái</Label>
                            <select value={createForm.status} onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))}
                                className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2.5 text-sm text-[#444444] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10">
                                <option value="ACTIVE">Đang hoạt động</option>
                                <option value="INACTIVE">Không hoạt động</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button type="button" size="sm" variant="outline" className="border-[#E0E0E0] text-[#444444]" disabled={saving} onClick={() => setCreateOpen(false)}>Hủy</Button>
                    <Button type="button" size="sm" variant="danger" disabled={saving} onClick={() => void submitCreate()}>
                        {saving ? 'Đang lưu...' : 'Tạo lớp cố vấn'}
                    </Button>
                </div>
            </Modal>

            {/* ── Modal đổi cố vấn ── */}
            <Modal isOpen={changeAdvisorOpen} onClose={() => !changingAdvisor && setChangeAdvisorOpen(false)} showCloseButton={false} className="max-w-md overflow-hidden p-0">
                <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Thay đổi cố vấn phụ trách</h3>
                    <p className="text-xs text-[#6B7280]">Chọn cố vấn mới cho lớp này</p>
                </div>
                <div className="p-6">
                    <Label>Cố vấn mới <span className="text-[#E02020]">*</span></Label>
                    <Select key={`change-adv-${changeAdvisorOpenKey}`}
                        options={advisorOptionsChange} placeholder="Chọn cố vấn"
                        onChange={v => setNewAdvisorId(v)} defaultValue={newAdvisorId} />
                    <p className="mt-2 text-xs text-[#6B7280]">Chỉ hiển thị cố vấn thuộc cùng khoa với lớp. Mỗi cố vấn tối đa 3 lớp.</p>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button type="button" size="sm" variant="outline" className="border-[#E0E0E0] text-[#444444]" disabled={changingAdvisor} onClick={() => setChangeAdvisorOpen(false)}>Hủy</Button>
                    <Button type="button" size="sm" variant="danger" disabled={changingAdvisor} onClick={() => void submitChangeAdvisor()}>
                        {changingAdvisor ? 'Đang lưu...' : 'Xác nhận đổi cố vấn'}
                    </Button>
                </div>
            </Modal>

            {/* ── Modal thêm sinh viên ── */}
            <Modal isOpen={addStudentsOpen} onClose={() => !addingStudents && setAddStudentsOpen(false)} showCloseButton={false} className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
                <div className="shrink-0 border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Thêm sinh viên vào lớp</h3>
                    <p className="text-xs text-[#6B7280]">
                        Lớp: <span className="font-semibold text-[#111111]">{selectedClass?.class_code}</span>
                        {' · '}Chỉ hiển thị sinh viên chưa có lớp cố vấn
                    </p>
                </div>

                <div className="shrink-0 border-b border-[#F0F0F0] px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <input type="text" value={unassignedSearch} onChange={e => handleUnassignedSearchChange(e.target.value)}
                                placeholder="Tìm theo tên hoặc mã sinh viên..."
                                className="w-full rounded-xl border border-[#E0E0E0] bg-white py-2 pl-9 pr-9 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/10" />
                            {unassignedSearch && (
                                <button type="button" onClick={() => handleUnassignedSearchChange('')} aria-label="Xóa tìm kiếm"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#444444]">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                </button>
                            )}
                        </div>
                        <button type="button" onClick={toggleSelectAll}
                            className="rounded-xl border border-[#E0E0E0] px-4 py-2 text-sm font-semibold text-[#444444] transition-colors hover:border-[#E02020]/40 hover:text-[#E02020]">
                            {selectedStudentIds.size === unassignedStudents.length && unassignedStudents.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả trang này'}
                        </button>
                        {selectedStudentIds.size > 0 && (
                            <span className="rounded-full bg-[#FFF0F0] px-3 py-1 text-xs font-semibold text-[#E02020]">
                                Đã chọn {selectedStudentIds.size} sinh viên
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingUnassigned ? (
                        <div className="space-y-2 p-5">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-[#F9FAFB]" />)}</div>
                    ) : unassignedStudents.length === 0 ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
                            <p className="text-sm font-semibold text-[#111111]">Không có sinh viên nào</p>
                            <p className="text-xs text-[#6B7280]">Tất cả sinh viên thuộc ngành này đã có lớp cố vấn.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F0F0F0]">
                            {unassignedStudents.map(s => {
                                const isChecked = selectedStudentIds.has(s._id)
                                return (
                                    <label key={s._id} className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${isChecked ? 'bg-[#FFF8F8]' : 'hover:bg-[#F9FAFB]'}`}>
                                        <input type="checkbox" checked={isChecked} onChange={() => toggleStudent(s._id)}
                                            className="size-4 rounded border-[#E0E0E0] accent-[#E02020]" />
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}>
                                            {initialsFromName(s.profile?.full_name ?? s.username)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-semibold text-[#111111]">{s.profile?.full_name ?? s.username}</p>
                                            <p className="text-xs text-[#6B7280]">
                                                {s.student_info?.student_code && <span className="font-mono">{s.student_info.student_code} · </span>}
                                                {s.email}
                                            </p>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    )}
                </div>

                {unassignedPagination && unassignedPagination.total_pages > 1 && (
                    <div className="shrink-0 border-t border-[#F0F0F0]">
                        <PaginationBar pagination={unassignedPagination} page={unassignedPage} setPage={setUnassignedPage} />
                    </div>
                )}

                <div className="shrink-0 flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button type="button" size="sm" variant="outline" className="border-[#E0E0E0] text-[#444444]" disabled={addingStudents} onClick={() => setAddStudentsOpen(false)}>Hủy</Button>
                    <Button type="button" size="sm" variant="danger" disabled={addingStudents || selectedStudentIds.size === 0} onClick={() => void submitAddStudents()}>
                        {addingStudents ? 'Đang thêm...' : `Thêm ${selectedStudentIds.size > 0 ? selectedStudentIds.size + ' ' : ''}sinh viên`}
                    </Button>
                </div>
            </Modal>

            {/* ── Modal chuyển sinh viên sang lớp khác ── */}
            <Modal isOpen={transferOpen} onClose={() => !transferring && setTransferOpen(false)} showCloseButton={false} className="max-w-md overflow-hidden p-0">
                <div className="border-b border-[#F0F0F0] px-6 py-4" style={{ borderLeft: '4px solid #E02020' }}>
                    <h3 className="text-base font-bold text-[#111111]">Chuyển sinh viên sang lớp khác</h3>
                    <p className="text-xs text-[#6B7280]">
                        Chuyển <span className="font-semibold text-[#111111]">{transferStudentIds.size} sinh viên</span> từ lớp{' '}
                        <span className="font-semibold text-[#111111]">{selectedClass?.class_code}</span>
                    </p>
                </div>
                <div className="p-6">
                    <Label>Lớp đích <span className="text-[#E02020]">*</span></Label>
                    {targetClassPicklist.length === 0 ? (
                        <div className="rounded-xl border border-[#F0F0F0] bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
                            Không có lớp nào khác trong cùng ngành để chuyển đến.
                        </div>
                    ) : (
                        <Select key={`transfer-cls-${transferOpenKey}`} options={targetClassOptions} placeholder="Chọn lớp đích"
                            onChange={v => setTargetClassId(v)} defaultValue={targetClassId} />
                    )}
                    <p className="mt-2 text-xs text-[#6B7280]">Chỉ hiển thị các lớp đang hoạt động trong cùng khoa và ngành.</p>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-[#F9FAFB] px-6 py-4">
                    <Button type="button" size="sm" variant="outline" className="border-[#E0E0E0] text-[#444444]" disabled={transferring} onClick={() => setTransferOpen(false)}>Hủy</Button>
                    <Button type="button" size="sm" variant="danger" disabled={transferring || !targetClassId || targetClassPicklist.length === 0} onClick={() => void submitTransfer()}>
                        {transferring ? 'Đang chuyển...' : 'Xác nhận chuyển lớp'}
                    </Button>
                </div>
            </Modal>
        </>
    )
}
