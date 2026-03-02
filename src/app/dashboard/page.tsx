import { EvaluationTimeline } from '@/components/dashboard/EvaluationTimeline'
import { OodaTimeline } from '@/components/dashboard/OodaTimeline'
import { DashboardClientTop } from '@/components/dashboard/DashboardClientTop'
import { FieldNotes } from '@/components/dashboard/FieldNotes'
import { DailyNoticeCard } from '@/components/dashboard/DailyNoticeCard'
import { CheckStatusBanner } from '@/components/dashboard/CheckStatusBanner'
import { fetchMenuItemsByDateRange, fetchRecentMenuItems, fetchMenuItemsWithComments } from '@/lib/api/menuItems'
import { fetchOodas } from '@/lib/api/ooda'
import { fetchDailyNotice } from '@/lib/api/dailyNotice'
import { fetchTemperatureLog }   from '@/lib/api/temperatureLog'
import { fetchEquipmentCheckLog } from '@/lib/api/equipmentCheckLog'
import { fetchCleaningCheckLog }  from '@/lib/api/cleaningCheckLog'
import { toDateString } from '@/lib/utils'
import type { MenuItem } from '@/lib/types'

function formatTodayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}

function getNextDates(todayStr: string, days: number): string[] {
  return Array.from({ length: days + 1 }, (_, i) => {
    const d = new Date(`${todayStr}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function calcTotalTime(items: MenuItem[]): number {
  return items.reduce((s, m) => s + m.prep_time + m.measure_time + m.cook_time + m.serve_time, 0)
}

export default async function DashboardPage() {
  const today      = toDateString(new Date())
  const next3Dates = getNextDates(today, 3)

  const [
    recentMenuItems, next3MenuItems, allOodas, fieldNoteItems,
    noticeContent, tempLog, eqLog, clLog,
  ] = await Promise.all([
    fetchRecentMenuItems(20),
    fetchMenuItemsByDateRange(next3Dates[0], next3Dates[next3Dates.length - 1]),
    fetchOodas(),
    fetchMenuItemsWithComments(15),
    fetchDailyNotice(today),
    fetchTemperatureLog(today),
    fetchEquipmentCheckLog(today),
    fetchCleaningCheckLog(today),
  ])

  const fridgeMissing  = tempLog.fridge.filter(v => v === null).length
  const freezerMissing = tempLog.freezer.filter(v => v === null).length
  const uncheckedItems =
    eqLog.items.filter(i => !i.checked).length +
    clLog.items.filter(i => !i.checked).length

  const todayItems     = next3MenuItems.filter(m => m.date === today)
  const todayTotalTime = calcTotalTime(todayItems)
  const todayMealCount = todayItems.length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">

      {/* ── ページヘッダー ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-0.5">{formatTodayLabel(today)}</p>
      </div>

      {/* ── 【優先0a】今日のお知らせ（朝礼メモ） ── */}
      <DailyNoticeCard date={today} initialContent={noticeContent} />

      {/* ── 【優先0b】温度・点検チェックステータス ── */}
      <CheckStatusBanner
        fridgeMissing={fridgeMissing}
        freezerMissing={freezerMissing}
        uncheckedItems={uncheckedItems}
      />

      {/* ── 【優先1】KPI + 安全セクション（クライアント, state 連動） ── */}
      <DashboardClientTop
        totalTime={todayTotalTime}
        todayMealCount={todayMealCount}
        next3MenuItems={next3MenuItems}
        allOodas={allOodas}
      />

      {/* ── 【優先2】現場からの最新の気づき ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-slate-700">現場からの最新の気づき</h2>
          {fieldNoteItems.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
              {fieldNoteItems.length} 件
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">（作業記録の改善メモより）</span>
        </div>
        <FieldNotes items={fieldNoteItems} />
      </div>

      {/* ── 【優先3】最新の作業記録 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-700 mb-4">最新の作業記録</h2>
        <EvaluationTimeline items={recentMenuItems} />
      </div>

      {/* ── 【優先4】最新の課題タイムライン ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-slate-700">🗣️ 最新の課題・改善メモ</h2>
          <span className="text-xs text-slate-400">（OODAボードより）</span>
        </div>
        <OodaTimeline items={allOodas} />
      </div>

    </div>
  )
}
