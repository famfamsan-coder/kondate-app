'use client'

import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet } from 'lucide-react'
import {
  fetchTemperatureLogsInRange,
  fetchFinalCheckLogsInRange,
  type TempLogRow,
  type CheckLogRow,
} from '@/lib/api/reports'
import { DEFAULT_CHECK_ITEMS } from '@/lib/api/finalCheckLog'
import { toDateString } from '@/lib/utils'

// ─── CSV ユーティリティ ────────────────────────────────────────────────────

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(',')
}

function downloadCsv(filename: string, rows: string[]): void {
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function fileSuffix(start: string, end: string): string {
  return `${start.replace(/-/g, '')}-${end.replace(/-/g, '')}`
}

// ─── CSV 生成 ─────────────────────────────────────────────────────────────

/** 固定チェック項目キー（列ヘッダー生成・データ展開に使用） */
const CHECK_KEYS = DEFAULT_CHECK_ITEMS.map(d => d.key)

/** A) 温度CSV（1日1行） */
function buildTemperatureCsv(rows: TempLogRow[]): string[] {
  const header = csvRow([
    'date',
    'fridge_1', 'fridge_2', 'fridge_3', 'fridge_4', 'fridge_5', 'fridge_6',
    'freezer_1', 'freezer_2', 'freezer_3', 'freezer_4', 'freezer_5', 'freezer_6',
    'fridge_missing_count', 'freezer_missing_count',
    'updated_at',
  ])
  const data = rows.map(r => csvRow([
    r.date,
    ...r.fridge,
    ...r.freezer,
    r.fridge.filter(v => v === null).length,
    r.freezer.filter(v => v === null).length,
    r.updated_at,
  ]))
  return [header, ...data]
}

/** B) 点検CSV（1日1行、各チェック項目を列展開） */
function buildFinalCheckCsv(rows: CheckLogRow[]): string[] {
  const header = csvRow([
    'date', 'total_items', 'unchecked_count',
    ...CHECK_KEYS,
    'unchecked_labels', 'updated_at',
  ])
  const data = rows.map(r => {
    const map = new Map(r.items.map(i => [i.key, i.checked]))
    const uncheckedLabels = r.items.filter(i => !i.checked).map(i => i.label).join(';')
    return csvRow([
      r.date,
      r.items.length,
      r.items.filter(i => !i.checked).length,
      ...CHECK_KEYS.map(k => (map.get(k) ? 1 : 0)),
      uncheckedLabels,
      r.updated_at,
    ])
  })
  return [header, ...data]
}

/** C) まとめCSV（温度＋点検を日付でジョイン、1日1行） */
function buildSummaryCsv(tempRows: TempLogRow[], checkRows: CheckLogRow[]): string[] {
  const header = csvRow([
    'date',
    'fridge_1', 'fridge_2', 'fridge_3', 'fridge_4', 'fridge_5', 'fridge_6',
    'freezer_1', 'freezer_2', 'freezer_3', 'freezer_4', 'freezer_5', 'freezer_6',
    'unchecked_count', 'unchecked_labels',
    'temp_missing_total', 'finalcheck_done',
    'updated_at',
  ])

  // 両テーブルに存在する日付の和集合（将来: 欠損日補完もここで対応可）
  const tempMap  = new Map(tempRows.map(r => [r.date, r]))
  const checkMap = new Map(checkRows.map(r => [r.date, r]))
  const allDates = Array.from(new Set([...tempMap.keys(), ...checkMap.keys()])).sort()

  const data = allDates.map(date => {
    const t = tempMap.get(date)
    const c = checkMap.get(date)

    const fridge  = t?.fridge  ?? Array.from({ length: 6 }, () => null as number | null)
    const freezer = t?.freezer ?? Array.from({ length: 6 }, () => null as number | null)
    const tempMissingTotal =
      fridge.filter(v => v === null).length + freezer.filter(v => v === null).length

    const items           = c?.items ?? []
    const uncheckedCount  = items.filter(i => !i.checked).length
    const uncheckedLabels = items.filter(i => !i.checked).map(i => i.label).join(';')
    const finalcheckDone  = items.length > 0 && uncheckedCount === 0 ? 1 : 0

    // updated_at は両者のうち新しい方
    const updatedAt = [t?.updated_at, c?.updated_at]
      .filter((v): v is string => !!v)
      .sort()
      .slice(-1)[0] ?? ''

    return csvRow([
      date,
      ...fridge,
      ...freezer,
      uncheckedCount, uncheckedLabels,
      tempMissingTotal, finalcheckDone,
      updatedAt,
    ])
  })
  return [header, ...data]
}

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

type ExportType = 'temp' | 'check' | 'summary'

export default function ReportsPage() {
  const today = toDateString(new Date())
  const [startDate, setStartDate] = useState(getMonthStart())
  const [endDate,   setEndDate]   = useState(today)
  const [loading,   setLoading]   = useState<ExportType | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const handleExport = async (type: ExportType) => {
    if (loading) return
    if (startDate > endDate) {
      setError('開始日が終了日より後になっています')
      return
    }
    setError(null)
    setLoading(type)
    try {
      const suffix = fileSuffix(startDate, endDate)

      if (type === 'temp') {
        const rows = await fetchTemperatureLogsInRange(startDate, endDate)
        if (rows.length === 0) { setError('指定期間に温度データがありません'); return }
        downloadCsv(`temperature_${suffix}.csv`, buildTemperatureCsv(rows))

      } else if (type === 'check') {
        const rows = await fetchFinalCheckLogsInRange(startDate, endDate)
        if (rows.length === 0) { setError('指定期間に点検データがありません'); return }
        downloadCsv(`finalcheck_${suffix}.csv`, buildFinalCheckCsv(rows))

      } else {
        const [tempRows, checkRows] = await Promise.all([
          fetchTemperatureLogsInRange(startDate, endDate),
          fetchFinalCheckLogsInRange(startDate, endDate),
        ])
        if (tempRows.length === 0 && checkRows.length === 0) {
          setError('指定期間にデータがありません')
          return
        }
        downloadCsv(`checks_summary_${suffix}.csv`, buildSummaryCsv(tempRows, checkRows))
      }
    } catch (e) {
      console.error('[ReportsPage] export error', e)
      setError('エクスポート中にエラーが発生しました')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">

      {/* ── ページヘッダー ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">提出用出力</h1>
        <p className="text-sm text-slate-500 mt-0.5">温度記録・点検チェックを CSV でエクスポートします</p>
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

        {/* クイック選択 */}
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
            onClick={() => {
              const r = getLastMonthRange()
              setStartDate(r.start)
              setEndDate(r.end)
            }}
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

      {/* ── エクスポートボタン ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-slate-700">CSV エクスポート</h2>

        <ExportButton
          label="温度記録 CSV を出力"
          description="冷蔵庫・冷凍庫の温度データ（1日1行）"
          loading={loading === 'temp'}
          disabled={!!loading}
          onClick={() => handleExport('temp')}
          colorClass="bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300"
        />
        <ExportButton
          label="点検チェック CSV を出力"
          description="最終点検の各チェック項目の記録（1日1行）"
          loading={loading === 'check'}
          disabled={!!loading}
          onClick={() => handleExport('check')}
          colorClass="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
        />
        <ExportButton
          label="まとめ CSV を出力"
          description="温度＋点検を統合した提出用フォーマット（1日1行）"
          loading={loading === 'summary'}
          disabled={!!loading}
          onClick={() => handleExport('summary')}
          colorClass="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300"
        />
      </div>

      <p className="text-xs text-slate-400 px-1">
        ※ CSV は UTF-8（BOM付き）で出力されます。Excel でそのまま開けます。
      </p>
    </div>
  )
}

// ─── ExportButton ─────────────────────────────────────────────────────────

function ExportButton({
  label, description, loading, disabled, onClick, colorClass,
}: {
  label:       string
  description: string
  loading:     boolean
  disabled:    boolean
  onClick:     () => void
  colorClass:  string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white transition-colors disabled:cursor-not-allowed ${colorClass}`}
    >
      {loading
        ? <Loader2       className="w-4 h-4 animate-spin shrink-0" />
        : <Download      className="w-4 h-4 shrink-0" />
      }
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-xs opacity-80 mt-0.5">{description}</p>
      </div>
      <FileSpreadsheet className="w-4 h-4 opacity-70 shrink-0" />
    </button>
  )
}
