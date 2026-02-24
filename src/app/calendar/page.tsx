'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar'
import { useSchedules } from '@/lib/scheduleContext'
import { getWeekDates, toDateString, formatDate } from '@/lib/utils'
import { MealType } from '@/lib/types'

const TODAY = toDateString(new Date())
const TODAY_DATE = new Date(TODAY)

interface CsvRow {
  date: string
  meal_type: string
  category: string
  menu_name: string
  valid: boolean
  error?: string
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  // skip header if it looks like a header row
  const dataLines = lines[0]?.startsWith('日付') ? lines.slice(1) : lines
  return dataLines.map(line => {
    const parts = line.split(',')
    const [date, meal_type, category, menu_name] = parts.map(p => p.trim())
    if (!date || !meal_type || !menu_name) {
      return { date: date ?? '', meal_type: meal_type ?? '', category: category ?? '', menu_name: menu_name ?? '', valid: false, error: '必須項目が不足しています' }
    }
    const validMeals: MealType[] = ['朝食', '昼食', '夕食']
    if (!validMeals.includes(meal_type as MealType)) {
      return { date, meal_type, category: category ?? '', menu_name, valid: false, error: `食事区分が不正: "${meal_type}"` }
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { date, meal_type, category: category ?? '', menu_name, valid: false, error: '日付形式が不正 (YYYY-MM-DD)' }
    }
    return { date, meal_type, category: category ?? '', menu_name, valid: true }
  })
}

export default function CalendarPage() {
  const { loadWeek, isLoading } = useSchedules()
  const [weekOffset, setWeekOffset] = useState(0)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([])
  const [importSuccess, setImportSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const baseDate = new Date(TODAY_DATE)
  baseDate.setDate(TODAY_DATE.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const weekStart = weekDates[0]
  const weekEnd   = weekDates[6]

  // 週が変わるたびに Supabase からスケジュールを取得
  useEffect(() => {
    loadWeek(weekDates)
    // weekStart が変わったときだけ再実行（weekDates は毎回新配列なので依存しない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  const handleCsvTextChange = (text: string) => {
    setCsvText(text)
    if (text.trim()) {
      setCsvPreview(parseCsv(text))
    } else {
      setCsvPreview([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      handleCsvTextChange(text)
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = () => {
    const validRows = csvPreview.filter(r => r.valid)
    // In a real app, this would persist to Supabase
    // For the mockup, we log and show success
    console.log('Import schedules:', validRows)
    setImportSuccess(true)
    setShowCsvModal(false)
    setCsvText('')
    setCsvPreview([])
    setTimeout(() => setImportSuccess(false), 3000)
  }

  const validCount = csvPreview.filter(r => r.valid).length
  const errorCount = csvPreview.filter(r => !r.valid).length

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
          {/* Week navigation */}
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
          {/* CSV import */}
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            CSVインポート
          </button>
        </div>
      </div>

      {/* Import success */}
      {importSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          献立データをインポートしました
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> カロリー超過（{'>'}800 kcal）</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> 塩分超過（{'>'}2.5 g/食）</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-600 inline-block" /> 本日</span>
        <span className="flex items-center gap-1.5 ml-auto text-slate-400">← ドラッグ＆ドロップでメニュー移動</span>
      </div>

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

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
          <div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">CSVインポート</h2>
              <button onClick={() => setShowCsvModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Format guide */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">CSV フォーマット</p>
                <code className="text-xs text-slate-700 font-mono block leading-relaxed">
                  日付,食事区分,カテゴリ,メニュー名<br />
                  2026-03-02,朝食,主食,白飯<br />
                  2026-03-02,朝食,主菜,焼き鮭<br />
                  2026-03-02,昼食,主食,カレーライス
                </code>
              </div>

              {/* File upload */}
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:border-teal-400 hover:text-teal-600 transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  CSVファイルを選択
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
              </div>

              <div className="text-center text-xs text-slate-400">または</div>

              {/* Paste textarea */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">テキスト貼り付け</label>
                <textarea
                  value={csvText}
                  onChange={e => handleCsvTextChange(e.target.value)}
                  rows={6}
                  placeholder="CSVテキストをここに貼り付け…"
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-semibold text-slate-700">プレビュー</p>
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{validCount} 件 OK</span>
                    {errorCount > 0 && (
                      <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{errorCount} 件エラー</span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {csvPreview.map((row, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${row.valid ? '' : 'bg-red-50'}`}>
                        {row.valid
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        }
                        <span className="text-slate-500 font-mono">{row.date}</span>
                        <span className="text-slate-600">{row.meal_type}</span>
                        <span className="text-slate-400">{row.category}</span>
                        <span className="text-slate-800 font-medium">{row.menu_name}</span>
                        {row.error && <span className="text-red-600 ml-auto">{row.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="w-full py-3 bg-teal-600 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed"
              >
                {validCount > 0 ? `${validCount} 件をインポート` : 'インポート（有効なデータがありません）'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
