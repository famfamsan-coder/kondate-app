'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, Printer } from 'lucide-react'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { upsertCleaningCheckLog } from '@/lib/api/cleaningCheckLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  date:            string
  initialItems:    CheckItem[]
  initialAssignee: string
}

export function CleaningCheckCard({ date, initialItems, initialAssignee }: Props) {
  const [items,      setItems]      = useState<CheckItem[]>(initialItems)
  const [assignee,   setAssignee]   = useState(initialAssignee)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const assigneeRef = useRef(assignee)
  const itemsRef    = useRef(items)
  assigneeRef.current = assignee
  itemsRef.current    = items

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = async () => {
    setSaveStatus('saving')
    try {
      await upsertCleaningCheckLog(date, itemsRef.current, assigneeRef.current, '')
      setSaveStatus('saved')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      console.error('[CleaningCheckCard] save error', e)
      setSaveStatus('idle')
    }
  }

  const toggle = async (key: string) => {
    const next = items.map(item =>
      item.key === key ? { ...item, checked: !item.checked } : item,
    )
    setItems(next)
    itemsRef.current = next
    await save()
  }

  const handleAssigneeChange = (v: string) => {
    setAssignee(v)
    assigneeRef.current = v
    save()
  }

  const checkedCount = items.filter(i => i.checked).length
  const allChecked   = checkedCount === items.length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 print:shadow-none print:border-0">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-slate-700">🧹 厨房清掃管理点検表</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            allChecked
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {checkedCount} / {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            印刷
          </button>
        </div>
      </div>

      <div className="hidden print:block text-sm text-slate-600 border-b pb-2">
        実施日：{date}
      </div>

      {/* ── チェックリスト ── */}
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left print:pointer-events-none ${
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

      {/* ── 担当者 ── */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600">担当者</label>
        <div className="flex gap-2">
          <input
            type="text"
            list="cleaning-assignee-list"
            value={assignee}
            onChange={e => handleAssigneeChange(e.target.value)}
            placeholder="担当者名を入力または選択"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <VoiceInputButton onResult={text => handleAssigneeChange(text)} title="担当者名を音声入力" />
        </div>
        <datalist id="cleaning-assignee-list">
          <option value="担当者A" />
          <option value="担当者B" />
          <option value="担当者C" />
        </datalist>
      </div>
    </div>
  )
}
