import { AlertTriangle, Clock, Star, TrendingUp } from 'lucide-react'
import { WorkloadChart, DEFAULT_WARNING_MINUTES } from '@/components/dashboard/WorkloadChart'
import { IssueReminders } from '@/components/dashboard/IssueReminders'
import { EvaluationTimeline } from '@/components/dashboard/EvaluationTimeline'
import { fetchSchedulesByDates } from '@/lib/api/schedules'
import { fetchRecentRecords } from '@/lib/api/records'
import { fetchIssues } from '@/lib/api/issues'
import { calcNutrition, getWeekDates, toDateString } from '@/lib/utils'
import type { WorkRecord } from '@/lib/types'

function avgScore(records: WorkRecord[]) {
  if (!records.length) return 0
  const total = records.reduce(
    (sum, r) => sum + (r.prep_score + r.measure_score + r.cook_score + r.serve_score) / 4,
    0
  )
  return (total / records.length).toFixed(1)
}

function formatTodayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}

export default async function DashboardPage() {
  const today = toDateString(new Date())
  const weekDates = getWeekDates(new Date())

  const [weekSchedules, recentRecords, issues] = await Promise.all([
    fetchSchedulesByDates(weekDates),
    fetchRecentRecords(10),
    fetchIssues(),
  ])

  const todaySchedules = weekSchedules.filter(s => s.date === today)
  const todayNutrition = calcNutrition(todaySchedules)

  const openIssues = issues.filter(i => i.status !== '解決済')
  const thisWeekMenuIds = new Set(weekSchedules.map(s => s.menu_id))
  const weekIssues = issues.filter(i => thisWeekMenuIds.has(i.menu_id))

  const todayRecords = recentRecords.filter(r => r.schedule?.date === today)

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-0.5">{formatTodayLabel(today)}</p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="本日の作業時間（予測）"
          value={`${todayNutrition.total_time} 分`}
          icon={<Clock className="w-5 h-5 text-teal-600" />}
          bg="bg-teal-50"
        />
        <KpiCard
          label="本日のメニュー数"
          value={`${todaySchedules.length} 品`}
          icon={<TrendingUp className="w-5 h-5 text-sky-600" />}
          bg="bg-sky-50"
        />
        <KpiCard
          label="未解決課題"
          value={`${openIssues.length} 件`}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          bg="bg-amber-50"
          alert={openIssues.length > 0}
        />
        <KpiCard
          label="今日の平均評価"
          value={todayRecords.length ? `${avgScore(todayRecords)} / 10` : '—'}
          icon={<Star className="w-5 h-5 text-yellow-500" />}
          bg="bg-yellow-50"
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Workload chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-4">本日の食事別・予測作業時間</h2>
          <WorkloadChart schedules={todaySchedules} />
          <p className="text-xs text-slate-400 mt-2 text-center">
            点線：目安（朝食 {DEFAULT_WARNING_MINUTES['朝食']}分 / 昼食 {DEFAULT_WARNING_MINUTES['昼食']}分 / 夕食 {DEFAULT_WARNING_MINUTES['夕食']}分）
          </p>
        </div>

        {/* Unresolved issues */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-700">今週の未解決課題</h2>
            {weekIssues.filter(i => i.status !== '解決済').length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                要対応
              </span>
            )}
          </div>
          <IssueReminders issues={weekIssues} />
        </div>
      </div>

      {/* Evaluation timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-700 mb-4">最新の現場評価</h2>
        <EvaluationTimeline records={recentRecords} />
      </div>

      {/* Today's meal nutrition summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-700 mb-4">本日の栄養素合計</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'カロリー', value: `${Math.round(todayNutrition.calories)}`, unit: 'kcal' },
            { label: 'タンパク質', value: todayNutrition.protein.toFixed(1), unit: 'g' },
            { label: '塩分', value: todayNutrition.salt.toFixed(1), unit: 'g', warn: todayNutrition.salt > 7.5 },
            { label: '脂質', value: todayNutrition.fat.toFixed(1), unit: 'g' },
            { label: '炭水化物', value: todayNutrition.carbohydrate.toFixed(1), unit: 'g' },
          ].map(({ label, value, unit, warn }) => (
            <div
              key={label}
              className={`text-center p-3 rounded-xl ${warn ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}
            >
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${warn ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
              <p className="text-xs text-slate-400">{unit}</p>
              {warn && <p className="text-xs text-red-500 mt-0.5">⚠ 超過</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, icon, bg, alert = false,
}: {
  label: string; value: string; icon: React.ReactNode; bg: string; alert?: boolean
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 border ${alert ? 'border-amber-300' : 'border-transparent'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
    </div>
  )
}
