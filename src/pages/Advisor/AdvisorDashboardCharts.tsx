import type { ReactNode } from 'react'
import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { AlertIcon, BoltIcon, GridIcon, MailIcon, PieChartIcon } from '@/icons'

export type AlertOpenRow = {
  _id?: string
  alert_type?: string
  severity?: string
  status?: string
  detected_at?: string
  student_user_id?: string
}

export type AlertCards = {
  risk_open?: number
  sentiment_open?: number
  anomaly_open?: number
}

type StudentRowLite = {
  risk_label?: number | string | null
}

type Props = {
  studentTable: StudentRowLite[]
  alertCards: AlertCards | null
  riskAlerts: AlertOpenRow[]
  sentimentAlerts: AlertOpenRow[]
  anomalyAlerts: AlertOpenRow[]
  paginationTotal: number
  unreadNotifications: number
  noAdvisorClass: boolean
}

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#f97316']

function countBySeverity(alerts: AlertOpenRow[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const a of alerts) {
    const s = a.severity ?? 'UNKNOWN'
    m[s] = (m[s] ?? 0) + 1
  }
  return m
}

function colorForSeverity(severity: string): string {
  const key = severity.toUpperCase()
  if (key === 'HIGH' || key === 'CRITICAL') return '#dc2626'
  if (key === 'MEDIUM' || key === 'MODERATE') return '#eab308'
  if (key === 'LOW') return '#22c55e'
  return '#6366f1'
}

function countRiskLabels(rows: StudentRowLite[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    let key: string
    if (r.risk_label === null || r.risk_label === undefined) {
      key = 'Chưa có'
    } else {
      const val = String(r.risk_label)
      if (val === '-1') key = 'High'
      else if (val === '0') key = 'Medium'
      else if (val === '1') key = 'Low'
      else key = val
    }
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return m
}

function colorForLabel(label: string): string {
  if (label === 'High') return '#dc2626'
  if (label === 'Medium') return '#eab308'
  if (label === 'Low') return '#22c55e'
  return '#9ca3af'
}

export default function AdvisorDashboardCharts({
  studentTable,
  alertCards,
  riskAlerts,
  sentimentAlerts,
  anomalyAlerts,
  paginationTotal,
  unreadNotifications,
  noAdvisorClass,
}: Props) {
  const riskOpen = alertCards?.risk_open ?? 0
  const sentimentOpen = alertCards?.sentiment_open ?? 0
  const anomalyOpen = alertCards?.anomaly_open ?? 0
  const totalOpenAlerts = riskOpen + sentimentOpen + anomalyOpen

  const severityMerged = useMemo(
    () => [...riskAlerts, ...sentimentAlerts, ...anomalyAlerts],
    [riskAlerts, sentimentAlerts, anomalyAlerts]
  )
  const severityCounts = useMemo(() => countBySeverity(severityMerged), [severityMerged])
  const severityCategories = useMemo(
    () => Object.keys(severityCounts).sort(),
    [severityCounts]
  )
  const severityColors = useMemo(
    () => severityCategories.map(colorForSeverity),
    [severityCategories]
  )
  const severitySeries = useMemo(
    () => severityCategories.map(c => severityCounts[c] ?? 0),
    [severityCategories, severityCounts]
  )

  const labelMap = useMemo(() => countRiskLabels(studentTable), [studentTable])
  const labelCategories = useMemo(() => {
    const keys = Array.from(labelMap.keys())
    const order = ['Chưa có', 'High', 'Medium', 'Low']
    const rest = keys.filter(k => !order.includes(k)).sort()
    return [...order.filter(k => keys.includes(k)), ...rest]
  }, [labelMap])
  const labelColors = useMemo(
    () => labelCategories.map(colorForLabel),
    [labelCategories]
  )
  const labelSeries = useMemo(
    () => [{ name: 'Sinh viên', data: labelCategories.map(c => labelMap.get(c) ?? 0) }],
    [labelCategories, labelMap]
  )

  const donutOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'donut',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      labels: ['Cảnh báo RISK', 'Cảnh báo SENTIMENT', 'Cảnh báo ANOMALY'],
      colors: DONUT_COLORS,
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: '#64748b' },
      },
      dataLabels: { 
        enabled: true,
        style: { 
          fontSize: '14px',
          fontWeight: 700,
          colors: ['#ffffff', '#ffffff', '#ffffff'],
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Tổng cảnh báo',
                formatter: () => String(totalOpenAlerts),
              },
            },
          },
        },
      },
      stroke: { show: false },
    }),
    [totalOpenAlerts]
  )

  const donutSeries = useMemo(() => [riskOpen, sentimentOpen, anomalyOpen], [riskOpen, sentimentOpen, anomalyOpen])

  const barSeverityOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: severityColors.length ? severityColors : ['#6366f1'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: severityCategories.length ? severityCategories : ['—'],
        labels: { style: { fontSize: '11px', colors: '#64748b' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
      },
      tooltip: { y: { formatter: (val: number) => `${val} bản ghi` } },
      legend: { show: false },
    }),
    [severityCategories]
  )

  const barSeveritySeries = useMemo(
    () => [
      {
        name: 'Cảnh báo',
        data:
          severitySeries.length > 0
            ? severitySeries
            : [0],
      },
    ],
    [severitySeries]
  )

  const barLabelOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: labelColors.length ? labelColors : ['#6366f1'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labelCategories.length ? labelCategories : ['—'],
        labels: { style: { fontSize: '11px', colors: '#64748b' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
      },
      tooltip: { y: { formatter: (val: number) => `${val} SV` } },
      legend: { show: false },
    }),
    [labelCategories, labelColors]
  )

  if (noAdvisorClass) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-gray-300/90 bg-white/80 p-8 text-center text-sm leading-relaxed text-gray-600 shadow-theme-sm dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        Chưa có lớp cố vấn ACTIVE — không có thống kê. Liên hệ ADMIN để gán lớp.
      </div>
    )
  }

  const hasDonutData = riskOpen > 0 || sentimentOpen > 0
  const hasSeverityData = severityMerged.length > 0
  const hasLabelData = studentTable.length > 0

  const chartCardClass =
    'group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_8px_30px_-10px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.03] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200/60 hover:shadow-[0_16px_40px_-12px_rgba(70,95,255,0.18)] dark:border-gray-800 dark:bg-gray-900/50 dark:ring-white/[0.04] dark:hover:border-brand-500/25 dark:hover:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.65)] sm:p-6'

  return (
    <div className="mb-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6 xl:gap-5">
        <div className="sm:col-span-2 xl:col-span-2">
          <Kpi
            featured
            title="Sinh viên lớp cố vấn"
            value={paginationTotal}
            accent="default"
            icon={<GridIcon className="size-6 opacity-90" />}
          />
        </div>
        <div className="xl:col-span-1">
          <Kpi title="Cảnh báo RISK đang mở" value={riskOpen} accent="danger" icon={<AlertIcon className="size-5" />} />
        </div>
        <div className="xl:col-span-1">
          <Kpi title="SENTIMENT đang mở" value={sentimentOpen} accent="warn" icon={<BoltIcon className="size-5" />} />
        </div>
        <div className="xl:col-span-1">
          <Kpi title="ANOMALY đang mở" value={anomalyOpen} accent="warn" icon={<PieChartIcon className="size-5" />} />
        </div>
        <div className="xl:col-span-1">
          <Kpi title="Thông báo chưa đọc" value={unreadNotifications} accent="default" icon={<MailIcon className="size-5" />} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className={chartCardClass}>
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/12 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <PieChartIcon className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white/90">
                Cảnh báo đang mở theo loại
              </h3>
              <p className="mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
            </div>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            Từ trường <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-gray-800 ring-1 ring-gray-200/80 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10">alert_cards</code> trên API — RISK vs SENTIMENT vs ANOMALY.
          </p>
          {hasDonutData ? (
            <Chart options={donutOptions} series={donutSeries} type="donut" height={300} />
          ) : (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Không có cảnh báo OPEN loại RISK/SENTIMENT/ANOMALY cho sinh viên lớp bạn.
            </p>
          )}
        </div>

        <div className={chartCardClass}>
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <BoltIcon className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white/90">
                Mức độ nghiêm trọng (cảnh báo mở)
              </h3>
              <p className="mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
            </div>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            Gộp{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-800 dark:bg-white/10 dark:text-gray-200">risk_alerts</code>,{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-800 dark:bg-white/10 dark:text-gray-200">sentiment_alerts</code> và{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-800 dark:bg-white/10 dark:text-gray-200">anomaly_alerts</code>{' '}
            (tối đa 20 mỗi loại từ API).
          </p>
          {hasSeverityData ? (
            <Chart options={barSeverityOptions} series={barSeveritySeries} type="bar" height={300} />
          ) : (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Chưa có bản ghi cảnh báo mở để thống kê mức độ.
            </p>
          )}
        </div>
      </div>

      <div className={chartCardClass}>
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <GridIcon className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white/90">
              Phân bố nhãn rủi ro (sinh viên lớp)
            </h3>
            <p className="mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-brand-500" />
          </div>
        </div>
        <p className="mb-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          Đếm theo trường <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-800 dark:bg-white/10 dark:text-gray-200">risk_label</code> trên danh sách sinh viên hiện tại.
        </p>
        {hasLabelData ? (
          <Chart options={barLabelOptions} series={labelSeries} type="bar" height={300} />
        ) : (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            Chưa có sinh viên trong lớp cố vấn để thống kê nhãn.
          </p>
        )}
      </div>
    </div>
  )
}

function Kpi({
  title,
  value,
  accent,
  featured,
  icon,
}: {
  title: string
  value: string | number
  accent: 'default' | 'muted' | 'warn' | 'danger'
  featured?: boolean
  icon?: ReactNode
}) {
  const valueClass =
    accent === 'warn'
      ? 'text-amber-700 dark:text-amber-400'
      : accent === 'danger'
        ? 'text-red-600 dark:text-red-400'
        : accent === 'muted'
          ? 'text-gray-500 dark:text-gray-400'
          : 'text-gray-900 dark:text-white'

  const shell = featured
    ? 'border-brand-200/70 bg-gradient-to-br from-brand-50 via-white to-violet-50/50 shadow-[0_12px_36px_-10px_rgba(70,95,255,0.28)] ring-1 ring-brand-500/15 dark:border-brand-500/25 dark:from-brand-950/60 dark:via-gray-900 dark:to-violet-950/40 dark:ring-brand-400/10'
    : 'border-gray-200/90 bg-white shadow-[0_6px_24px_-8px_rgba(15,23,42,0.08)] ring-1 ring-gray-900/[0.03] dark:border-gray-800 dark:bg-gray-900/45 dark:ring-white/[0.04]'

  return (
    <div
      className={`group relative h-full min-h-[108px] overflow-hidden rounded-2xl border p-5 transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] ${shell}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          accent === 'danger'
            ? 'bg-gradient-to-r from-red-500 to-red-600'
            : accent === 'warn'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500'
              : 'bg-gradient-to-r from-brand-500 to-violet-500'
        }`}
        aria-hidden
      />
      {icon ? (
        <div
          className="absolute right-3 top-9 text-gray-300 opacity-40 transition-opacity duration-300 group-hover:opacity-70 dark:text-gray-600 [&>svg]:size-8"
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <p className="relative pr-10 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p
        className={`relative mt-2 tabular-nums tracking-tight ${featured ? 'text-3xl font-extrabold sm:text-4xl' : 'text-2xl font-bold sm:text-3xl'} ${valueClass}`}
      >
        {value}
      </p>
    </div>
  )
}
