// Trang Lớp & Sinh viên — dành cho ADVISOR
// Flow: hiển thị lớp ACTIVE → chọn lớp → xem danh sách sinh viên
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'
import { ArrowRightIcon, CloseLineIcon, GroupIcon } from '@/icons'

// ─── Kiểu dữ liệu ────────────────────────────────────────────────────────────

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
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

const MEMBER_PAGE_SIZE = 10

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

function classLabel(c: AdvisorClassDoc): string {
  return [c.class_code, c.class_name].filter(Boolean).join(' — ')
}

// ─── Component chính ──────────────────────────────────────────────────────────

export default function AdvisorClassPage() {
  useAuthStore(s => s.user)

  // Học kỳ active (chỉ hiển thị ngữ cảnh)
  const [activeTerm, setActiveTerm] = useState<string | null>(null)

  // Danh sách lớp ACTIVE của cố vấn
  const [classes, setClasses] = useState<AdvisorClassDoc[]>([])

  // Lớp đang được chọn để xem sinh viên
  const [selectedClass, setSelectedClass] = useState<AdvisorClassDoc | null>(null)

  // Danh sách thành viên của lớp đang chọn
  const [members, setMembers] = useState<MemberRow[]>([])
  const [memberPagination, setMemberPagination] = useState<Pagination | null>(null)
  const [memberPage, setMemberPage] = useState(1)
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Searchbar sinh viên (client-side filter)
  const [search, setSearch] = useState('')

  // ── Load học kỳ active + danh sách lớp khi mount ──────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const [termRes, classRes] = await Promise.all([
          masterDataService.getActiveTerm(),
          advisorClassService.getMyAdvisorClasses({}),
        ])
        const term = termRes.data as { term_name?: string; term_code?: string } | null
        setActiveTerm(term?.term_name ?? term?.term_code ?? null)

        const all = (classRes.data as AdvisorClassDoc[] | AdvisorClassDoc) ?? []
        const list = Array.isArray(all) ? all : [all]
        setClasses(list.filter(c => c.status === 'ACTIVE'))
      } catch {
        toast.error('Không tải được danh sách lớp')
      }
    })()
  }, [])

  // ── Load thành viên khi chọn lớp hoặc đổi trang ───────────────────────────
  const loadMembers = useCallback(async () => {
    if (!selectedClass) return
    setLoadingMembers(true)
    try {
      const res = await classMemberService.listMembers({
        class_id: selectedClass._id,
        page: memberPage,
        limit: MEMBER_PAGE_SIZE,
      })
      const data = res.data as { items: MemberRow[]; pagination: Pagination }
      setMembers(data.items ?? [])
      setMemberPagination(data.pagination ?? null)
    } catch {
      toast.error('Không tải được danh sách sinh viên')
    } finally {
      setLoadingMembers(false)
    }
  }, [selectedClass, memberPage])

  useEffect(() => {
    if (selectedClass) void loadMembers()
  }, [loadMembers, selectedClass])

  // Reset trang + search khi đổi lớp
  useEffect(() => {
    setMemberPage(1)
    setSearch('')
  }, [selectedClass?._id])

  // ── Lọc sinh viên theo search (client-side) ────────────────────────────────
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(m => {
      const name = (m.student?.profile?.full_name ?? m.student?.username ?? '').toLowerCase()
      const code = (m.student?.student_info?.student_code ?? '').toLowerCase()
      const email = (m.student?.email ?? '').toLowerCase()
      return name.includes(q) || code.includes(q) || email.includes(q)
    })
  }, [members, search])

  // Phân trang client-side khi đang search, server-side khi không search
  const [searchPage, setSearchPage] = useState(1)
  useEffect(() => { setSearchPage(1) }, [search])

  const isSearching = search.trim().length > 0
  const totalPages = isSearching ? Math.max(1, Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE)) : (memberPagination?.total_pages ?? 1)
  const currentPage = isSearching ? searchPage : memberPage
  const setCurrentPage = isSearching ? setSearchPage : setMemberPage
  const totalCount = isSearching ? filteredMembers.length : (memberPagination?.total ?? 0)
  const displayedMembers = isSearching
    ? filteredMembers.slice((searchPage - 1) * MEMBER_PAGE_SIZE, searchPage * MEMBER_PAGE_SIZE)
    : filteredMembers

  const CARD = 'rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]'

  return (
    <>
      <PageMeta
        title="Lớp & Sinh viên | Cố vấn học tập"
        description="Danh sách lớp cố vấn và sinh viên trong lớp"
      />

      {/* ── Tiêu đề trang ── */}
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderLeft: '4px solid #E02020' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Cố vấn học tập</p>
          <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Lớp &amp; Sinh viên</h1>
          {activeTerm && (
            <p className="mt-1 text-sm text-[#6B7280]">
              Học kỳ hiện tại:{' '}
              <span className="rounded-full bg-[#FFF0F0] px-2.5 py-0.5 text-xs font-semibold text-[#E02020]">
                {activeTerm}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Danh sách lớp ACTIVE ── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111111]">Lớp đang cố vấn</h2>
          <span className="text-xs text-[#6B7280]">{classes.length} lớp đang hoạt động</span>
        </div>

        {classes.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-3 py-12 text-center`}>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F9FAFB]">
              <GroupIcon className="size-6 text-[#9CA3AF]" />
            </div>
            <p className="text-sm font-semibold text-[#111111]">Chưa có lớp cố vấn đang hoạt động</p>
            <p className="text-xs text-[#6B7280]">Liên hệ quản trị viên để được gán lớp trong học kỳ này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map(c => {
              const isSelected = selectedClass?._id === c._id
              return (
                <div
                  key={c._id}
                  className={`rounded-2xl border bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200 ${isSelected
                      ? 'border-[#E02020] ring-2 ring-[#E02020]/20'
                      : 'border-[#F0F0F0] hover:border-[#E02020]/40'
                    }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-base font-bold text-[#111111]">{c.class_code}</p>
                      {c.class_name && (
                        <p className="mt-0.5 text-sm text-[#6B7280]">{c.class_name}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Đang hoạt động
                    </span>
                  </div>

                  {c.cohort_year && (
                    <p className="mb-4 text-xs text-[#6B7280]">Khóa {c.cohort_year}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedClass(c)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${isSelected
                        ? 'bg-[#E02020] text-white'
                        : 'border border-[#E02020]/30 text-[#E02020] hover:bg-[#FFF0F0]'
                      }`}
                  >
                    <GroupIcon className="size-4 shrink-0" />
                    {isSelected ? 'Đang xem sinh viên' : 'Xem danh sách sinh viên'}
                    {!isSelected && <ArrowRightIcon className="size-4 shrink-0" />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Danh sách sinh viên (chỉ hiện khi đã chọn lớp) ── */}
      {selectedClass && (
        <section>
          <div className={CARD}>
            {/* Header */}
            <div
              className="border-b border-[#F0F0F0] px-5 py-4"
              style={{ borderLeft: '3px solid #E02020' }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">
                Danh sách sinh viên
              </p>
              <h2 className="mt-0.5 text-base font-bold text-[#111111]">
                Lớp {classLabel(selectedClass)}
              </h2>
              {memberPagination && (
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  {memberPagination.total} sinh viên trong lớp
                </p>
              )}
            </div>

            {/* Searchbar */}
            <div className="border-b border-[#F0F0F0] px-5 py-3">
              <div className="relative max-w-sm">
                <svg
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                  viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.5 17.5l-3.333-3.333M15.833 9.167a6.667 6.667 0 1 1-13.333 0 6.667 6.667 0 0 1 13.333 0Z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã sinh viên..."
                  className="h-9 w-full rounded-xl border border-[#E0E0E0] bg-white pl-9 pr-9 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                    aria-label="Xóa tìm kiếm"
                  >
                    <CloseLineIcon className="size-4" />
                  </button>
                )}
              </div>
              {isSearching && (
                <p className="mt-1.5 text-xs text-[#6B7280]">
                  Tìm thấy <span className="font-semibold text-[#111111]">{filteredMembers.length}</span> kết quả
                </p>
              )}
            </div>

            {/* Bảng */}
            {loadingMembers ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <div className="size-9 shrink-0 rounded-full bg-[#F0F0F0]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded bg-[#F0F0F0]" />
                      <div className="h-2.5 w-56 rounded bg-[#F0F0F0]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
                        Email
                      </TableCell>
                      <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                        Trạng thái
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F9FAFB]">
                              <GroupIcon className="size-6 text-[#9CA3AF]" />
                            </div>
                            <p className="text-sm font-semibold text-[#111111]">
                              {isSearching ? 'Không tìm thấy sinh viên phù hợp' : 'Chưa có sinh viên trong lớp'}
                            </p>
                            <p className="text-xs text-[#6B7280]">
                              {isSearching ? 'Thử tìm với từ khóa khác.' : 'Liên hệ quản trị viên để thêm sinh viên vào lớp.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedMembers.map(row => (
                        <TableRow
                          key={row._id}
                          className="border-b border-[#F0F0F0] bg-white transition-colors last:border-0 hover:bg-[#FFF8F8]"
                        >
                          <TableCell className="px-5 py-3.5 align-middle">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
                              >
                                {initialsFromName(row.student?.profile?.full_name ?? row.student?.username)}
                              </div>
                              <p className="truncate font-semibold text-[#111111]">
                                {row.student?.profile?.full_name ?? row.student?.username ?? '—'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                            <span className="font-mono text-sm text-[#444444]">
                              {row.student?.student_info?.student_code ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle text-sm text-[#6B7280]">
                            {row.student?.email ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3.5 align-middle">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.status === 'ACTIVE'
                                ? 'bg-[#F0FDF4] text-emerald-700'
                                : 'bg-[#F9FAFB] text-[#6B7280]'
                              }`}>
                              {row.status === 'ACTIVE' ? 'Đang học' : 'Không hoạt động'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#F0F0F0] px-5 py-3.5">
                <p className="text-xs text-[#6B7280]">
                  Hiển thị{' '}
                  <span className="font-semibold text-[#111111]">
                    {(currentPage - 1) * MEMBER_PAGE_SIZE + 1}–{Math.min(currentPage * MEMBER_PAGE_SIZE, totalCount)}
                  </span>{' '}
                  / {totalCount} sinh viên
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    aria-label="Trang trước"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
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
                          onClick={() => setCurrentPage(item)}
                          aria-current={currentPage === item ? 'page' : undefined}
                          className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${currentPage === item
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Trang sau"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-[#6B7280] transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
