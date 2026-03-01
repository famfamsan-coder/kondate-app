'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar'
import { useMenuItems } from '@/lib/menuItemContext'
import { getWeekDates, toDateString, formatDate } from '@/lib/utils'

const TODAY      = toDateString(new Date())
const TODAY_DATE = new Date(TODAY)

export default function CalendarPage() {
  const { loadWeek, isLoading } = useMenuItems()
  const [weekOffset, setWeekOffset] = useState(0)

  const baseDate = new Date(TODAY_DATE)
  baseDate.setDate(TODAY_DATE.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const weekStart = weekDates[0]
  const weekEnd   = weekDates[6]

  // 週が変わるたびに Supabase からデータを取得
  useEffect(() => {
    loadWeek(weekDates)
    // weekStart が変わったときだけ再実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">献立カレンダー</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatDate(weekStart)} 〜 {formatDate(weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            今週
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        各セルの「＋ 追加」でメニューを登録できます。
      </p>

      {/* Calendar */}
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 transition-opacity ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        {isLoading && (
          <p className="text-center text-xs text-slate-400 mb-2">読み込み中…</p>
        )}
        <WeeklyCalendar
          weekDates={weekDates}
          today={TODAY}
        />
      </div>
    </div>
  )
}
