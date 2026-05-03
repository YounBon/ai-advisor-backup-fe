import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// import { Link } from 'react-router'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { toast } from 'sonner'
import { Users, Gauge, AlertTriangle, ClipboardList } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import { dashboardService } from '@/services/DashboardService'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'
import { useTheme } from '@/context/ThemeContext'

type DepartmentItem = {
  _id: string
  department_code: string
  department_name: string
}

type RiskDistRow = { _id: string | null; count: number }
type AnomalyRow = {
  _id: { alert_type?: string; severity?: string }
  count: number
}

type FacultyDashboardData = {
  department_id: string | null
  kpi: {
    total_students: number
    avg_risk_score: number
    high_risk_students: number
    total_predictions: number
  }
  risk_distribution: RiskDistRow[]
  anomaly_summary: AnomalyRow[]
}

const RISK_LABEL_COLORS: Record<string, string> = {
  LOW: '#10b981',        // Xanh lá - An toàn
  MEDIUM: '#f59e0b',     // Vàng - Cảnh báo
  HIGH: '#ef4444',       // Đỏ - Nghiêm trọng
  UNKNOWN: '#6b7280',    // Xám - Không xác định
}

function colorForRiskSlice(label: string): string {
  const key = label.toUpperCase().replace(/\s+/g, '_')
  return RISK_LABEL_COLORS[key] ?? RISK_LABEL_COLORS.UNKNOWN
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

export default function Home() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = usePrefersReducedMotion()
  const user = useAuthStore(s => s.user)
  const canAccess = user?.role === 'ADMIN' || user?.role === 'FACULTY'

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FacultyDashboardData | null>(null)
  const [deptPicklist, setDeptPicklist] = useState<DepartmentItem[]>([])
  const [deptChoice, setDeptChoice] = useState('__all__')
  const [riskThreshold, setRiskThreshold] = useState('0.7')
  const riskThresholdRef = useRef(riskThreshold)
  riskThresholdRef.current = riskThreshold

  const loadDepartments = useCallback(async () => {
    try {
      const res = await masterDataService.getDepartmentsList({ page: 1, limit: 99 })
      const d = res.data as { items: DepartmentItem[] }
      setDeptPicklist(d.items ?? [])
    } catch {
      toast.error('Không tải được danh sách khoa')
    }
  }, [])

  const fetchDashboard = useCallback(async () => {
    if (!canAccess) return
    const thr = Number(riskThresholdRef.current)
    if (Number.isNaN(thr) || thr < 0 || thr > 1) {
      toast.error('Ngưỡng rủi ro phải từ 0 đến 1')
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = { risk_threshold: thr }
      if (deptChoice && deptChoice !== '__all__') body.department_id = deptChoice
      const res = await dashboardService.getFacultyDashboard(body)
      setData(res.data as FacultyDashboardData)
    } catch {
      toast.error('Không tải được dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [canAccess, deptChoice])

  useEffect(() => {
    if (canAccess) void loadDepartments()
  }, [canAccess, loadDepartments])

  useEffect(() => {
    if (canAccess) void fetchDashboard()
  }, [canAccess, fetchDashboard])

  const deptOptions = [
    { value: '__all__', label: 'Toàn hệ thống (tất cả khoa)' },
    ...deptPicklist.map(d => ({
      value: d._id,
      label: `${d.department_code} — ${d.department_name}`,
    })),
  ]

  const foreColor = isDark ? '#e2e8f0' : '#0f172a'
  const gridColor = isDark ? '#334155' : '#e2e8f0'

  const pieLabels = useMemo(
    () => (data?.risk_distribution ?? []).map(r => {
      const rawValue = r._id
      // Convert to string for comparison (handle both numeric and string)
      const strValue = String(rawValue ?? '')
      
      if (strValue === '-1') return 'HIGH'
      if (strValue === '0') return 'MEDIUM'
      if (strValue === '1') return 'LOW'
      if (!rawValue) return 'UNKNOWN'
      return strValue
    }),
    [data?.risk_distribution]
  )
  const pieSeries = useMemo(
    () => (data?.risk_distribution ?? []).map(r => r.count),
    [data?.risk_distribution]
  )
  const pieColors = useMemo(() => pieLabels.map(colorForRiskSlice), [pieLabels])

  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'donut',
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: !reduceMotion },
      },
      labels: pieLabels,
      colors: pieColors.length ? pieColors : ['#94a3b8'],
      theme: { mode: isDark ? 'dark' : 'light' },
      legend: {
        position: 'bottom',
        fontSize: '13px',
        labels: { colors: foreColor },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              name: { color: foreColor },
              value: { color: foreColor, fontSize: '22px', fontWeight: 600 },
              total: {
                show: true,
                label: 'Tổng SV (dự báo)',
                color: isDark ? '#94a3b8' : '#64748b',
                formatter: () => String(pieSeries.reduce((a, b) => a + b, 0)),
              },
            },
          },
        },
      },
      stroke: { width: 2, colors: isDark ? ['#0f172a'] : ['#fff'] },
      dataLabels: { enabled: false },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        y: { formatter: (val: number) => `${val} sinh viên` },
      },
    }),
    [pieLabels, pieColors, pieSeries, foreColor, isDark, reduceMotion]
  )

  const anomalyCategories = useMemo(
    () =>
      (data?.anomaly_summary ?? []).map(
        r => {
          const alertType = r._id?.alert_type ?? 'UNKNOWN'
          const severity = r._id?.severity ?? '—'
          
          // Map alert type to Vietnamese
          const typeLabel = 
            alertType === 'RISK' ? 'Rủi ro' :
            alertType === 'SENTIMENT' ? 'Cảm xúc' :
            alertType === 'ANOMALY' ? 'Bất thường' :
            alertType
          
          // Map severity to Vietnamese
          const sevLabel =
            severity === 'HIGH' ? 'Cao' :
            severity === 'MEDIUM' ? 'Trung bình' :
            severity === 'LOW' ? 'Thấp' :
            severity
          
          return `${typeLabel} - ${sevLabel}`
        }
      ),
    [data?.anomaly_summary]
  )
  const anomalyCounts = useMemo(
    () => (data?.anomaly_summary ?? []).map(r => r.count),
    [data?.anomaly_summary]
  )

  // Colors based on alert type
  const anomalyColors = useMemo(
    () => (data?.anomaly_summary ?? []).map(r => {
      const alertType = r._id?.alert_type ?? 'UNKNOWN'
      const severity = r._id?.severity ?? 'LOW'
      
      // Base color by alert type
      const baseColor = 
        alertType === 'RISK' ? '#ef4444' : // Red
        alertType === 'SENTIMENT' ? '#8b5cf6' : // Purple
        alertType === 'ANOMALY' ? '#f97316' : // Orange
        '#6b7280' // Gray
      
      // Adjust opacity by severity
      if (severity === 'HIGH') return baseColor
      if (severity === 'MEDIUM') return baseColor + 'cc' // 80% opacity
      return baseColor + '99' // 60% opacity
    }),
    [data?.anomaly_summary]
  )

  const barOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: !reduceMotion },
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      plotOptions: {
        bar: {
          horizontal: false, // Đổi thành cột dọc
          borderRadius: 6,
          columnWidth: '60%',
          distributed: true,
        },
      },
      colors: anomalyColors.length ? anomalyColors : ['#94a3b8'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          if (val == null || Number.isNaN(val)) return '0'
          return String(Math.round(val))
        },
        style: { 
          fontSize: '12px',
          fontWeight: 600,
          colors: [isDark ? '#f1f5f9' : '#0f172a'],
        },
        offsetY: -10,
      },
      xaxis: {
        categories: anomalyCategories,
        labels: { 
          style: { colors: foreColor, fontSize: '11px' },
          rotate: -45,
          rotateAlways: false,
          trim: true,
        },
        axisBorder: { color: gridColor },
      },
      yaxis: {
        labels: {
          style: { colors: foreColor, fontSize: '12px' },
          formatter: (val: number) => {
            if (val == null || Number.isNaN(val)) return '0'
            return String(Math.round(val))
          },
        },
        tickAmount: 5,
      },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      legend: { show: false },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        y: { 
          formatter: (val: number) => {
            if (val == null || Number.isNaN(val)) return '0 cảnh báo'
            return `${Math.round(val)} cảnh báo`
          },
        },
      },
    }),
    [anomalyCategories, anomalyColors, foreColor, gridColor, isDark, reduceMotion]
  )

  const kpi = data?.kpi

  if (!canAccess) {
    return (
      <>
        <PageMeta title="Dashboard | Advisor" description="ADMIN / FACULTY" />
        <PageBreadcrumb pageTitle="Tổng quan" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Chỉ <strong>ADMIN</strong> hoặc <strong>FACULTY</strong> mới xem được trang này.
        </p>
      </>
    )
  }

  return (
    <>
      <PageMeta
        title="Tổng quan hệ thống | Advisor"
        description="Dashboard ADMIN — POST /api/dashboard/faculty"
      />
      <PageBreadcrumb pageTitle="Tổng quan" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-colors dark:border-gray-800 dark:bg-white/3 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white/90 md:text-xl">
              Bảng điều khiển
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Dữ liệu rủi ro và cảnh báo tổng hợp (dự báo mới nhất theo sinh viên) 
              {/* <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                API:{' '} POST /dashboard/faculty
              </code> */}
              .
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 cursor-pointer"
            onClick={() => void fetchDashboard()}
            disabled={loading}
          >
            {loading ? 'Đang tải…' : 'Làm mới dữ liệu'}
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[220px] flex-1">
            <Label>Phạm vi khoa</Label>
            <Select
              key={`home-dept-${deptPicklist.length}-${deptChoice}`}
              options={deptOptions}
              placeholder="Chọn khoa"
              onChange={setDeptChoice}
              defaultValue={deptChoice}
            />
          </div>
          <div className="w-full min-w-[140px] sm:w-44">
            <Label htmlFor="home-risk">Ngưỡng &quot;rủi ro cao&quot;</Label>
            <InputField
              id="home-risk"
              type="number"
              step={0.05}
              min="0"
              max="1"
              value={riskThreshold}
              onChange={e => setRiskThreshold(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Giá trị 0–1 (mặc định 0,7).</p>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải dashboard…</p>
        </div>
      ) : kpi ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group cursor-default rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tổng sinh viên
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <Users className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-900 dark:text-white/90">
                {kpi.total_students}
              </p>
            </div>
            <div className="group cursor-default rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Điểm rủi ro TB
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                  <Gauge className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-900 dark:text-white/90">
                {Number(kpi.avg_risk_score).toFixed(3)}
              </p>
            </div>
            <div className="group cursor-default rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-shadow hover:shadow-md dark:border-amber-900/20 dark:bg-white/3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  SV vượt ngưỡng
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-amber-800 dark:text-amber-400">
                {kpi.high_risk_students}
              </p>
            </div>
            <div className="group cursor-default rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Bản ghi dự báo (mới nhất)
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-900 dark:text-white/90">
                {kpi.total_predictions}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/3 md:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
                 Phân bố nhãn rủi ro (Risk)
             </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Số sinh viên theo nhãn dự báo mới nhất.
              </p>
              <div className="mt-4 min-h-[300px]">
                {pieSeries.length > 0 && pieSeries.some(c => c > 0) ? (
                  <Chart options={donutOptions} series={pieSeries} type="donut" height={320} />
                ) : (
                  <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Chưa có dữ liệu phân bố rủi ro.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/3 md:p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
                 Phân bổ cảnh báo theo loại &amp; mức độ
             </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                 Tổng hợp tất cả cảnh báo (Alert) theo loại (Rủi ro / Cảm xúc / Bất thường) và mức độ nghiêm trọng.
             </p>
              <div className="mt-4 min-h-[300px]">
                {anomalyCategories.length > 0 ? (
                  <Chart
                    options={barOptions}
                    series={[{ name: 'Số lượng', data: anomalyCounts }]}
                    type="bar"
                    height={Math.max(320, anomalyCategories.length * 36)}
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Chưa có cảnh báo trong phạm vi này.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* <p className="text-center text-xs text-gray-500 dark:text-gray-500">
            Cần bảng chi tiết? Mở mục{' '}
            <Link
              to="/faculty-dashboard"
              className="cursor-pointer font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
            >
              Dashboard đơn vị
            </Link>
            .
          </p> */}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Không có dữ liệu.</p>
      )}
    </>
  )
}
