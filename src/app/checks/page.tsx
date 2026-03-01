'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TemperatureCard } from '@/components/checks/TemperatureCard'
import { FinalChecklistCard } from '@/components/checks/FinalChecklistCard'
import { fetchTemperatureLog } from '@/lib/api/temperatureLog'
import { fetchFinalCheckLog } from '@/lib/api/finalCheckLog'
import type { TempSlots } from '@/lib/api/temperatureLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'
import { toDateString } from '@/lib/utils'

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}

const EMPTY_SLOTS: TempSlots = Array(6).fill(null)

export default function ChecksPage() {
  const [date,       setDate]       = useState(toDateString(new Date()))
  const [fridge,     setFridge]     = useState<TempSlots>(EMPTY_SLOTS)
  const [freezer,    setFreezer]    = useState<TempSlots>(EMPTY_SLOTS)
  const [checkItems, setCheckItems] = useState<CheckItem[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchTemperatureLog(date),
      fetchFinalCheckLog(date),
    ]).then(([tempLog, checkLog]) => {
      setFridge(tempLog.fridge)
      setFreezer(tempLog.freezer)
      setCheckItems(checkLog)
      setLoading(false)
    }).catch(e => {
      console.error('[ChecksPage] fetch error', e)
      setLoading(false)
    })
  }, [date])

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

      {/* ── ページヘッダー ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">チェックと温度管理</h1>
        <p className="text-sm text-slate-500 mt-0.5">日次の温度記録と最終点検チェック</p>
      </div>

      {/* ── 日付セレクター ── */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
        <button
          type="button"
          onClick={() => setDate(d => addDays(d, -1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          aria-label="前日"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={e => e.target.value && setDate(e.target.value)}
          className="flex-1 text-center text-sm font-semibold text-slate-700 focus:outline-none"
        />
        <span className="text-sm text-slate-500 hidden sm:block shrink-0">
          {formatDateLabel(date)}
        </span>
        <button
          type="button"
          onClick={() => setDate(d => addDays(d, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          aria-label="翌日"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── コンテンツ（ローディング中は非表示） ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <span className="text-sm">読み込み中…</span>
        </div>
      ) : (
        <>
          <TemperatureCard
            key={`temp-${date}`}
            date={date}
            initialFridge={fridge}
            initialFreezer={freezer}
          />
          <FinalChecklistCard
            key={`check-${date}`}
            date={date}
            initialItems={checkItems}
          />
        </>
      )}
    </div>
  )
}
