'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { upsertFinalCheckLog } from '@/lib/api/finalCheckLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  date:         string
  initialItems: CheckItem[]
}

export function FinalChecklistCard({ date, initialItems }: Props) {
  const [items,      setItems]      = useState<CheckItem[]>(initialItems)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggle = async (key: string) => {
    const next = items.map(item =>
      item.key === key ? { ...item, checked: !item.checked } : item,
    )
    setItems(next)
    setSaveStatus('saving')
    try {
      await upsertFinalCheckLog(date, next)
      setSaveStatus('saved')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      console.error('[FinalChecklistCard] save error', e)
      setSaveStatus('idle')
    }
  }

  const checkedCount = items.filter(i => i.checked).length
  const allChecked   = checkedCount === items.length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-700">✅ 最終点検チェック</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            allChecked
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {checkedCount} / {items.length}
          </span>
        </div>
        <div>
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />保存中…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-teal-600">
              <CheckCircle2 className="w-3 h-3" />保存済み
            </span>
          )}
        </div>
      </div>

      {/* ── チェックリスト ── */}
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                item.checked
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-teal-300'
              }`}
            >
              {item.checked
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                : <Circle       className="w-5 h-5 text-slate-300 shrink-0" />
              }
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
