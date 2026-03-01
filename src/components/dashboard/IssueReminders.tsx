'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { Ooda, OodaStatus } from '@/lib/types'

const OODA_STATUS: Record<OodaStatus, { label: string; style: string }> = {
  'Observe': { label: '観察中', style: 'bg-sky-100 text-sky-700 border-sky-200' },
  'Orient':  { label: '判断中', style: 'bg-violet-100 text-violet-700 border-violet-200' },
  'Decide':  { label: '対策中', style: 'bg-amber-100 text-amber-700 border-amber-200' },
  'Act':     { label: '実施済', style: 'bg-green-100 text-green-700 border-green-200' },
}

interface Props {
  /** Act 以外の Ooda アイテムのみ渡す（親の DashboardClientTop でフィルタ済み） */
  issues:    Ooda[]
  onResolve: (oodaId: string, actionMemo: string) => Promise<void>
}

export function IssueReminders({ issues, onResolve }: Props) {
  const [confirmingIssue, setConfirmingIssue] = useState<Ooda | null>(null)
  const [actionMemo,      setActionMemo]      = useState('')
  const [saving,          setSaving]          = useState(false)

  // Escape でモーダルを閉じる
  useEffect(() => {
    if (!confirmingIssue) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmingIssue])

  const handleCancel = () => {
    setConfirmingIssue(null)
    setActionMemo('')
  }

  const handleComplete = async () => {
    if (!confirmingIssue) return
    setSaving(true)
    await onResolve(confirmingIssue.id, actionMemo)
    setSaving(false)
    setConfirmingIssue(null)
    setActionMemo('')
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        今週の未解決課題はありません
      </div>
    )
  }

  return (
    <>
      {/* ── 課題リスト ── */}
      <ul className="space-y-2">
        {issues.map(ooda => (
          <li key={ooda.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-slate-800">{ooda.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${OODA_STATUS[ooda.status].style}`}>
                    {OODA_STATUS[ooda.status].label}
                  </span>
                </div>
                {ooda.content && (
                  <p className="text-xs text-slate-600 line-clamp-2">{ooda.content}</p>
                )}
                {ooda.menu_item && (
                  <p className="text-xs text-teal-600 mt-0.5">
                    🍱 {ooda.menu_item.date} {ooda.menu_item.meal_type} {ooda.menu_item.menu_name}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmingIssue(ooda)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-slate-200 hover:border-green-400 hover:text-green-700 hover:bg-green-50 text-slate-500 rounded-lg transition-all font-medium"
              >
                <CheckCircle2 className="w-3 h-3" />
                対応済みにする
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* ── 対応内容入力モーダル ── */}
      {confirmingIssue && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onMouseDown={e => { if (e.target === e.currentTarget) handleCancel() }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">課題を解決済みにする</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                <span className="font-medium text-slate-700">{confirmingIssue.title}</span>
                {confirmingIssue.content && ` — ${confirmingIssue.content}`}
              </p>
            </div>

            <div className="px-5 py-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                対応内容
                <span className="text-slate-400 font-normal ml-1">（任意）</span>
              </label>
              <textarea
                value={actionMemo}
                onChange={e => setActionMemo(e.target.value)}
                rows={4}
                autoFocus
                placeholder={"どのように対応しましたか？\n入力すると OODA ボードの「Act（実施済み）」として自動記録されます。"}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-300"
              />
              {actionMemo.trim() && (
                <p className="text-xs text-teal-600 mt-1.5 flex items-center gap-1">
                  ✅ OODAボードの「Act」として記録されます
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end px-5 pb-5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />処理中…</>
                  : actionMemo.trim()
                    ? <><CheckCircle2 className="w-3.5 h-3.5" />入力して完了</>
                    : <><CheckCircle2 className="w-3.5 h-3.5" />そのまま完了</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
