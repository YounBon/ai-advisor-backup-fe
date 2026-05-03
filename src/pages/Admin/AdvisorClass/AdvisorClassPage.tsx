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
import MultiSelect from '@/components/form/MultiSelect'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { userService } from '@/services/UserService'
import { studentService } from '@/services/StudentService'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'
import {
  AngleLeftIcon,
  AngleRightIcon,
  BoxIconLine,
  CheckLineIcon,
  CloseLineIcon,
  EyeIcon,
  GroupIcon,
  PencilIcon,
  PlusIcon,
  TableIcon,
  UserCircleIcon,
} from '@/icons'

type TabKey = 'class' | 'members'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type UserItem = {
  _id: string
  username: string
  email: string
  profile?: { full_name?: string }
  org?: {
    department_id?: string | { _id?: string }
    major_id?: string | { _id?: string }
  }
  role: string
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

type AdvisorClassDoc = {
  _id: string
  class_code: string
  class_name?: string
  advisor_user_id: string
  department_id?: string
  major_id?: string
  cohort_year?: number
  status?: string
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
  } | null
}

type UpsertClassFormState = {
  classCode: string
  className: string
  deptId: string
  majorId: string
  cohortYear: string
  status: 'ACTIVE' | 'INACTIVE'
}

const MAJOR_NONE = '__none__'

function classStatusBadgeClass(status?: string | null): string {
  const s = (status ?? '').toUpperCase()
  if (s === 'ACTIVE')
    return 'inline-flex items-center rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-400/30'
  if (s === 'INACTIVE')
    return 'inline-flex items-center rounded-full bg-gray-500/12 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-700 ring-1 ring-gray-400/25 dark:text-gray-300 dark:ring-gray-500/40'
  return 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-400'
}

/** ObjectId hoặc object populate từ Mongo → chuỗi id */
function normalizeRefId(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id: unknown })._id)
  }
  return String(raw)
}

const ADVISOR_NO_DEPT_MSG =
  'Cố vấn chưa có khoa trong hồ sơ (org.department_id). Khi tạo cố vấn phải gửi đủ org.department_id và org.major_id (cùng lúc). Sửa user trong DB hoặc tạo lại tài khoản cố vấn kèm khoa/ngành — xem admin-provisioning-flow.'

export default function AdvisorClassPage() {
  const authUser = useAuthStore(s => s.user)
  const isAdmin = authUser?.role === 'ADMIN'
  const isAdvisor = authUser?.role === 'ADVISOR'

  const [tab, setTab] = useState<TabKey>('class')
  const [loadingClass, setLoadingClass] = useState(false)
  const [loadingLists, setLoadingLists] = useState(false)

  const [advisors, setAdvisors] = useState<UserItem[]>([])
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('')
  const [advisorClass, setAdvisorClass] = useState<AdvisorClassDoc | null>(null)

  const [classDetailOpen, setClassDetailOpen] = useState(false)

  const [upsertOpen, setUpsertOpen] = useState(false)
  const [savingClass, setSavingClass] = useState(false)
  const [upsertForm, setUpsertForm] = useState<UpsertClassFormState>({
    classCode: '',
    className: '',
    deptId: '',
    majorId: '',
    cohortYear: '',
    status: 'ACTIVE',
  })
  const [deptPicklist, setDeptPicklist] = useState<DepartmentItem[]>([])
  const [majorPicklist, setMajorPicklist] = useState<MajorItem[]>([])

  const [memberPage, setMemberPage] = useState(1)
  const memberLimit = 20
  const [memberPagination, setMemberPagination] = useState<Pagination | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [studentOptions, setStudentOptions] = useState<{ value: string; text: string }[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [addModalMemberTotal, setAddModalMemberTotal] = useState<number | null>(null)

  const selectedAdvisor = useMemo(
    () => advisors.find(a => a._id === selectedAdvisorId),
    [advisors, selectedAdvisorId]
  )
  const advisorOrgDeptId = useMemo(
    () => normalizeRefId(selectedAdvisor?.org?.department_id),
    [selectedAdvisor]
  )

  const currentClassId = advisorClass?._id ?? null

  const loadAdvisors = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await userService.getUsers({ role: 'ADVISOR', limit: 100, page: 1 })
      const data = res.data as { items?: UserItem[] }
      setAdvisors(data.items ?? [])
    } catch {
      toast.error('Đã có lỗi xảy ra')
    }
  }, [isAdmin])

  useEffect(() => {
    void loadAdvisors()
  }, [loadAdvisors])

  const fetchClassForAdvisor = async (advisorId: string) => {
    if (!advisorId) {
      setAdvisorClass(null)
      return
    }
    setLoadingClass(true)
    try {
      const res = await advisorClassService.getMyAdvisorClasses({ advisor_user_id: advisorId })
      setAdvisorClass(res.data as AdvisorClassDoc)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoadingClass(false)
    }
  }

  const fetchOwnClass = async () => {
    setLoadingClass(true)
    try {
      const res = await advisorClassService.getMyAdvisorClasses({})
      setAdvisorClass(res.data as AdvisorClassDoc)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoadingClass(false)
    }
  }

  useEffect(() => {
    if (isAdvisor) void fetchOwnClass()
  }, [isAdvisor])

  useEffect(() => {
    if (isAdmin && selectedAdvisorId) void fetchClassForAdvisor(selectedAdvisorId)
    if (isAdmin && !selectedAdvisorId) setAdvisorClass(null)
  }, [isAdmin, selectedAdvisorId])

  const openUpsertModal = async () => {
    const advId = isAdmin ? selectedAdvisorId : authUser?._id
    if (!advId) {
      toast.error(isAdmin ? 'Chọn cố vấn trước' : 'Không xác định được tài khoản')
      return
    }
    if (isAdmin && selectedAdvisorId && !advisorOrgDeptId) {
      toast.error(ADVISOR_NO_DEPT_MSG)
      return
    }
    try {
      const resDept = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
      const d = resDept.data as { items: DepartmentItem[] }
      setDeptPicklist(d.items ?? [])
    } catch {
      toast.error('Đã có lỗi xảy ra')
      return
    }

    if (advisorClass) {
      const deptLocked =
        isAdmin && advisorOrgDeptId ? advisorOrgDeptId : String(advisorClass.department_id ?? '')
      setUpsertForm({
        classCode: advisorClass.class_code ?? '',
        className: advisorClass.class_name ?? '',
        deptId: deptLocked,
        majorId: advisorClass.major_id ? String(advisorClass.major_id) : MAJOR_NONE,
        cohortYear: advisorClass.cohort_year != null ? String(advisorClass.cohort_year) : '',
        status: advisorClass.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      })
      if (advisorClass.department_id) {
        try {
          const rm = await masterDataService.getMajorsList({
            department_id: advisorClass.department_id,
            limit: 100,
            page: 1,
          })
          const md = rm.data as { items: MajorItem[] }
          setMajorPicklist(md.items ?? [])
        } catch {
          setMajorPicklist([])
        }
      } else setMajorPicklist([])
    } else {
      let defDept = ''
      if (isAdmin && selectedAdvisorId) {
        defDept = advisorOrgDeptId
      } else if (isAdvisor && authUser?.org?.department_id) {
        defDept = normalizeRefId(authUser.org.department_id)
      }
      setUpsertForm({
        classCode: '',
        className: '',
        deptId: defDept,
        majorId: MAJOR_NONE,
        cohortYear: '',
        status: 'ACTIVE',
      })
      if (defDept) {
        try {
          const rm = await masterDataService.getMajorsList({
            department_id: defDept,
            limit: 100,
            page: 1,
          })
          const md = rm.data as { items: MajorItem[] }
          setMajorPicklist(md.items ?? [])
        } catch {
          setMajorPicklist([])
        }
      } else setMajorPicklist([])
    }

    setUpsertOpen(true)
  }

  const handleUpsertDeptChange = async (v: string) => {
    setUpsertForm(prev => ({ ...prev, deptId: v, majorId: MAJOR_NONE }))
    if (!v) {
      setMajorPicklist([])
      return
    }
    try {
      const rm = await masterDataService.getMajorsList({
        department_id: v,
        limit: 100,
        page: 1,
      })
      const md = rm.data as { items: MajorItem[] }
      setMajorPicklist(md.items ?? [])
    } catch {
      setMajorPicklist([])
    }
  }

  const submitUpsert = async () => {
    const advId = isAdmin ? selectedAdvisorId : authUser?._id
    if (!advId) {
      toast.error('Thiếu cố vấn')
      return
    }
    if (isAdmin && !advisorOrgDeptId) {
      toast.error(ADVISOR_NO_DEPT_MSG)
      return
    }
    if (isAdmin && advisorOrgDeptId && upsertForm.deptId !== advisorOrgDeptId) {
      toast.error('Khoa lớp phải trùng khoa trong hồ sơ cố vấn (backend kiểm tra).')
      return
    }
    if (!upsertForm.classCode.trim() || !upsertForm.deptId) {
      toast.error('Mã lớp và khoa là bắt buộc')
      return
    }
    setSavingClass(true)
    try {
      const body: Record<string, unknown> = {
        advisor_user_id: advId,
        class_code: upsertForm.classCode.trim(),
        department_id: upsertForm.deptId,
        status: upsertForm.status,
      }
      if (upsertForm.className.trim()) body.class_name = upsertForm.className.trim()
      if (upsertForm.majorId && upsertForm.majorId !== MAJOR_NONE) body.major_id = upsertForm.majorId
      if (upsertForm.cohortYear.trim()) {
        const y = parseInt(upsertForm.cohortYear, 10)
        if (!Number.isNaN(y)) body.cohort_year = y
      }
      const res = await advisorClassService.upsertAdvisorClass(body)
      toast.success(viApiMessage(res.message, 'Lưu lớp cố vấn thành công'))
      setUpsertOpen(false)
      if (isAdmin && selectedAdvisorId) await fetchClassForAdvisor(selectedAdvisorId)
      else if (isAdvisor) await fetchOwnClass()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setSavingClass(false)
    }
  }

  const loadMembers = useCallback(async () => {
    if (!currentClassId) {
      setMembers([])
      setMemberPagination(null)
      return
    }
    setLoadingMembers(true)
    try {
      const body: Record<string, unknown> = { page: memberPage, limit: memberLimit }
      if (isAdmin) body.class_id = currentClassId
      const res = await classMemberService.listMembers(body)
      const data = res.data as { items: MemberRow[]; pagination: Pagination }
      setMembers(data.items ?? [])
      setMemberPagination(data.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoadingMembers(false)
    }
  }, [currentClassId, isAdmin, memberPage])

  useEffect(() => {
    if (tab === 'members') void loadMembers()
  }, [tab, loadMembers])

  useEffect(() => {
    setMemberPage(1)
  }, [currentClassId])

  const openAddMembersModal = async () => {
    if (!currentClassId) {
      toast.error('Chưa có lớp — tạo lớp ở tab Lớp cố vấn trước')
      return
    }
    const advisorIdForApi = isAdmin ? selectedAdvisorId : authUser?._id ? String(authUser._id) : ''
    if (!advisorIdForApi) {
      toast.error(
        isAdmin ? 'Chọn cố vấn và đảm bảo đã tải lớp của cố vấn đó' : 'Không xác định được tài khoản cố vấn'
      )
      return
    }
    if (advisorClass && String(advisorClass.advisor_user_id) !== String(advisorIdForApi)) {
      toast.error('Lớp hiện tại không khớp cố vấn. Hãy chọn lại cố vấn hoặc tải lại trang.')
      return
    }
    setSelectedStudentIds([])
    setAddModalMemberTotal(null)
    setLoadingLists(true)
    try {
      const memberBody: Record<string, unknown> = { page: 1, limit: 1 }
      if (isAdmin) memberBody.class_id = currentClassId

      const [memRes, studRes] = await Promise.all([
        classMemberService.listMembers(memberBody),
        studentService.listStudents({
          page: 1,
          limit: 100,
          class_id: currentClassId,
          advisor_user_id: advisorIdForApi,
        }),
      ])

      const memData = memRes.data as { pagination?: { total?: number } }
      setAddModalMemberTotal(memData.pagination?.total ?? 0)

      const studData = studRes.data as { items?: UserItem[] }
      const studs = studData.items ?? []
      setStudentOptions(
        studs.map(s => ({
          value: s._id,
          text: `${s.profile?.full_name ?? s.username} (${s.email})`,
        }))
      )
      setAddMembersOpen(true)
    } catch {
      toast.error('Không tải được danh sách sinh viên phù hợp lớp')
    } finally {
      setLoadingLists(false)
    }
  }

  const submitAddMembers = async () => {
    if (!currentClassId || selectedStudentIds.length === 0) {
      toast.error('Chọn ít nhất một sinh viên')
      return
    }
    setSavingMembers(true)
    try {
      const res = await classMemberService.addMembers({
        class_id: currentClassId,
        student_user_ids: selectedStudentIds,
      })
      toast.success(viApiMessage(res.message, 'Đã thêm thành viên'))
      setAddMembersOpen(false)
      setSelectedStudentIds([])
      void loadMembers()
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setSavingMembers(false)
    }
  }

  const openClassDetail = async () => {
    if (!advisorClass) return
    
    // Load advisors list if not already loaded (needed to resolve advisor name)
    if (isAdmin && advisors.length === 0) {
      try {
        const res = await userService.getUsers({ role: 'ADVISOR', limit: 100, page: 1 })
        const data = res.data as { items?: UserItem[] }
        setAdvisors(data.items ?? [])
      } catch {
        // Will fallback to showing ID
      }
    }
    
    // Load departments list if not already loaded
    if (deptPicklist.length === 0) {
      try {
        const resDept = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
        const d = resDept.data as { items: DepartmentItem[] }
        setDeptPicklist(d.items ?? [])
      } catch {
        // Will fallback to showing ID
      }
    }
    
    // Load majors list if department exists and majors not loaded
    if (advisorClass.department_id && majorPicklist.length === 0) {
      try {
        const rm = await masterDataService.getMajorsList({
          department_id: advisorClass.department_id,
          limit: 100,
          page: 1,
        })
        const md = rm.data as { items: MajorItem[] }
        setMajorPicklist(md.items ?? [])
      } catch {
        // Will fallback to showing ID
      }
    }
    
    setClassDetailOpen(true)
  }

  const advisorOptions = advisors.map(a => ({
    value: a._id,
    label: `${a.profile?.full_name ?? a.username} (${a.email})`,
  }))

  const deptOptions = deptPicklist.map(d => ({
    value: d._id,
    label: `${d.department_code} — ${d.department_name}`,
  }))

  const majorOptions = majorPicklist.map(m => ({
    value: m._id,
    label: `${m.major_code} — ${m.major_name}`,
  }))

  const canManageClass = isAdmin
  const canManageMembers = isAdmin
  /** ADMIN: đủ chọn cố vấn và cố vấn đã có khoa trong org (backend bắt buộc). */
  const adminCanUpsertClass = isAdmin && !!selectedAdvisorId && !!advisorOrgDeptId

  return (
    <>
      <PageMeta
        title="Lớp cố vấn & thành viên | Advisor"
        description="Quản lý lớp cố vấn và danh sách sinh viên trong lớp"
      />
      <PageBreadcrumb pageTitle="Lớp cố vấn & thành viên" />

      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/45 bg-gradient-to-br from-brand-50 via-white to-violet-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.28)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/45 dark:via-gray-900 dark:to-violet-950/25 dark:ring-brand-400/10 sm:p-6 md:flex md:items-center md:justify-between md:gap-8"
        aria-labelledby="ac-hero-title"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-500/15" aria-hidden />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/25">
            <BoxIconLine className="size-3.5 shrink-0" aria-hidden />
            Quản trị lớp SHCVHT
          </p>
          <h2 id="ac-hero-title" className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Gán lớp cố vấn & đồng bộ thành viên
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Chọn cố vấn (ADMIN), tạo hoặc cập nhật một lớp ACTIVE duy nhất, rồi thêm sinh viên đúng khoa/ngành — một luồng rõ ràng, ít nhầm lẫn.
          </p>
        </div>
        <div className="relative z-10 mt-5 flex flex-wrap gap-3 md:mt-0">
          <div className="rounded-xl border border-white/80 bg-white/95 px-4 py-3 shadow-md ring-1 ring-gray-900/[0.04] dark:border-white/10 dark:bg-gray-900/85 dark:ring-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tab</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {tab === 'class' ? 'Thông tin lớp' : 'Thành viên'}
            </p>
          </div>
          {advisorClass ? (
            <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50 to-white px-4 py-3 shadow-md ring-1 ring-emerald-500/15 dark:border-emerald-500/25 dark:from-emerald-950/40 dark:to-gray-900">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Lớp</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-gray-900 dark:text-white">{advisorClass.class_code}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/90 px-4 py-3 shadow-md dark:border-amber-500/25 dark:bg-amber-950/30">
              <p className="text-[10px] font-bold uppercase text-amber-900 dark:text-amber-200">Trạng thái</p>
              <p className="mt-0.5 text-sm font-semibold text-amber-900 dark:text-amber-100">Chưa có lớp</p>
            </div>
          )}
        </div>
      </section>

      <div className="space-y-8">
        <nav
          className="flex flex-wrap gap-2 rounded-2xl border border-gray-200/90 bg-white/90 p-1.5 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.08)] ring-1 ring-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900/60 dark:ring-white/[0.04]"
          aria-label="Chế độ xem"
        >
          <button
            type="button"
            onClick={() => setTab('class')}
            aria-current={tab === 'class' ? 'page' : undefined}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 sm:flex-none sm:px-6 ${
              tab === 'class'
                ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_6px_20px_-4px_rgba(70,95,255,0.45)] ring-1 ring-brand-400/30'
                : 'text-gray-600 hover:bg-gray-100/90 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-white'
            }`}
          >
            <TableIcon className="size-5 shrink-0 opacity-95" aria-hidden />
            Lớp cố vấn
          </button>
          <button
            type="button"
            onClick={() => setTab('members')}
            aria-current={tab === 'members' ? 'page' : undefined}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 sm:flex-none sm:px-6 ${
              tab === 'members'
                ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_6px_20px_-4px_rgba(70,95,255,0.45)] ring-1 ring-brand-400/30'
                : 'text-gray-600 hover:bg-gray-100/90 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-white'
            }`}
          >
            <GroupIcon className="size-5 shrink-0 opacity-95" aria-hidden />
            Thành viên lớp
          </button>
        </nav>

        {tab === 'class' && (
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] sm:p-6">
            {isAdmin && (
              <div className="mb-6 max-w-xl rounded-xl border border-brand-100/80 bg-gradient-to-r from-brand-50/50 to-transparent p-4 dark:border-brand-500/15 dark:from-brand-950/30">
                <Label className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <UserCircleIcon className="size-4 text-brand-600 dark:text-brand-400" aria-hidden />
                  Chọn cố vấn
                </Label>
                <div className="mt-2">
                  <Select
                    key={`adv-${advisors.length}`}
                    options={advisorOptions}
                    placeholder="Chọn tài khoản ADVISOR"
                    onChange={setSelectedAdvisorId}
                    defaultValue={selectedAdvisorId}
                  />
                </div>
                {selectedAdvisorId && !advisorOrgDeptId ? (
                  <p className="mt-3 rounded-lg border border-error-200 bg-error-50/80 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-950/40 dark:text-error-300">
                    {ADVISOR_NO_DEPT_MSG}
                  </p>
                ) : null}
              </div>
            )}

            <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Nội dung chính
                </p>
                <h3 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  <TableIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />
                  Thông tin lớp
                </h3>
              </div>
              {canManageClass && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={isAdmin && !adminCanUpsertClass}
                  startIcon={
                    advisorClass ? (
                      <PencilIcon className="size-4 shrink-0" aria-hidden />
                    ) : (
                      <PlusIcon className="size-4 shrink-0" aria-hidden />
                    )
                  }
                  onClick={() => void openUpsertModal()}
                >
                  {advisorClass ? 'Cập nhật lớp' : 'Tạo lớp'}
                </Button>
              )}
            </div>

            {loadingClass ? (
              <div className="space-y-3 py-4" aria-busy="true">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10"
                  />
                ))}
              </div>
            ) : (
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Mã lớp
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Tên lớp
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Trạng thái
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisorClass ? (
                    <TableRow className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50/90 dark:border-gray-800 dark:hover:bg-white/[0.03]">
                      <TableCell className="px-4 py-3.5">
                        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                          {advisorClass.class_code}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-200">
                        {advisorClass.class_name ?? '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span className={classStatusBadgeClass(advisorClass.status)}>
                          {advisorClass.status ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          startIcon={<EyeIcon className="size-4 shrink-0" aria-hidden />}
                          onClick={() => void openClassDetail()}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="px-4 py-12 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
                            <TableIcon className="size-6" aria-hidden />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isAdmin && !selectedAdvisorId
                              ? 'Chọn cố vấn để xem hoặc tạo lớp.'
                              : 'Chưa có lớp cố vấn.'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ADMIN: dùng nút <span className="font-semibold text-brand-600">Tạo lớp</span> phía trên sau khi chọn cố vấn hợp lệ.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {isAdvisor && !canManageClass && (
              <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400">
                Cố vấn chỉ xem lớp của mình. Tạo/cập nhật lớp do ADMIN thực hiện (theo API).
              </p>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] sm:p-6">
            <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Danh sách
                </p>
                <h3 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  <GroupIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />
                  Thành viên lớp
                </h3>
              </div>
              {canManageMembers && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!currentClassId}
                  startIcon={<PlusIcon className="size-4 shrink-0" aria-hidden />}
                  onClick={() => void openAddMembersModal()}
                >
                  Thêm sinh viên
                </Button>
              )}
            </div>

            {!currentClassId ? (
              <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 p-6 text-center dark:border-amber-500/30 dark:bg-amber-950/20">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Chưa có <code className="rounded bg-white/80 px-1 font-mono text-xs dark:bg-black/30">class_id</code>
                </p>
                <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/80">
                  Tạo hoặc gán lớp ở tab <span className="font-semibold">Lớp cố vấn</span> trước khi thêm sinh viên.
                </p>
              </div>
            ) : loadingMembers ? (
              <div className="space-y-3 py-4" aria-busy="true">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
                ))}
              </div>
            ) : (
              <>
                <Table className="text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
                      <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Sinh viên
                      </TableCell>
                      <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Email
                      </TableCell>
                      <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Mã SV
                      </TableCell>
                      <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Trạng thái
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          Chưa có thành viên — thêm sinh viên bằng nút phía trên.
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map(row => (
                        <TableRow
                          key={row._id}
                          className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50/90 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">
                            {row.student?.profile?.full_name ?? row.student?.username ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                            {row.student?.email ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 font-mono text-sm text-gray-800 dark:text-gray-200">
                            {row.student?.student_info?.student_code ?? '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <span className={classStatusBadgeClass(row.status)}>{row.status}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {memberPagination && memberPagination.total_pages > 1 && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                    <span className="tabular-nums">
                      <span className="font-semibold text-gray-900 dark:text-white">{memberPagination.page}</span>
                      <span className="mx-1 text-gray-400">/</span>
                      {memberPagination.total_pages} trang —{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">{memberPagination.total}</span>{' '}
                      thành viên
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="!px-2.5 font-semibold"
                        disabled={memberPage <= 1}
                        onClick={() => setMemberPage(p => Math.max(1, p - 1))}
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
                        disabled={memberPage >= memberPagination.total_pages}
                        onClick={() => setMemberPage(p => p + 1)}
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
        )}
      </div>

      <Modal
        isOpen={classDetailOpen}
        onClose={() => setClassDetailOpen(false)}
        className="max-w-lg overflow-hidden p-0"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/90 to-violet-50/40 px-6 py-4 dark:border-gray-800 dark:from-brand-950/40 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/60 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
              <EyeIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Chi tiết lớp cố vấn</h3>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">Đọc nhanh — không chỉnh sửa tại đây</p>
            </div>
          </div>
        </div>
        <div className="p-6 pt-4">
        {advisorClass && (
          <dl className="space-y-2 text-sm">
            {(
              [
                ['ID', advisorClass._id],
                ['Mã lớp', advisorClass.class_code],
                ['Tên', advisorClass.class_name ?? '—'],
                ['Cố vấn', (() => {
                  // Try to find advisor from loaded advisors list first
                  const adv = advisors.find(a => a._id === String(advisorClass.advisor_user_id))
                  if (adv) return `${adv.profile?.full_name ?? adv.username} (${adv.email})`
                  
                  // If viewing own class as ADVISOR, use selectedAdvisor or authUser
                  if (selectedAdvisor && selectedAdvisor._id === String(advisorClass.advisor_user_id)) {
                    return `${selectedAdvisor.profile?.full_name ?? selectedAdvisor.username} (${selectedAdvisor.email})`
                  }
                  
                  // If current user is the advisor
                  if (isAdvisor && authUser?._id === String(advisorClass.advisor_user_id)) {
                    return `${authUser.profile?.full_name ?? authUser.username} (${authUser.email})`
                  }
                  
                  // Fallback to showing ID
                  return String(advisorClass.advisor_user_id)
                })()],
                ['Khoa', (() => {
                  const dept = deptPicklist.find(d => d._id === String(advisorClass.department_id))
                  return dept ? `${dept.department_code} — ${dept.department_name}` : (advisorClass.department_id ? String(advisorClass.department_id) : '—')
                })()],
                ['Ngành', (() => {
                  if (!advisorClass.major_id) return '—'
                  const major = majorPicklist.find(m => m._id === String(advisorClass.major_id))
                  return major ? `${major.major_code} — ${major.major_name}` : String(advisorClass.major_id)
                })()],
                [
                  'Khóa/cohort',
                  advisorClass.cohort_year != null ? String(advisorClass.cohort_year) : '—',
                ],
                ['Trạng thái', advisorClass.status ?? '—'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex gap-3 border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-800"
              >
                <dt className="w-36 shrink-0 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {k}
                </dt>
                <dd className="min-w-0 flex-1 break-all text-sm font-medium text-gray-900 dark:text-white/90">
                  {k === 'Trạng thái' && v !== '—' ? (
                    <span className={classStatusBadgeClass(v)}>{v}</span>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button
            type="button"
            size="sm"
            variant="outline"
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setClassDetailOpen(false)}
          >
            Đóng
          </Button>
        </div>
        </div>
      </Modal>

      <Modal
        isOpen={upsertOpen}
        onClose={() => !savingClass && setUpsertOpen(false)}
        className="max-w-md overflow-hidden p-0"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/90 to-white px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              {advisorClass ? (
                <PencilIcon className="size-5" aria-hidden />
              ) : (
                <PlusIcon className="size-5" aria-hidden />
              )}
            </span>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {advisorClass ? 'Cập nhật lớp cố vấn' : 'Tạo lớp cố vấn'}
            </h3>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <Label htmlFor="ac-class-code">Mã lớp *</Label>
            <InputField
              id="ac-class-code"
              value={upsertForm.classCode}
              onChange={e => setUpsertForm(prev => ({ ...prev, classCode: e.target.value }))}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label htmlFor="ac-class-name">Tên lớp</Label>
            <InputField
              id="ac-class-name"
              value={upsertForm.className}
              onChange={e => setUpsertForm(prev => ({ ...prev, className: e.target.value }))}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label>Khoa * (phải trùng khoa của cố vấn)</Label>
            {isAdmin && advisorOrgDeptId ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
                {(() => {
                  const d = deptPicklist.find(x => String(x._id) === String(advisorOrgDeptId))
                  return d ? `${d.department_code} — ${d.department_name}` : advisorOrgDeptId
                })()}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  (khóa theo hồ sơ cố vấn — trùng backend)
                </span>
              </p>
            ) : (
              <Select
                key={`dept-${upsertOpen}-${upsertForm.deptId}`}
                options={deptOptions}
                placeholder="Chọn khoa"
                onChange={v => void handleUpsertDeptChange(v)}
                defaultValue={upsertForm.deptId}
              />
            )}
          </div>
          <div>
            <Label>Ngành (tuỳ chọn)</Label>
            <Select
              key={`maj-${upsertOpen}-${upsertForm.deptId}-${majorPicklist.length}-${upsertForm.majorId || MAJOR_NONE}`}
              options={[{ value: MAJOR_NONE, label: '— Không chọn —' }, ...majorOptions]}
              placeholder="Ngành"
              onChange={v => setUpsertForm(prev => ({ ...prev, majorId: v }))}
              defaultValue={upsertForm.majorId || MAJOR_NONE}
            />
          </div>
          <div>
            <Label htmlFor="ac-cohort">Cohort / năm khóa (tuỳ chọn)</Label>
            <InputField
              id="ac-cohort"
              type="number"
              value={upsertForm.cohortYear}
              onChange={e => setUpsertForm(prev => ({ ...prev, cohortYear: e.target.value }))}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label htmlFor="ac-status">Trạng thái</Label>
            <select
              id="ac-status"
              value={upsertForm.status}
              onChange={e =>
                setUpsertForm(prev => ({
                  ...prev,
                  status: e.target.value as 'ACTIVE' | 'INACTIVE',
                }))
              }
              disabled={savingClass}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-900/[0.04] transition-shadow focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:ring-white/[0.06]"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={savingClass}
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setUpsertOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={savingClass}
            startIcon={
              savingClass ? undefined : <CheckLineIcon className="size-4 shrink-0" aria-hidden />
            }
            onClick={() => void submitUpsert()}
          >
            {savingClass ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={addMembersOpen}
        onClose={() => !savingMembers && setAddMembersOpen(false)}
        className="relative max-h-[70vh] max-w-lg overflow-hidden p-0"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50/90 via-white to-brand-50/40 px-6 py-4 dark:border-gray-800 dark:from-emerald-950/30 dark:via-gray-900 dark:to-brand-950/25">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <PlusIcon className="size-5" aria-hidden />
            </span>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
              Thêm sinh viên vào lớp
            </h3>
          </div>
        </div>
        <div className="max-h-[calc(70vh-8rem)] overflow-auto p-6">
        {advisorClass ? (
          <div className="mb-4 rounded-xl border border-gray-200/80 bg-gradient-to-b from-gray-50 to-white p-4 text-sm text-gray-700 shadow-sm ring-1 ring-gray-900/[0.03] dark:border-gray-700 dark:from-gray-900 dark:to-gray-950 dark:text-gray-300 dark:ring-white/[0.04]">
            <p>
              <span className="text-gray-500 dark:text-gray-400">Lớp: </span>
              <span className="font-medium text-gray-900 dark:text-white/90">
                {advisorClass.class_code}
                {advisorClass.class_name ? ` — ${advisorClass.class_name}` : ''}
              </span>
            </p>
            <p className="mt-1">
              <span className="text-gray-500 dark:text-gray-400">Cố vấn: </span>
              <span className="font-medium">
                {selectedAdvisor?.profile?.full_name ??
                  selectedAdvisor?.username ??
                  (isAdvisor ? authUser?.profile?.full_name ?? authUser?.username : '—')}
              </span>
            </p>
            {addModalMemberTotal != null ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Đang có <strong>{addModalMemberTotal}</strong> thành viên trong lớp (xem đầy đủ ở tab
                «Thành viên lớp»). Chỉ hiển thị sinh viên còn có thể thêm (đúng khoa/ngành, chưa thuộc lớp
                ACTIVE khác, chưa ACTIVE trong lớp này).
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Danh sách lấy từ API <code className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-800">POST /students</code> kèm{' '}
          <code className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-800">class_id</code> và{' '}
          <code className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-800">advisor_user_id</code>.
        </p>
        {loadingLists ? (
          <p className="text-sm text-gray-500">Đang tải danh sách sinh viên...</p>
        ) : (
          <MultiSelect
            label="Chọn sinh viên"
            options={studentOptions}
            value={selectedStudentIds}
            onChange={setSelectedStudentIds}
            disabled={savingMembers}
            placeholder="Chọn một hoặc nhiều"
          />
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={savingMembers}
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setAddMembersOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={savingMembers}
            className="min-w-[140px]"
            startIcon={
              savingMembers ? undefined : <PlusIcon className="size-4 shrink-0" aria-hidden />
            }
            onClick={() => void submitAddMembers()}
          >
            {savingMembers ? 'Đang thêm...' : 'Thêm vào lớp'}
          </Button>
        </div>
        </div>
      </Modal>
    </>
  )
}
