'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { upsertEquipmentCheckLog } from '@/lib/api/equipmentCheckLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  date:             string
  initialItems:     CheckItem[]
  initialConfirmer: string
  initialAdminSign: string
}

export function EquipmentCheckCard({
  date,
  initialItems,
  initialConfirmer,
  initialAdminSign,
}: Props) {
  const [items,      setItems]      = useState<CheckItem[]>(initialItems)
  const [confirmer,  setConfirmer]  = useState(initialConfirmer)
  const [adminSign,  setAdminSign]  = useState(initialAdminSign)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const confirmerRef   = useRef(confirmer)
  const adminSignRef   = useRef(adminSign)
  const itemsRef       = useRef(items)
  confirmerRef.current  = confirmer
  adminSignRef.current  = adminSign
  itemsRef.current      = items

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = async () => {
    setSaveStatus('saving')
    try {
      await upsertEquipmentCheckLog(
        date,
        itemsRef.current,
        confirmerRef.current,
        adminSignRef.current,
      )
      setSaveStatus('saved')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      console.error('[EquipmentCheckCard] save error', e)
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

  const handleConfirmerChange = (v: string) => {
    setConfirmer(v)
    confirmerRef.current = v
    save()
  }

  const handleAdminSignChange = (v: string) => {
    setAdminSign(v)
    adminSignRef.current = v
    save()
  }

  const checkedCount = items.filter(i => i.checked).length
  const allChecked   = checkedCount === items.length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-slate-700">🍳 厨房機器点検表</h2>
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

      {/* ── 確認者 ── */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600">確認者</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={confirmer}
            onChange={e => handleConfirmerChange(e.target.value)}
            placeholder="確認者名を入力"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <VoiceInputButton onResult={text => handleConfirmerChange(text)} title="確認者を音声入力" />
        </div>
      </div>

      {/* ── 管理者サイン ── */}
      <SignaturePad value={adminSign} onChange={handleAdminSignChange} />
    </div>
  )
}
