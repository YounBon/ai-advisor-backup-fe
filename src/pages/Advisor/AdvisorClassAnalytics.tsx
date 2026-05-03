import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'

export type AdvisorClassAnalytics = {
  totals: {
    members: number
    with_prediction: number
    without_prediction: number
    high_risk_count: number
    avg_risk_score: number
    negative_feedback_students_30d: number
  }
  risk_label_breakdown: { risk_label: number; count: number }[]
  notifications_by_type_30d: { type: string; count: number }[]
}

type Props = {
  analytics: AdvisorClassAnalytics | null
  /** true khi API trả về null (chưa có lớp cố vấn) */
  noAdvisorClass: boolean
  appliedThreshold: number
}

const BAR_COLORS = ['#94a3b8', '#22c55e', '#f97316']
const DONUT_COLORS = ['#465fff', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

export default function AdvisorClassAnalytics({
  analytics,
  noAdvisorClass,
  appliedThreshold,
}: Props) {
  const breakdownMap = useMemo(() => {
    const m = new Map<number, number>()
    analytics?.risk_label_breakdown?.forEach(r => m.set(r.risk_label, r.count))
    return m
  }, [analytics])

  const riskBarOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: BAR_COLORS,
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: ['Chưa có dự báo', 'Nhãn rủi ro 0', 'Nhãn rủi ro 1'],
        labels: {
          style: { fontSize: '11px', colors: '#64748b' },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (val: number) => `${Math.round(val)}`,
          style: { colors: '#64748b' },
        },
        title: { text: 'Số sinh viên' },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        y: { formatter: (val: number) => `${val} SV` },
      },
      legend: { show: false },
    }),
    []
  )

  const riskBarSeries = useMemo(() => {
    const t = analytics?.totals
    const c0 = breakdownMap.get(0) ?? 0
    const c1 = breakdownMap.get(1) ?? 0
    const noPred = t?.without_prediction ?? 0
    return [{ name: 'Sinh viên', data: [noPred, c0, c1] }]
  }, [analytics, breakdownMap])

  const notifItems = useMemo(
    () => analytics?.notifications_by_type_30d ?? [],
    [analytics]
  )
  const donutOptions = useMemo<ApexOptions>(() => {
    const labels = notifItems.map(n => n.type ?? '—')
    return {
      chart: {
        type: 'donut',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      labels,
      colors: DONUT_COLORS.slice(0, Math.max(labels.length, 1)),
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: '#64748b' },
      },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Tổng 30 ngày',
                formatter: () =>
                  `${notifItems.reduce((s, x) => s + (x.count ?? 0), 0)}`,
              },
            },
          },
        },
      },
      stroke: { show: false },
    }
  }, [notifItems])

  const donutSeries = useMemo(
    () => notifItems.map(n => n.count ?? 0),
    [notifItems]
  )

  if (noAdvisorClass) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400">
        Chưa có lớp cố vấn ACTIVE — không có thống kê lớp. Liên hệ ADMIN để gán lớp.
      </div>
    )
  }

  if (!analytics) return null

  const t = analytics.totals

  if (t.members === 0) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Lớp cố vấn chưa có thành viên ACTIVE — biểu đồ sẽ hiển thị khi có sinh viên.
        </p>
      </div>
    )
  }

  const hasNotif = donutSeries.some(c => c > 0)

  return (
    <div className="mb-6 space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Thống kê trên <strong>toàn bộ</strong> sinh viên trong lớp cố vấn (không phụ thuộc phân trang bảng).
        Ngưỡng &quot;rủi ro cao&quot; trên KPI: <code className="text-xs">{appliedThreshold}</code>.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi title="Tổng SV trong lớp" value={t.members} accent="default" />
        <Kpi title="Đã có dự báo" value={t.with_prediction} accent="default" />
        <Kpi title="Chưa có dự báo" value={t.without_prediction} accent="muted" />
        <Kpi title="Điểm rủi ro TB" value={t.avg_risk_score.toFixed(4)} accent="default" />
        <Kpi
          title={`SV ≥ ngưỡng (${appliedThreshold})`}
          value={t.high_risk_count}
          accent="warn"
        />
        <Kpi
          title="SV phản hồi tiêu cực (30 ngày)"
          value={t.negative_feedback_students_30d}
          accent="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
            Phân bố dự báo rủi ro
          </h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            So sánh sinh viên chưa có bản ghi dự báo mới nhất với nhãn 0 / 1 (theo mô hình).
          </p>
          <Chart options={riskBarOptions} series={riskBarSeries} type="bar" height={300} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
            Thông báo gửi cố vấn (30 ngày)
          </h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Gom theo loại notification — giúp thấy tần suất RISK / SENTIMENT / khác.
          </p>
          {hasNotif ? (
            <Chart options={donutOptions} series={donutSeries} type="donut" height={300} />
          ) : (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Chưa có thông báo trong 30 ngày gần đây.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({
  title,
  value,
  accent,
}: {
  title: string
  value: string | number
  accent: 'default' | 'muted' | 'warn' | 'danger'
}) {
  const valueClass =
    accent === 'warn'
      ? 'text-amber-700 dark:text-amber-400'
      : accent === 'danger'
        ? 'text-red-600 dark:text-red-400'
        : accent === 'muted'
          ? 'text-gray-500 dark:text-gray-400'
          : 'text-gray-800 dark:text-white/90'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}
