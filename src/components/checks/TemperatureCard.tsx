'use client'

import { useState, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { upsertTemperatureLog } from '@/lib/api/temperatureLog'
import type { TempSlots } from '@/lib/api/temperatureLog'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  date:           string
  initialFridge:  TempSlots
  initialFreezer: TempSlots
}

export function TemperatureCard({ date, initialFridge, initialFreezer }: Props) {
  const [fridge,     setFridge]     = useState<TempSlots>(initialFridge)
  const [freezer,    setFreezer]    = useState<TempSlots>(initialFreezer)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // debounce 中でも最新値を読めるよう ref で保持
  const fridgeRef    = useRef<TempSlots>(fridge)
  const freezerRef   = useRef<TempSlots>(freezer)
  fridgeRef.current  = fridge
  freezerRef.current = freezer

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveStatus('saving')
    timerRef.current = setTimeout(async () => {
      try {
        const ok = await upsertTemperatureLog(date, fridgeRef.current, freezerRef.current)
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

  const updateSlot = (
    which: 'fridge' | 'freezer',
    i: number,
    raw: string,
  ) => {
    const parsed = parseFloat(raw)
    const v: number | null = raw === '' || isNaN(parsed) ? null : parsed
    if (which === 'fridge') {
      setFridge(prev => prev.map((cur, idx) => idx === i ? v : cur) as TempSlots)
    } else {
      setFreezer(prev => prev.map((cur, idx) => idx === i ? v : cur) as TempSlots)
    }
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

      {/* ── 冷蔵庫 ── */}
      <TempSection
        label="冷蔵庫（℃）"
        slots={fridge}
        accentClass="border-sky-200 bg-sky-50 focus:ring-sky-400"
        emptyClass="border-slate-200 bg-slate-50 focus:ring-slate-300"
        onChange={(i, raw) => updateSlot('fridge', i, raw)}
      />

      {/* ── 冷凍庫 ── */}
      <TempSection
        label="冷凍庫（℃）"
        slots={freezer}
        accentClass="border-indigo-200 bg-indigo-50 focus:ring-indigo-400"
        emptyClass="border-slate-200 bg-slate-50 focus:ring-slate-300"
        onChange={(i, raw) => updateSlot('freezer', i, raw)}
      />
    </div>
  )
}

// ─── 内部コンポーネント ────────────────────────────────────────────────────

function TempSection({
  label, slots, accentClass, emptyClass, onChange,
}: {
  label:       string
  slots:       TempSlots
  accentClass: string
  emptyClass:  string
  onChange:    (i: number, raw: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600 mb-2">{label}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {slots.map((v, i) => (
          <label key={i} className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">{i + 1}号機</span>
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
      {/* 未入力バッジ */}
      {slots.some(v => v === null) && (
        <p className="mt-1.5 text-xs text-slate-400">
          未入力: {slots.filter(v => v === null).length} 箇所
        </p>
      )}
    </div>
  )
}
