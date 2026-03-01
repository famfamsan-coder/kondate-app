'use client'

import { useRef, useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Upload, CheckCircle, Trash2, AlertCircle, FileText, X } from 'lucide-react'
import { bulkImportMenuItemsAction } from './actions'
import type { MealType } from '@/lib/types'

// ─── 型定義 ────────────────────────────────────────────────────────────────

type ColKey = 'date' | 'meal_type' | 'category' | 'menu_name' | 'tags' | 'note'

interface CsvRow {
  id:        number
  date:      string
  meal_type: string
  category:  string
  menu_name: string
  tags:      string   // "|"区切りの文字列（例: "肉|卵"）
  note:      string   // 注意事項（自由テキスト）
}

type CellErrors = Partial<Record<ColKey, string>>

// ─── バリデーション ────────────────────────────────────────────────────────

const MEAL_TYPES = ['朝食', '昼食', '夕食'] as const
const DATE_RE    = /^\d{4}-\d{2}-\d{2}$/

function normalizeDate(raw: string): string {
  return raw.replace(/\//g, '-')
}

function validateRow(row: CsvRow): CellErrors {
  const errs: CellErrors = {}
  if (!DATE_RE.test(row.date))
    errs.date = '日付は YYYY-MM-DD または YYYY/MM/DD 形式で入力してください'
  if (!MEAL_TYPES.includes(row.meal_type as MealType))
    errs.meal_type = '朝食／昼食／夕食 のいずれかを入力してください'
  if (!row.menu_name.trim())
    errs.menu_name = 'メニュー名は必須です'
  return errs
}

// ─── 列定義 ───────────────────────────────────────────────────────────────

const COLUMNS: { key: ColKey; label: string; width: string }[] = [
  { key: 'date',      label: '日付',       width: 'w-32'   },
  { key: 'meal_type', label: '食事区分',   width: 'w-24'   },
  { key: 'category',  label: 'カテゴリ',   width: 'w-24'   },
  { key: 'menu_name', label: 'メニュー名', width: 'w-auto' },
  { key: 'tags',      label: 'タグ',       width: 'w-32'   },
  { key: 'note',      label: '注意事項',   width: 'w-48'   },
]

// ─── CSV パース ───────────────────────────────────────────────────────────

const HEADER_ALIASES: Record<string, ColKey> = {
  '日付':       'date',
  '食事区分':   'meal_type',
  'カテゴリ':   'category',
  'メニュー名': 'menu_name',
  'メニュー':   'menu_name',
  'タグ':       'tags',
  '注意事項':   'note',
  'ノート':     'note',
}

function parseCsv(text: string): CsvRow[] {
  const result  = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true })
  const rawRows = result.data as string[][]
  if (rawRows.length === 0) return []

  // ヘッダー行自動検出
  const LOOSE_DATE_RE = /^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/
  const firstCell     = rawRows[0][0]?.trim() ?? ''
  const isHeader      = !LOOSE_DATE_RE.test(firstCell)
  const startIndex    = isHeader ? 1 : 0

  const colOrder: ColKey[] = ['date', 'meal_type', 'category', 'menu_name', 'tags', 'note']
  let colMap: (ColKey | null)[] = colOrder

  if (isHeader) {
    const headerRow = rawRows[0].map(h => h.trim())
    colMap = headerRow.map(h => HEADER_ALIASES[h] ?? null)
  }

  return rawRows.slice(startIndex).map((cells, i) => {
    const row: Partial<Record<ColKey, string>> = {}
    colMap.forEach((col, ci) => {
      if (col) row[col] = (cells[ci] ?? '').trim()
    })
    return {
      id:        i,
      date:      normalizeDate(row.date      ?? ''),
      meal_type: row.meal_type ?? '',
      category:  row.category  ?? '',
      menu_name: row.menu_name ?? '',
      tags:      row.tags      ?? '',
      note:      row.note      ?? '',
    }
  })
}

// ─── メインコンポーネント ─────────────────────────────────────────────────

export default function CsvImportPage() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [rows,      setRows]    = useState<CsvRow[]>([])
  const [errors,    setErrors]  = useState<Map<number, CellErrors>>(new Map())
  const [editing,   setEditing] = useState<{ rowId: number; col: ColKey } | null>(null)
  const [editValue, setEditVal] = useState('')
  const [status,    setStatus]  = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message,   setMessage] = useState('')

  // ── ファイル読み込み ──
  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const text   = e.target?.result as string
      const parsed = parseCsv(text)
      setRows(parsed)
      const errMap = new Map<number, CellErrors>()
      parsed.forEach(r => {
        const e = validateRow(r)
        if (Object.keys(e).length > 0) errMap.set(r.id, e)
      })
      setErrors(errMap)
      setStatus('idle')
      setMessage('')
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  // ── インライン編集 ──
  const startEdit = (rowId: number, col: ColKey, value: string) => {
    setEditing({ rowId, col })
    setEditVal(value)
  }

  const commitEdit = useCallback((rowId: number, col: ColKey) => {
    setRows(prev => {
      const next = prev.map(r => {
        if (r.id !== rowId) return r
        const updated = { ...r, [col]: editValue }
        const e = validateRow(updated)
        setErrors(em => {
          const nm = new Map(em)
          if (Object.keys(e).length === 0) nm.delete(rowId)
          else nm.set(rowId, e)
          return nm
        })
        return updated
      })
      return next
    })
    setEditing(null)
  }, [editValue])

  const deleteRow = (rowId: number) => {
    setRows(prev => prev.filter(r => r.id !== rowId))
    setErrors(prev => { const m = new Map(prev); m.delete(rowId); return m })
  }

  // ── 確定保存 ──
  const handleConfirm = async () => {
    if (rows.length === 0) return

    const errMap = new Map<number, CellErrors>()
    rows.forEach(r => {
      const e = validateRow(r)
      if (Object.keys(e).length > 0) errMap.set(r.id, e)
    })
    if (errMap.size > 0) {
      setErrors(errMap)
      setMessage('入力エラーがあります。赤いセルを修正してから確定してください。')
      return
    }

    setStatus('saving')
    setMessage('')
    try {
      const items = rows.map(r => ({
        date:      r.date,
        meal_type: r.meal_type as MealType,
        category:  r.category.trim(),
        menu_name: r.menu_name.trim(),
        tags:      r.tags ? r.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
        note:      r.note.trim(),
      }))
      const result = await bulkImportMenuItemsAction(items)
      if (!result.success) throw new Error(result.error)
      setStatus('success')
      setMessage(`${result.count} 件のメニューデータを保存しました。`)
      setRows([])
      setErrors(new Map())
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : '保存中にエラーが発生しました。')
    }
  }

  const errorCount = errors.size

  return (
    <div className="p-4 lg:p-8 max-w-screen-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-6">CSVインポート</h1>

      {/* アップロードエリア */}
      {rows.length === 0 && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
        >
          <Upload className="w-12 h-12 text-slate-400" />
          <div className="text-center">
            <p className="font-medium text-slate-700">CSVファイルをドラッグ＆ドロップ</p>
            <p className="text-sm text-slate-500 mt-1">または クリックしてファイルを選択</p>
          </div>
          <p className="text-xs text-slate-400 text-center">
            形式: 日付, 食事区分, カテゴリ, メニュー名
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {/* 読み込み済み */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-medium text-slate-700">{rows.length} 行読み込み済み</span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorCount} 行にエラー
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setRows([]); setErrors(new Map()); setStatus('idle'); setMessage('') }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />やり直す
            </button>
            <button
              onClick={handleConfirm}
              disabled={status === 'saving'}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {status === 'saving' ? '保存中...' : '確定して保存'}
            </button>
          </div>
        </div>
      )}

      {/* ステータスメッセージ */}
      {message && (
        <div className={`mb-4 flex items-start gap-3 rounded-lg px-4 py-3 border ${
          status === 'success'
            ? 'bg-green-50 border-green-200 text-green-800 text-sm'
            : 'bg-red-100 border-red-400 text-red-900 text-sm font-medium shadow-sm'
        }`}>
          {status === 'success'
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
            : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
          }
          <span className="break-all">{message}</span>
        </div>
      )}

      {/* プレビューテーブル */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8 px-2 py-2.5 text-slate-400 font-normal text-center text-xs">#</th>
                {COLUMNS.map(c => (
                  <th key={c.key} className={`${c.width} px-3 py-2.5 text-left text-xs font-semibold text-slate-600 whitespace-nowrap`}>
                    {c.label}
                  </th>
                ))}
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIdx) => {
                const rowErrors = errors.get(row.id) ?? {}
                const hasError  = Object.keys(rowErrors).length > 0
                return (
                  <tr key={row.id} className={`group ${hasError ? 'bg-red-50/50' : 'hover:bg-slate-50/60'}`}>
                    <td className="px-2 py-1.5 text-center text-xs text-slate-400">{rowIdx + 1}</td>
                    {COLUMNS.map(col => {
                      const isEditing = editing?.rowId === row.id && editing?.col === col.key
                      const cellError = rowErrors[col.key]
                      return (
                        <td key={col.key} className="px-1 py-1">
                          {isEditing ? (
                            col.key === 'menu_name' ? (
                              <textarea
                                autoFocus
                                value={editValue}
                                onChange={e => setEditVal(e.target.value)}
                                onBlur={() => commitEdit(row.id, col.key)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') setEditing(null)
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitEdit(row.id, col.key)
                                }}
                                rows={2}
                                className="w-full px-2 py-1 rounded border border-teal-400 outline-none ring-1 ring-teal-300 bg-white text-slate-800 text-xs resize-none"
                              />
                            ) : (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditVal(e.target.value)}
                                onBlur={() => commitEdit(row.id, col.key)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitEdit(row.id, col.key)
                                  if (e.key === 'Escape') setEditing(null)
                                }}
                                className="w-full px-2 py-1 rounded border border-teal-400 outline-none ring-1 ring-teal-300 bg-white text-slate-800 text-xs"
                              />
                            )
                          ) : (
                            <button
                              type="button"
                              title={cellError ?? 'クリックして編集'}
                              onClick={() => startEdit(row.id, col.key, row[col.key])}
                              className={`w-full text-left px-2 py-1 rounded text-xs leading-relaxed transition-colors ${
                                cellError
                                  ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                                  : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800 border border-transparent'
                              }`}
                            >
                              {row[col.key] || <span className="text-slate-300 italic">（空）</span>}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                        title="この行を削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* エラー一覧 */}
      {errorCount > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            入力エラー（赤いセルをクリックして修正してください）
          </p>
          <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
            {[...errors.entries()].map(([rowId, errs]) => {
              const rowNum = rows.findIndex(r => r.id === rowId) + 1
              return Object.entries(errs).map(([col, msg]) => (
                <li key={`${rowId}-${col}`}>{rowNum} 行目 {COLUMNS.find(c => c.key === col)?.label}：{msg}</li>
              ))
            })}
          </ul>
        </div>
      )}

      {/* フォーマット説明 */}
      <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">CSVフォーマット</h2>
        <p className="text-xs text-slate-500 mb-3">ヘッダー行は任意です。4〜6列で記述してください。</p>
        <code className="block text-xs bg-white rounded border border-slate-200 px-3 py-2 font-mono text-slate-700 whitespace-pre overflow-x-auto">
{`日付,食事区分,カテゴリ,メニュー名,タグ,注意事項
2026/03/01,朝食,主食,白飯,,
2026/03/01,朝食,主菜,焼き魚,魚|アレルゲン,骨に注意
2026/03/01,朝食,汁物,味噌汁,,
2026/03/01,昼食,主食,ご飯,,
2026/03/01,昼食,主菜,鶏の唐揚げ,肉|揚げ物,揚げ温度170度を厳守
2026/03/01,昼食,副菜,ひじきの煮物,,`}
        </code>
        <ul className="mt-3 text-xs text-slate-500 space-y-0.5 list-disc list-inside">
          <li>日付: YYYY/MM/DD または YYYY-MM-DD</li>
          <li>食事区分: 朝食 / 昼食 / 夕食</li>
          <li>カテゴリ: 自由テキスト（例: 主食、主菜、副菜、汁物）</li>
          <li>タグ: "|"（縦棒）区切りで複数指定可（例: 肉|アレルゲン）。省略可。</li>
          <li>注意事項: 作業時に表示するマニュアルメモ。省略可。</li>
          <li>同じ献立を複数行に分けて登録できます（1メニュー1行）</li>
        </ul>
      </div>
    </div>
  )
}
