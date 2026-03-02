'use client'

import { useState } from 'react'
import { Loader2, FileSpreadsheet, Sheet } from 'lucide-react'
import { toDateString } from '@/lib/utils'

// ─── 日付ヘルパー ─────────────────────────────────────────────────────────

function getMonthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function getLastMonthRange(): { start: string; end: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end   = new Date(now.getFullYear(), now.getMonth(), 0)
  const fmt   = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(start), end: fmt(end) }
}

// ─── ページ ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = toDateString(new Date())
  const [startDate, setStartDate] = useState(getMonthStart())
  const [endDate,   setEndDate]   = useState(today)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleXlsx = async () => {
    if (loading) return
    if (startDate > endDate) { setError('開始日が終了日より後になっています'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/export/xlsx?start=${startDate}&end=${endDate}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError((j as { error?: string }).error ?? 'Excel生成に失敗しました')
        return
      }
      const blob   = await res.blob()
      const suffix = `${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}`
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href     = url
      a.download = `厨房記録_${suffix}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[ReportsPage]', e)
      setError('Excel生成中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-5">

      {/* ── ヘッダー ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">提出用出力</h1>
        <p className="text-sm text-slate-500 mt-0.5">温度記録・点検チェックを Excel でエクスポートします</p>
      </div>

      {/* ── 期間設定 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-700">出力期間</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={e => e.target.value && setStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={e => e.target.value && setEndDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setStartDate(getMonthStart()); setEndDate(today) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors font-medium"
          >
            今月
          </button>
          <button
            type="button"
            onClick={() => { const r = getLastMonthRange(); setStartDate(r.start); setEndDate(r.end) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors font-medium"
          >
            先月
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* ── Excel エクスポート ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div>
          <h2 className="font-bold text-slate-700">Excel エクスポート（提出用）</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            5シート構成（温度記録・設備点検・清掃点検・OODA・まとめ）＋月次確認欄付き
          </p>
        </div>
        <button
          type="button"
          onClick={handleXlsx}
          disabled={loading}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-white transition-colors disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300"
        >
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            : <Sheet   className="w-5 h-5 shrink-0" />
          }
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold leading-tight">提出用 Excel（.xlsx）を出力</p>
            <p className="text-xs opacity-80 mt-0.5">日本語ヘッダー・確認欄付き・A4横印刷対応</p>
          </div>
          <FileSpreadsheet className="w-5 h-5 opacity-70 shrink-0" />
        </button>
      </div>

      <p className="text-xs text-slate-400 px-1">
        ※ Supabase に接続されていない場合、データは出力されません。
      </p>
    </div>
  )
}
