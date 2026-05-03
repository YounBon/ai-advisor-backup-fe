import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { dashboardService } from '@/services/DashboardService'
import { masterDataService } from '@/services/MasterDataService'
import { studentService } from '@/services/StudentService'
import useAuthStore from '@/stores/authStore'
import { ArrowRightIcon, CalenderIcon, ChatIcon, TimeIcon } from '@/icons'

type AcademicRow = {
  term_id?: string | { _id?: string; term_code?: string; term_name?: string }
  gpa_prev_sem?: number | null
  gpa_current?: number | null
  num_failed?: number | null
  attendance_rate?: number | null
  sentiment_score?: number | null
  recorded_at?: string
}

type SentimentAgg = {
  _id: { month?: string; sentiment_label?: string }
  count: number
}

type StudentDashboardData = {
  student_user_id?: string
  risk_score?: number | null
  risk_label?: string | null
  risk_term_code?: string | null
  academic_trend: AcademicRow[]
  sentiment_trend: SentimentAgg[]
}

function formatRiskLabel(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  if (v === -1 || v === '-1') return 'High'
  if (v === 0 || v === '0') return 'Medium'
  if (v === 1 || v === '1') return 'Low'
  return String(v)
}

function formatRiskLabelVi(v: number | string | null | undefined): string {
  const k = formatRiskLabel(v)
  if (k === 'High') return 'Cao'
  if (k === 'Medium') return 'Trung bình'
  if (k === 'Low') return 'Thấp'
  return '—'
}

function termLabel(row: AcademicRow): string {
  const t = row.term_id
  if (t && typeof t === 'object') {
    if (t.term_name) return t.term_name
    if (t.term_code) return t.term_code
  }
  return '—'
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [activeTerm, setActiveTerm] = useState<{ term_name?: string; term_code?: string } | null>(null)
  const [advisorData, setAdvisorData] = useState<{
    advisor_class?: { department_display?: string | null; major_display?: string | null } | null
  } | null>(null)
  const user = useAuthStore(s => s.user)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, termRes, advisorRes] = await Promise.all([
        dashboardService.getStudentDashboard({ history_limit: 3, risk_threshold: 0.7 }),
        masterDataService.getActiveTerm(),
        studentService.getMyAdvisor(),
      ])
      setData(dashRes.data as StudentDashboardData)
      setActiveTerm(termRes.data as { term_name?: string; term_code?: string } | null)
      setAdvisorData(advisorRes.data as { advisor_class?: { department_display?: string | null; major_display?: string | null } | null } | null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const sortedAscRows = useMemo(
    () => [...(data?.academic_trend ?? [])].sort(
      (a, b) => new Date(a.recorded_at ?? 0).getTime() - new Date(b.recorded_at ?? 0).getTime()
    ),
    [data?.academic_trend]
  )

  const sortedDescRows = useMemo(
    () => [...(data?.academic_trend ?? [])].sort(
      (a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime()
    ),
    [data?.academic_trend]
  )

  const latestRow = sortedDescRows[0] ?? null

  const gpaCategories = useMemo(
    () => sortedAscRows.map(r => {
      const t = r.term_id
      if (t && typeof t === 'object') return t.term_name || t.term_code || '—'
      return r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('vi-VN') : '—'
    }),
    [sortedAscRows]
  )

  const gpaChartSeries = useMemo(() => [
    { name: 'GPA hiện tại', data: sortedAscRows.map(r => r.gpa_current ?? null) },
    { name: 'GPA kỳ trước', data: sortedAscRows.map(r => r.gpa_prev_sem ?? null) },
  ], [sortedAscRows])

  const gpaChartOptions = useMemo<ApexOptions>(() => ({
    chart: { toolbar: { show: false }, fontFamily: 'Be Vietnam Pro, sans-serif' },
    colors: ['#E02020', '#9CA3AF'],
    stroke: { curve: 'smooth', width: [2.5, 1.5], dashArray: [0, 4] },
    xaxis: { categories: gpaCategories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: { min: 0, max: 4, tickAmount: 4, labels: { formatter: (v: number) => v.toFixed(1) } },
    markers: { size: 5, strokeWidth: 2, hover: { size: 7 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    annotations: {
      yaxis: [{
        y: 2.0, borderColor: '#FB6514', borderWidth: 2, strokeDashArray: 5,
        label: {
          text: 'Ngưỡng cảnh báo (2.0)',
          style: { color: '#FB6514', background: '#FFF7ED', fontSize: '11px', fontWeight: '600' },
          position: 'right', offsetX: -10,
        },
      }],
    },
    tooltip: { y: { formatter: (v: number) => v != null ? v.toFixed(2) : '—' } },
    grid: { borderColor: '#F0F0F0' },
  }), [gpaCategories])

  const sentimentChartSeries = useMemo(() => [
    { name: 'Điểm cảm xúc', data: sortedAscRows.map(r => r.sentiment_score ?? null) },
  ], [sortedAscRows])

  const sentimentChartOptions = useMemo<ApexOptions>(() => ({
    chart: { toolbar: { show: false }, fontFamily: 'Be Vietnam Pro, sans-serif' },
    colors: ['#7C3AED'],
    stroke: { curve: 'smooth', width: 2.5 },
    xaxis: { categories: gpaCategories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: { min: -1, max: 1, tickAmount: 4, labels: { formatter: (v: number) => v.toFixed(1) } },
    markers: { size: 5, strokeWidth: 2, hover: { size: 7 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    annotations: {
      yaxis: [
        {
          y: 0.33, borderColor: '#12B76A', borderWidth: 1.5, strokeDashArray: 4,
          label: { text: 'Ngưỡng tích cực (0.33)', style: { color: '#12B76A', background: '#F0FDF4', fontSize: '11px' }, position: 'right', offsetX: -10 },
        },
        {
          y: -0.33, borderColor: '#E02020', borderWidth: 1.5, strokeDashArray: 4,
          label: { text: 'Ngưỡng tiêu cực (-0.33)', style: { color: '#E02020', background: '#FFF0F0', fontSize: '11px' }, position: 'right', offsetX: -10 },
        },
      ],
    },
    tooltip: { y: { formatter: (v: number) => v != null ? Number(v).toFixed(2) : '—' } },
    grid: { borderColor: '#F0F0F0' },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 0.4, opacityTo: 0.05 } },
  }), [gpaCategories])

  const currentGpa = latestRow?.gpa_current ?? null
  const riskScore = data?.risk_score ?? null
  const numFailed = latestRow?.num_failed ?? null
  const riskLabelVi = formatRiskLabelVi(data?.risk_label)

  const gpaColor = currentGpa == null ? '#6B7280' : currentGpa >= 3.2 ? '#12B76A' : currentGpa >= 2.0 ? '#FB6514' : '#E02020'
  const riskBarColor = riskScore == null ? '#12B76A' : riskScore >= 0.7 ? '#E02020' : riskScore >= 0.4 ? '#FB6514' : '#12B76A'
  const riskBadgeClass = riskLabelVi === 'Cao'
    ? 'bg-red-50 text-red-700 border border-red-200'
    : riskLabelVi === 'Trung bình'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : riskLabelVi === 'Thấp'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-gray-50 text-gray-500 border border-gray-200'
  const riskDescription = riskLabelVi === 'Cao' ? 'Hãy liên hệ cố vấn ngay'
    : riskLabelVi === 'Trung bình' ? 'Nên gặp cố vấn sớm'
      : riskLabelVi === 'Thấp' ? 'Tiếp tục phát huy'
        : 'Chưa có dữ liệu đánh giá'

  const displayName = user?.profile?.full_name || user?.username || '—'
  const avatarInitials = displayName.split(' ').filter(Boolean).slice(-2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')
  const activeTermLabel = activeTerm?.term_name || activeTerm?.term_code || '—'
  const departmentLabel = advisorData?.advisor_class?.department_display || null
  const majorLabel = advisorData?.advisor_class?.major_display || null

  return (
    <>
      <PageMeta title="Dashboard sinh viên | Advisor" description="Rủi ro, học tập, cảm xúc" />

      {loading && !data ? <LoadingSkeleton /> : (
        <div className="space-y-6">

          {/* VÙNG 1 — Profile Card */}
          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-[#F0F0F0] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
            style={{ borderLeft: '4px solid #E02020' }}>
            {user?.profile?.avatar_url ? (
              <img src={user.profile.avatar_url} alt={displayName}
                className="size-16 shrink-0 rounded-full object-cover ring-2 ring-[#F0F0F0]" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white select-none"
                style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}>
                {avatarInitials || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-xl font-bold text-[#111111]">{displayName}</h1>
                <span className="inline-flex items-center rounded-full bg-[#FFF0F0] px-3 py-0.5 text-xs font-semibold text-[#E02020]">
                  Sinh viên
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#444444]">
                <CalenderIcon className="size-4 shrink-0 text-[#6B7280]" />
                <span>Học kỳ hiện tại: <span className="font-semibold text-[#111111]">{activeTermLabel}</span></span>
              </div>
              {(departmentLabel || majorLabel) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280]">
                  <span>Ngành: <span className="font-medium text-[#444444]">{majorLabel || '—'}</span></span>
                  <span>Khoa: <span className="font-medium text-[#444444]">{departmentLabel || '—'}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* VÙNG 2 — 4 KPI Cards — căn giữa */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* Card 1 — GPA */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#F0F0F0] bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">GPA Hiện Tại</p>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="tabular-nums leading-none" style={{ fontSize: '2.5rem', fontWeight: 800, color: gpaColor }}>
                  {currentGpa != null ? currentGpa.toFixed(2) : '—'}
                </span>
                {currentGpa != null && <span className="text-base font-semibold text-[#6B7280]">/ 4.0</span>}
              </div>
            </div>

            {/* Card 2 — Số Môn Trượt */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#F0F0F0] bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Số Môn Trượt</p>
              <span className="tabular-nums leading-none" style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: numFailed == null ? '#6B7280' : numFailed === 0 ? '#12B76A' : numFailed <= 2 ? '#FB6514' : '#E02020',
              }}>
                {numFailed ?? '—'}
              </span>
              <p className="mt-3 text-xs text-[#6B7280]">
                {numFailed == null ? 'Chưa có dữ liệu' : numFailed === 0 ? 'Tốt lắm, giữ vững nhé!' : numFailed <= 2 ? 'Hãy ôn tập thêm' : 'Nên gặp cố vấn sớm'}
              </p>
            </div>

            {/* Card 3 — Điểm Rủi Ro */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#F0F0F0] bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Điểm Rủi Ro (0–1)</p>
              <p className="tabular-nums leading-none" style={{ fontSize: '2.5rem', fontWeight: 800, color: riskBarColor }}>
                {riskScore != null ? riskScore.toFixed(3) : '—'}
              </p>
              <div className="mt-4 h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-[#F0F0F0]">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: riskScore != null ? `${Math.min(riskScore * 100, 100)}%` : '0%', backgroundColor: riskBarColor }} />
              </div>
            </div>

            {/* Card 4 — Mức Rủi Ro */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#F0F0F0] bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mức Rủi Ro</p>
              <span className={`inline-flex items-center rounded-full px-5 py-2 text-xl font-bold ${riskBadgeClass}`}>
                {riskLabelVi}
              </span>
              <p className="mt-3 text-xs text-[#6B7280]">{riskDescription}</p>
            </div>
          </div>

          {/* HÀNG 3 — 2 biểu đồ cạnh nhau */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* Biểu đồ GPA */}
            <div className="rounded-2xl border border-[#F0F0F0] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <h2 className="mb-3 text-base font-bold text-[#111111]">Biểu đồ GPA</h2>
              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#444444]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E02020]" />
                  GPA hiện tại
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5" style={{ borderTop: '2px dashed #9CA3AF' }} />
                  GPA kỳ trước
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5" style={{ borderTop: '2px dashed #FB6514' }} />
                  Ngưỡng cảnh báo (2.0)
                </span>
              </div>
              {sortedAscRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <CalenderIcon className="size-12 text-gray-300" />
                  <p className="text-sm text-[#6B7280]">Chưa có dữ liệu học tập. Hãy nộp dữ liệu đầu tiên.</p>
                </div>
              ) : (
                <Chart options={gpaChartOptions} series={gpaChartSeries} type="line" height={300} />
              )}
            </div>

            {/* Biểu đồ cảm xúc */}
            <div className="rounded-2xl border border-[#F0F0F0] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <h2 className="mb-3 text-base font-bold text-[#111111]">Biểu đồ cảm xúc phản hồi</h2>
              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#444444]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7C3AED]" />
                  Điểm cảm xúc
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5" style={{ borderTop: '2px dashed #12B76A' }} />
                  Ngưỡng tích cực (0.33)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5" style={{ borderTop: '2px dashed #E02020' }} />
                  Ngưỡng tiêu cực (-0.33)
                </span>
              </div>
              {sortedAscRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <ChatIcon className="size-12 text-gray-300" />
                  <p className="text-sm text-[#6B7280]">Chưa có dữ liệu cảm xúc. Hãy gửi phản hồi đầu tiên.</p>
                </div>
              ) : (
                <Chart options={sentimentChartOptions} series={sentimentChartSeries} type="area" height={300} />
              )}
            </div>
          </div>

          {/* HÀNG 4 — Bảng lịch sử học tập */}
          <div className="rounded-2xl border border-[#F0F0F0] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-[#111111]">
                <TimeIcon className="size-5 shrink-0 text-[#6B7280]" />
                Lịch sử học tập gần đây
              </h2>
              <Link
                to="/student/academic"
                className="flex items-center gap-1 text-sm font-semibold text-[#E02020] transition-colors hover:text-[#B01818]"
              >
                Xem tất cả <ArrowRightIcon className="size-4 shrink-0" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6B7280]">Học kỳ</TableCell>
                    {['GPA Hiện tại', 'GPA trước', 'Tỉ lệ tham dự', 'Môn trượt', 'Cảm xúc'].map(h => (
                      <TableCell key={h} isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#6B7280]">{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDescRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <CalenderIcon className="size-12 text-gray-300" />
                          <p className="text-sm text-[#6B7280]">Chưa có dữ liệu học tập. Hãy nộp dữ liệu đầu tiên.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedDescRows.slice(0, 3).map((row, idx) => {
                      const gpa = row.gpa_current
                      const gpaColor2 = gpa == null ? 'text-[#6B7280]' : gpa >= 3.2 ? 'text-[#12B76A]' : gpa >= 2.0 ? 'text-[#FB6514]' : 'text-[#E02020]'
                      const s = row.sentiment_score
                      const sColor = s == null ? 'text-[#6B7280]' : s > 0.33 ? 'text-[#12B76A]' : s < -0.33 ? 'text-[#E02020]' : 'text-[#FB6514]'
                      return (
                        <TableRow key={`${row.recorded_at ?? ''}-${idx}`}
                          className="border-b border-[#F0F0F0] transition-colors hover:bg-[#F9FAFB]">
                          <TableCell className="px-4 py-3 font-medium text-[#111111]">{termLabel(row)}</TableCell>
                          <TableCell className={`px-4 py-3 text-center tabular-nums font-semibold ${gpaColor2}`}>
                            {gpa != null ? gpa.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center tabular-nums text-[#444444]">
                            {row.gpa_prev_sem != null ? row.gpa_prev_sem.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center tabular-nums text-[#444444]">
                            {row.attendance_rate != null ? `${(Number(row.attendance_rate) * 100).toFixed(0)}%` : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center tabular-nums text-[#444444]">
                            {row.num_failed ?? '—'}
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center tabular-nums font-semibold ${sColor}`}>
                            {s != null ? s.toFixed(2) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </div>
      )}
    </>
  )
}
