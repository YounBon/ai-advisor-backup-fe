import { useCallback, useEffect, useMemo, useState } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import { dashboardService } from '@/services/DashboardService'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'

type DepartmentItem = { _id: string; department_code: string; department_name: string }
type RiskDistRow = { _id: string | null; count: number }
type AnomalyRow = { _id: { alert_type?: string; severity?: string }; count: number }
type SentimentRow = { _id: string | null; count: number }
type AlertHistoryItem = {
    term_id?: string; term_code?: string; term_name?: string; start_date?: string | null
    risk_count?: number; sentiment_count?: number; anomaly_count?: number; high_severity_count?: number
}
type TopRiskStudent = {
    student_user_id?: string; full_name?: string | null; student_code?: string | null
    email?: string | null; risk_score?: number | null; risk_label?: number | string | null
}

type FacultyDashboardData = {
    department_id: string | null
    active_term?: { _id?: string; term_code?: string; term_name?: string } | null
    kpi: { total_students: number; avg_risk_score: number; high_risk_students: number; total_predictions: number }
    risk_distribution: RiskDistRow[]
    anomaly_summary: AnomalyRow[]
    feedback_sentiment: SentimentRow[]
    alert_history_by_term: AlertHistoryItem[]
    top_risk_students: TopRiskStudent[]
}


const DEPT_KEY = 'admin_last_dept'

function riskLabelVi(label?: number | string | null): string {
    const v = String(label ?? '')
    if (v === '-1') return 'Cao'
    if (v === '0') return 'Trung bình'
    if (v === '1') return 'Thấp'
    return '—'
}

function riskColor(label?: number | string | null): string {
    const v = String(label ?? '')
    if (v === '-1') return 'text-[#E02020]'
    if (v === '0') return 'text-amber-600'
    if (v === '1') return 'text-emerald-600'
    return 'text-[#6B7280]'
}

function riskBadgeClass(label?: number | string | null): string {
    const v = String(label ?? '')
    if (v === '-1') return 'bg-[#FFF0F0] text-[#E02020]'
    if (v === '0') return 'bg-amber-50 text-amber-700'
    if (v === '1') return 'bg-emerald-50 text-emerald-700'
    return 'bg-gray-100 text-gray-500'
}

function sentimentLabelVi(s?: string | null): string {
    if (!s) return 'Không xác định'
    if (s === 'POSITIVE') return 'Tích cực'
    if (s === 'NEGATIVE') return 'Tiêu cực'
    if (s === 'NEUTRAL') return 'Trung lập'
    return s
}

function sentimentColor(s?: string | null): string {
    if (s === 'POSITIVE') return '#10b981'
    if (s === 'NEGATIVE') return '#E02020'
    if (s === 'NEUTRAL') return '#f59e0b'
    return '#6b7280'
}


function KpiCard({ label, value, sub, accent }: {
    label: string; value: string | number; sub?: string; accent?: string
}) {
    return (
        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">{label}</p>
            <p className={`mt-2 text-3xl font-extrabold tabular-nums ${accent ?? 'text-[#111111]'}`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-[#9CA3AF]">{sub}</p>}
        </div>
    )
}


function makeBarOptions(termLabels: string[], color: string, legendLabel: string): ApexOptions {
    return {
        chart: { type: 'bar', fontFamily: "'Be Vietnam Pro', sans-serif", toolbar: { show: false }, background: 'transparent' },
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
            enabled: true, offsetY: -16,
            style: { fontSize: '11px', fontWeight: 600, colors: ['#374151'] },
            formatter: (val: number) => (val > 0 ? String(val) : ''),
        },
        xaxis: {
            categories: termLabels.length ? termLabels : ['—'],
            labels: { style: { fontSize: '11px', colors: '#6b7280' }, rotate: -15, trim: true, maxHeight: 56 },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: {
            title: { text: 'Số sinh viên', style: { fontSize: '11px', color: '#9ca3af', fontWeight: 400 } },
            labels: { style: { fontSize: '11px', colors: '#9ca3af' }, formatter: (v: number) => String(Math.round(v)) },
            min: 0,
        },
        grid: { borderColor: '#F0F0F0', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
        legend: { show: true, position: 'top', horizontalAlign: 'left', fontSize: '12px', fontWeight: 500, labels: { colors: '#374151' }, markers: { size: 8 }, customLegendItems: [legendLabel] },
        tooltip: { y: { formatter: (v: number) => `${v} sinh viên` } },
        stroke: { show: false },
    }
}


export default function Home() {
    const user = useAuthStore(s => s.user)
    const canAccess = user?.role === 'ADMIN' || user?.role === 'FACULTY'

    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<FacultyDashboardData | null>(null)
    const [deptPicklist, setDeptPicklist] = useState<DepartmentItem[]>([])
    const [deptChoice, setDeptChoice] = useState<string>(() => localStorage.getItem(DEPT_KEY) ?? '__all__')
    const [riskThreshold, setRiskThreshold] = useState('0.7')

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
        const thr = Number(riskThreshold)
        if (Number.isNaN(thr) || thr < 0 || thr > 1) { toast.error('Ngưỡng rủi ro phải từ 0 đến 1'); return }
        setLoading(true)
        try {
            const body: Record<string, unknown> = { risk_threshold: thr }
            if (deptChoice && deptChoice !== '__all__') body.department_id = deptChoice
            const res = await dashboardService.getFacultyDashboard(body)
            setData(res.data as FacultyDashboardData)
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string }; status?: number } }
            const msg = e?.response?.data?.message
            const status = e?.response?.status
            console.error('[Admin Dashboard] fetchDashboard error:', status, msg, err)
            toast.error(msg ? `Lỗi ${status ?? ''}: ${msg}` : 'Không tải được dữ liệu tổng quan')
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [canAccess, deptChoice, riskThreshold])

    useEffect(() => { void loadDepartments() }, [loadDepartments])
    useEffect(() => { void fetchDashboard() }, [fetchDashboard])

    const handleDeptChange = (val: string) => {
        setDeptChoice(val)
        localStorage.setItem(DEPT_KEY, val)
    }

    const sentimentLabels = useMemo(() => (data?.feedback_sentiment ?? []).map(r => sentimentLabelVi(r._id)), [data])
    const sentimentSeries = useMemo(() => (data?.feedback_sentiment ?? []).map(r => r.count), [data])
    const sentimentColors = useMemo(() => (data?.feedback_sentiment ?? []).map(r => sentimentColor(r._id)), [data])

    const sentimentDonutOptions: ApexOptions = useMemo(() => ({
        chart: { type: 'donut', fontFamily: "'Be Vietnam Pro', sans-serif", toolbar: { show: false } },
        labels: sentimentLabels,
        colors: sentimentColors.length ? sentimentColors : ['#94a3b8'],
        legend: { position: 'bottom', fontSize: '13px', labels: { colors: '#374151' } },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        total: {
                            show: true, label: 'Tổng phản hồi', color: '#6b7280',
                            formatter: () => String(sentimentSeries.reduce((a, b) => a + b, 0)),
                        },
                    },
                },
            },
        },
        stroke: { width: 2, colors: ['#fff'] },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (v: number) => `${v} phản hồi` } },
    }), [sentimentLabels, sentimentColors, sentimentSeries])

    const highRisk = data?.kpi.high_risk_students ?? 0
    const totalStudents = data?.kpi.total_students ?? 0
    const safeStudents = Math.max(0, totalStudents - highRisk)

    const riskDonutOptions: ApexOptions = useMemo(() => ({
        chart: { type: 'donut', fontFamily: "'Be Vietnam Pro', sans-serif", toolbar: { show: false } },
        labels: ['Rủi ro cao', 'Bình thường'],
        colors: ['#E02020', '#10b981'],
        legend: { position: 'bottom', fontSize: '13px', labels: { colors: '#374151' } },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        total: {
                            show: true, label: 'Tổng sinh viên', color: '#6b7280',
                            formatter: () => String(totalStudents),
                        },
                    },
                },
            },
        },
        stroke: { width: 2, colors: ['#fff'] },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (v: number) => `${v} sinh viên` } },
    }), [totalStudents])

    const alertHistory = data?.alert_history_by_term ?? []
    const termLabels = useMemo(() => alertHistory.map(h => h.term_name ?? h.term_code ?? '—'), [alertHistory])
    const highSeries = useMemo(() => [{ name: 'Sinh viên cảnh báo mức Cao', data: alertHistory.map(h => h.high_severity_count ?? 0) }], [alertHistory])
    const highBarOptions = useMemo<ApexOptions>(() => ({
        ...makeBarOptions(termLabels, '#dc2626', 'Sinh viên cảnh báo mức Cao'),
        fill: {
            type: 'gradient',
            gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.25, gradientToColors: ['#fca5a5'], stops: [0, 100] },
        },
    }), [termLabels])

    const deptLabel = deptChoice === '__all__'
        ? 'Toàn hệ thống'
        : deptPicklist.find(d => d._id === deptChoice)?.department_name ?? 'Khoa đang chọn'

    const activeTermLabel = data?.active_term
        ? `${data.active_term.term_code ?? ''} — ${data.active_term.term_name ?? ''}`.trim().replace(/^—\s*|—\s*$/, '')
        : '—'

    const kpi = data?.kpi

    if (!canAccess) {
        return (
            <>
                <PageMeta title="Tổng quan | Quản trị" description="Chỉ quản trị viên mới xem được trang này" />
                <p className="text-sm text-[#6B7280]">Bạn không có quyền truy cập trang này.</p>
            </>
        )
    }

    return (
        <>
            <PageMeta title="Tổng quan | Quản trị hệ thống" description="Tổng quan tình hình học tập và cảnh báo toàn trường" />

            <div
                className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                style={{ borderLeft: '4px solid #E02020' }}
            >
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E02020]">Quản trị hệ thống</p>
                    <h1 className="mt-0.5 text-2xl font-bold text-[#111111]">Tổng quan</h1>
                    <p className="mt-0.5 text-sm text-[#6B7280]">
                        Tình hình học tập, rủi ro và cảnh báo — <span className="font-semibold text-[#111111]">{deptLabel}</span>
                        {data?.active_term && <> · Học kỳ <span className="font-semibold text-[#111111]">{activeTermLabel}</span></>}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchDashboard()}
                    disabled={loading}
                    className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)' }}
                >
                    <svg className={`size-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            <div
                className="mb-6 rounded-2xl border border-[#F0F0F0] bg-white px-6 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '16px' }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#6B7280]">Khoa</label>
                    <select
                        value={deptChoice}
                        onChange={e => handleDeptChange(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm text-[#111111] outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                    >
                        <option value="__all__">Toàn hệ thống (tất cả khoa)</option>
                        {deptPicklist.map(d => (
                            <option key={d._id} value={d._id}>{d.department_code} — {d.department_name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ width: '176px', flexShrink: 0 }}>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#6B7280]">Ngưỡng rủi ro cao</label>
                    <input
                        type="number" step={0.05} min="0" max="1"
                        value={riskThreshold}
                        onChange={e => setRiskThreshold(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm text-[#111111] outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/15"
                    />
                    <p className="mt-1 text-[11px] text-[#9CA3AF]">Giá trị từ 0 đến 1 (mặc định 0,7)</p>
                </div>
            </div>

            {loading && !data ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />)}
                </div>
            ) : kpi ? (
                <div className="space-y-6">

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Tổng sinh viên" value={kpi.total_students} sub={deptLabel} />
                        <KpiCard
                            label="Điểm rủi ro trung bình"
                            value={Number(kpi.avg_risk_score).toFixed(3)}
                            sub="Thang điểm 0 – 1"
                            accent={Number(kpi.avg_risk_score) >= Number(riskThreshold) ? 'text-[#E02020]' : 'text-[#111111]'}
                        />
                        <KpiCard
                            label="Sinh viên rủi ro cao"
                            value={kpi.high_risk_students}
                            sub={`Ngưỡng ≥ ${riskThreshold}`}
                            accent="text-[#E02020]"
                        />
                        <KpiCard label="Bản ghi dự báo" value={kpi.total_predictions} sub="Dự báo mới nhất mỗi sinh viên" />
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

                        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                            <h2 className="text-base font-bold text-[#111111]">Cảm xúc phản hồi sau họp</h2>
                            <p className="mt-0.5 text-xs text-[#6B7280]">Phân bố phản hồi trong học kỳ hiện tại — {deptLabel}</p>
                            <div className="mt-4 min-h-[280px]">
                                {sentimentSeries.length > 0 && sentimentSeries.some(v => v > 0) ? (
                                    <Chart options={sentimentDonutOptions} series={sentimentSeries} type="donut" height={300} />
                                ) : (
                                    <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#F0F0F0]">
                                        <p className="text-sm font-medium text-[#6B7280]">Chưa có phản hồi</p>
                                        <p className="text-xs text-[#9CA3AF]">trong học kỳ hiện tại</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                            <h2 className="text-base font-bold text-[#111111]">Tỉ lệ sinh viên rủi ro cao</h2>
                            <p className="mt-0.5 text-xs text-[#6B7280]">So với tổng số sinh viên — ngưỡng ≥ {riskThreshold}</p>
                            <div className="mt-4 min-h-[280px]">
                                {totalStudents > 0 ? (
                                    <Chart options={riskDonutOptions} series={[highRisk, safeStudents]} type="donut" height={300} />
                                ) : (
                                    <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#F0F0F0]">
                                        <p className="text-sm font-medium text-[#6B7280]">Chưa có dữ liệu</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                            <h2 className="text-base font-bold text-[#111111]">Cảnh báo mức Cao qua các học kỳ</h2>
                            <p className="mt-0.5 text-xs text-[#6B7280]">Số sinh viên có ít nhất 1 cảnh báo mức Cao — {deptLabel}</p>
                            <div className="mt-4 min-h-[280px]">
                                {alertHistory.length > 0 ? (
                                    <Chart options={highBarOptions} series={highSeries} type="bar" height={300} />
                                ) : (
                                    <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#F0F0F0]">
                                        <p className="text-sm font-medium text-[#6B7280]">Chưa có dữ liệu lịch sử</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#F0F0F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2 border-b border-[#F0F0F0] px-5 py-4">
                            <svg className="size-5 text-[#E02020]" viewBox="0 0 24 24" fill="none">
                                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h2 className="text-base font-bold text-[#111111]">Top 10 sinh viên rủi ro cao nhất</h2>
                            <span className="ml-auto text-xs text-[#6B7280]">{deptLabel} · Dự báo mới nhất</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#F0F0F0] bg-[#F9FAFB]">
                                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">#</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Họ và tên</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mã sinh viên</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Điểm rủi ro</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6B7280]">Mức độ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data?.top_risk_students ?? []).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#6B7280]">Chưa có dữ liệu dự báo rủi ro.</td>
                                        </tr>
                                    ) : (
                                        (data?.top_risk_students ?? []).map((s, idx) => (
                                            <tr key={String(s.student_user_id ?? idx)} className="border-b border-[#F0F0F0] bg-white last:border-0 hover:bg-[#FFF8F8]">
                                                <td className="px-5 py-3 text-xs font-bold text-[#9CA3AF]">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-[#111111]">{s.full_name ?? '—'}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-[#444444]">{s.student_code ?? '—'}</td>
                                                <td className={`px-4 py-3 tabular-nums font-bold ${riskColor(s.risk_label)}`}>
                                                    {s.risk_score != null ? s.risk_score.toFixed(3) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskBadgeClass(s.risk_label)}`}>
                                                        {riskLabelVi(s.risk_label)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-[#F0F0F0]">
                    <p className="text-sm text-[#6B7280]">Không có dữ liệu. Thử làm mới hoặc kiểm tra kết nối.</p>
                </div>
            )}
        </>
    )
}
