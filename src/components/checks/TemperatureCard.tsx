'use client'

import { useState, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { upsertTemperatureLog } from '@/lib/api/temperatureLog'
import type { TempSlots } from '@/lib/api/temperatureLog'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  date:             string
  initialFridge:    TempSlots
  initialFreezer:   TempSlots
  initialAssignee?: string
}

export function TemperatureCard({
  date,
  initialFridge,
  initialFreezer,
  initialAssignee = '',
}: Props) {
  const [fridge,     setFridge]     = useState<TempSlots>(initialFridge)
  const [freezer,    setFreezer]    = useState<TempSlots>(initialFreezer)
  const [assignee,   setAssignee]   = useState(initialAssignee)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const fridgeRef   = useRef<TempSlots>(fridge)
  const freezerRef  = useRef<TempSlots>(freezer)
  const assigneeRef = useRef(assignee)
  fridgeRef.current   = fridge
  freezerRef.current  = freezer
  assigneeRef.current = assignee

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveStatus('saving')
    timerRef.current = setTimeout(async () => {
      try {
        const ok = await upsertTemperatureLog(
          date,
          fridgeRef.current,
          freezerRef.current,
          assigneeRef.current,
        )
        if (ok) {
          setSaveStatus('saved')
          if (savedTimer.current) clearTimeout(savedTimer.current)
          savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('idle')
        }
      } catch (e) {
        console.error('[TemperatureCard] save error', e)
        setSaveStatus('idle')
      }
    }, 600)
  }, [date])

  const updateSlot = (which: 'fridge' | 'freezer', i: number, raw: string) => {
    const parsed = parseFloat(raw)
    const v: number | null = raw === '' || isNaN(parsed) ? null : parsed
    if (which === 'fridge') {
      setFridge(prev => prev.map((cur, idx) => idx === i ? v : cur) as TempSlots)
    } else {
      setFreezer(prev => prev.map((cur, idx) => idx === i ? v : cur) as TempSlots)
    }
    schedSave()
  }

  const handleAssigneeChange = (v: string) => {
    setAssignee(v)
    assigneeRef.current = v
    schedSave()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700">🌡️ 温度管理</h2>
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
        </div>
      </div>

      {/* ── 冷蔵庫 No.1〜5 ── */}
      <TempSection
        label="冷蔵庫（℃）"
        slots={fridge}
        startIndex={0}
        accentClass="border-sky-200 bg-sky-50 focus:ring-sky-400"
        emptyClass="border-slate-200 bg-slate-50 focus:ring-slate-300"
        onChange={(i, raw) => updateSlot('fridge', i, raw)}
      />

      {/* ── 冷凍庫 No.6〜7 ── */}
      <TempSection
        label="冷凍庫（℃）"
        slots={freezer}
        startIndex={5}
        accentClass="border-indigo-200 bg-indigo-50 focus:ring-indigo-400"
        emptyClass="border-slate-200 bg-slate-50 focus:ring-slate-300"
        onChange={(i, raw) => updateSlot('freezer', i, raw)}
      />

      {/* ── 担当者 ── */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600">担当者</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={assignee}
            onChange={e => handleAssigneeChange(e.target.value)}
            placeholder="担当者名を入力"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <VoiceInputButton
            onResult={text => handleAssigneeChange(text)}
            title="担当者名を音声入力"
          />
        </div>
      </div>
    </div>
  )
}

// ─── 内部コンポーネント ────────────────────────────────────────────────────

function TempSection({
  label, slots, startIndex, accentClass, emptyClass, onChange,
}: {
  label:       string
  slots:       TempSlots
  startIndex:  number
  accentClass: string
  emptyClass:  string
  onChange:    (i: number, raw: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((v, i) => (
          <label key={i} className="flex flex-col items-center gap-1 min-w-[56px]">
            <span className="text-xs text-slate-400">No.{startIndex + i + 1}</span>
            <input
              type="number"
              step="0.1"
              value={v ?? ''}
              onChange={e => onChange(i, e.target.value)}
              placeholder="—"
              className={`w-full text-center border rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 ${
                v !== null ? accentClass : emptyClass
              }`}
            />
          </label>
        ))}
      </div>
      {slots.some(v => v === null) && (
        <p className="mt-1.5 text-xs text-slate-400">
          未入力: {slots.filter(v => v === null).length} 箇所
        </p>
      )}
    </div>
  )
}
