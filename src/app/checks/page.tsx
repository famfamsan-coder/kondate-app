'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TemperatureCard }   from '@/components/checks/TemperatureCard'
import { EquipmentCheckCard } from '@/components/checks/EquipmentCheckCard'
import { CleaningCheckCard }  from '@/components/checks/CleaningCheckCard'
import { fetchTemperatureLog }   from '@/lib/api/temperatureLog'
import { fetchEquipmentCheckLog } from '@/lib/api/equipmentCheckLog'
import { fetchCleaningCheckLog }  from '@/lib/api/cleaningCheckLog'
import type { TempSlots }          from '@/lib/api/temperatureLog'
import type { EquipmentCheckData } from '@/lib/api/equipmentCheckLog'
import type { CleaningCheckData }  from '@/lib/api/cleaningCheckLog'
import { toDateString } from '@/lib/utils'

// ─── ヘルパー ──────────────────────────────────────────────────────────────

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

// ─── タブ定義 ──────────────────────────────────────────────────────────────

type TabKey = 'temp' | 'equipment' | 'cleaning'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'temp',      label: '温度管理' },
  { key: 'equipment', label: '設備点検表' },
  { key: 'cleaning',  label: '厨房清掃管理点検表' },
]

// ─── 初期値 ────────────────────────────────────────────────────────────────

const EMPTY_FRIDGE:  TempSlots = Array(5).fill(null)
const EMPTY_FREEZER: TempSlots = Array(2).fill(null)

const defaultEquipment = (): EquipmentCheckData => ({
  items: [], confirmer: '', adminSign: '',
})
const defaultCleaning  = (): CleaningCheckData => ({
  items: [], assignee: '', adminSign: '',
})

// ─── ページコンポーネント ─────────────────────────────────────────────────

export default function ChecksPage() {
  const [date,       setDate]       = useState(toDateString(new Date()))
  const [activeTab,  setActiveTab]  = useState<TabKey>('temp')
  const [loading,    setLoading]    = useState(true)

  // 温度
  const [fridge,    setFridge]    = useState<TempSlots>(EMPTY_FRIDGE)
  const [freezer,   setFreezer]   = useState<TempSlots>(EMPTY_FREEZER)
  const [tempAssignee, setTempAssignee] = useState('')

  // 各点検
  const [equipment, setEquipment] = useState<EquipmentCheckData>(defaultEquipment)
  const [cleaning,  setCleaning]  = useState<CleaningCheckData>(defaultCleaning)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchTemperatureLog(date),
      fetchEquipmentCheckLog(date),
      fetchCleaningCheckLog(date),
    ]).then(([tempLog, eqLog, clLog]) => {
      setFridge(tempLog.fridge)
      setFreezer(tempLog.freezer)
      setTempAssignee(tempLog.assignee)
      setEquipment(eqLog)
      setCleaning(clLog)
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
        <p className="text-sm text-slate-500 mt-0.5">日次の温度記録・点検チェック・清掃管理</p>
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

      {/* ── タブ ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── コンテンツ ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <span className="text-sm">読み込み中…</span>
        </div>
      ) : (
        <>
          {/* forceMount 相当: 常時マウントして非アクティブ時は hidden で隠す */}
          <div className={activeTab !== 'temp' ? 'hidden' : undefined}>
            <TemperatureCard
              key={`temp-${date}`}
              date={date}
              initialFridge={fridge}
              initialFreezer={freezer}
              initialAssignee={tempAssignee}
            />
          </div>
          {activeTab === 'equipment' && (
            <EquipmentCheckCard
              key={`equipment-${date}`}
              date={date}
              initialItems={equipment.items}
              initialConfirmer={equipment.confirmer}
              initialAdminSign={equipment.adminSign}
            />
          )}
          {activeTab === 'cleaning' && (
            <CleaningCheckCard
              key={`cleaning-${date}`}
              date={date}
              initialItems={cleaning.items}
              initialAssignee={cleaning.assignee}
              initialAdminSign={cleaning.adminSign}
            />
          )}
        </>
      )}
    </div>
  )
}
