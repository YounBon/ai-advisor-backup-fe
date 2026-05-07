import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { GridIcon } from '@/icons'

// ─── Kiểu dữ liệu export ─────────────────────────────────────────────────────

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

export type AlertHistoryItem = {
  term_id?: string
  term_code?: string
  term_name?: string
  start_date?: string | null
  risk_count?: number
  sentiment_count?: number
  anomaly_count?: number
  high_severity_count?: number
}

type StudentRowLite = {
  risk_label?: number | string | null
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  studentTable: StudentRowLite[]
  alertCards: AlertCards | null
  alertHistory: AlertHistoryItem[]
  paginationTotal: number
  unreadNotifications: number
  noAdvisorClass: boolean
  activeTerm: string | null
  classLabel: string | null
}

const C_RED = '#E02020'
const C_YELLOW = '#eab308'
const C_ORANGE = '#f97316'
const C_HIGH = '#dc2626'

// ─── Helper tạo options biểu đồ cột lịch sử ─────────────────────────────────

function makeBarOptions(termLabels: string[], color: string, legendLabel: string): ApexOptions {
  return {
    chart: {
      type: 'bar',
      fontFamily: "'Be Vietnam Pro', sans-serif",
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, speed: 350 },
    },
    colors: [color],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: termLabels.length <= 2 ? '32%' : '55%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -16,
      style: { fontSize: '11px', fontWeight: 600, colors: ['#374151'] },
      formatter: (val: number) => (val > 0 ? String(val) : ''),
    },
    xaxis: {
      categories: termLabels.length ? termLabels : ['—'],
      labels: {
        style: { fontSize: '11px', colors: '#6b7280' },
        rotate: -15,
        trim: true,
        maxHeight: 56,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: {
        text: 'Số sinh viên',
        style: { fontSize: '11px', color: '#9ca3af', fontWeight: 400 },
      },
      labels: {
        style: { fontSize: '11px', colors: '#9ca3af' },
        formatter: (v: number) => String(Math.round(v)),
      },
      min: 0,
    },
    grid: {
      borderColor: '#F0F0F0',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: '#374151' },
      markers: { size: 8 },
      customLegendItems: [legendLabel],
    },
    tooltip: {
      y: { formatter: (v: number) => `${v} sinh viên` },
    },
    stroke: { show: false },
  }
}

// ─── Component chính ──────────────────────────────────────────────────────────

export default function AdvisorDashboardCharts({
  alertHistory,
  paginationTotal,
  noAdvisorClass,
  activeTerm,
  classLabel,
}: Props) {

  const termLabels = useMemo(
    () => alertHistory.map(h => h.term_name ?? h.term_code ?? '—'),
    [alertHistory],
  )

  // Biểu đồ 1 — Cảnh báo học tập
  const riskSeries = useMemo(() => [{ name: 'Cảnh báo học tập', data: alertHistory.map(h => h.risk_count ?? 0) }], [alertHistory])
  const riskOptions = useMemo(() => makeBarOptions(termLabels, C_RED, 'Cảnh báo học tập'), [termLabels])

  // Biểu đồ 2 — Cảnh báo cảm xúc
  const sentSeries = useMemo(() => [{ name: 'Cảnh báo cảm xúc', data: alertHistory.map(h => h.sentiment_count ?? 0) }], [alertHistory])
  const sentOptions = useMemo(() => makeBarOptions(termLabels, C_YELLOW, 'Cảnh báo cảm xúc'), [termLabels])

  // Biểu đồ 3 — Cảnh báo bất thường
  const anomSeries = useMemo(() => [{ name: 'Cảnh báo bất thường', data: alertHistory.map(h => h.anomaly_count ?? 0) }], [alertHistory])
  const anomOptions = useMemo(() => makeBarOptions(termLabels, C_ORANGE, 'Cảnh báo bất thường'), [termLabels])

  // Biểu đồ 4 — Sinh viên mức cảnh báo Cao
  const highSeries = useMemo(() => [{ name: 'Sinh viên mức cảnh báo Cao', data: alertHistory.map(h => h.high_severity_count ?? 0) }], [alertHistory])
  const highOptions = useMemo<ApexOptions>(() => ({
    ...makeBarOptions(termLabels, C_HIGH, 'Sinh viên mức cảnh báo Cao'),
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light', type: 'vertical',
        shadeIntensity: 0.25,
        gradientToColors: ['#fca5a5'],
        stops: [0, 100],
      },
    },
  }), [termLabels])

  // ── Không có lớp ──────────────────────────────────────────────────────────
  if (noAdvisorClass) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-[#E0E0E0] bg-white p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#F9FAFB]">
          <GridIcon className="size-7 text-[#9CA3AF]" />
        </div>
        <p className="text-sm font-semibold text-[#111111]">Bạn chưa được gán lớp cố vấn</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Vui lòng liên hệ quản trị viên để được gán lớp. Sau khi có lớp, toàn bộ thống kê sẽ hiển thị tại đây.
        </p>
      </div>
    )
  }

  const hasHistory = alertHistory.length > 0

  // Lớp card dùng chung — đồng nhất với student dashboard
  const CARD = 'rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]'

  return (
    <div className="mb-6 space-y-5">

      {/* ── Dải ngữ cảnh: lớp + học kỳ ── */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#F0F0F0] bg-white px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderLeft: '4px solid #E02020' }}
      >
        <span className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Cố vấn học tập</span>
        <span className="text-[#D0D0D0]">|</span>
        {classLabel ? (
          <span className="text-sm font-semibold text-[#111111]">{classLabel}</span>
        ) : (
          <span className="text-sm text-[#6B7280]">Chưa chọn lớp</span>
        )}
        {paginationTotal > 0 && (
          <>
            <span className="text-[#D0D0D0]">·</span>
            <span className="rounded-full bg-[#F9FAFB] px-2.5 py-0.5 text-xs font-semibold text-[#444444] ring-1 ring-[#E0E0E0]">
              {paginationTotal} sinh viên
            </span>
          </>
        )}
        {activeTerm ? (
          <>
            <span className="text-[#D0D0D0]">·</span>
            <span className="text-xs text-[#6B7280]">Học kỳ hiện tại:</span>
            <span className="rounded-full bg-[#FFF0F0] px-2.5 py-0.5 text-xs font-semibold text-[#E02020]">
              {activeTerm}
            </span>
          </>
        ) : null}
      </div>

      {/* ── 3 biểu đồ lịch sử (hàng ngang) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className={CARD}>
          <ChartTitle color="#E02020" title="Cảnh báo học tập qua các kỳ"
            sub="Số sinh viên có ít nhất 1 cảnh báo học tập mỗi kỳ" />
          {hasHistory
            ? <Chart options={riskOptions} series={riskSeries} type="bar" height={220} />
            : <EmptyChart />}
        </div>
        <div className={CARD}>
          <ChartTitle color="#eab308" title="Cảnh báo cảm xúc qua các kỳ"
            sub="Số sinh viên có ít nhất 1 cảnh báo cảm xúc mỗi kỳ" />
          {hasHistory
            ? <Chart options={sentOptions} series={sentSeries} type="bar" height={220} />
            : <EmptyChart />}
        </div>
        <div className={CARD}>
          <ChartTitle color="#f97316" title="Cảnh báo bất thường qua các kỳ"
            sub="Số sinh viên có ít nhất 1 cảnh báo bất thường mỗi kỳ" />
          {hasHistory
            ? <Chart options={anomOptions} series={anomSeries} type="bar" height={220} />
            : <EmptyChart />}
        </div>
      </div>

      {/* ── Biểu đồ 4: Sinh viên mức Cao (full width) ── */}
      <div className={CARD}>
        <ChartTitle color="#dc2626" title="Sinh viên có mức cảnh báo Cao qua các kỳ"
          sub="Số sinh viên có ít nhất 1 cảnh báo mức Cao (mọi loại cảnh báo) trong kỳ" />
        {hasHistory
          ? <Chart options={highOptions} series={highSeries} type="bar" height={240} />
          : <EmptyChart />}
      </div>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartTitle({ color, title, sub }: { color: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <h3 className="text-sm font-bold text-[#111111]">{title}</h3>
      </div>
      <div className="mt-1.5 h-0.5 w-10 rounded-full" style={{ backgroundColor: color, opacity: 0.4 }} aria-hidden />
      {sub && <p className="mt-2 text-xs text-[#6B7280]">{sub}</p>}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[180px] items-center justify-center">
      <p className="text-xs text-[#9CA3AF]">Chưa có dữ liệu lịch sử để hiển thị.</p>
    </div>
  )
}
