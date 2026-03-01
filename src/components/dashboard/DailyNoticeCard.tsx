'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Loader2, CheckCircle2, X } from 'lucide-react'
import { upsertDailyNotice } from '@/lib/api/dailyNotice'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  date:           string
  initialContent: string
}

export function DailyNoticeCard({ date, initialContent }: Props) {
  const [content,    setContent]    = useState(initialContent)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timerRef.current)   clearTimeout(timerRef.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const save = useCallback(async (text: string) => {
    setSaveStatus('saving')
    try {
      await upsertDailyNotice(date, text)
      setSaveStatus('saved')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      console.error('[DailyNoticeCard] save error', e)
      setSaveStatus('idle')
    }
  }, [date])

  const handleChange = (text: string) => {
    setContent(text)
    setSaveStatus('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(text), 600)
  }

  return (
    <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-5">
      {/* ── ヘッダー ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-600 shrink-0" />
            <h2 className="font-bold text-slate-700">今日のお知らせ</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 ml-6">
            朝礼で共有された内容（入退所、誕生日、注意事項など）をメモできます
          </p>
        </div>

        {/* 保存状態 + クリア */}
        <div className="flex items-center gap-3 shrink-0">
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
          {content && (
            <button
              type="button"
              onClick={() => handleChange('')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              aria-label="クリア"
            >
              <X className="w-3.5 h-3.5" />クリア
            </button>
          )}
        </div>
      </div>

      {/* ── テキストエリア ── */}
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        rows={3}
        placeholder="例: 〇〇さん誕生日（昼食に特別デザート）/ △△さん本日退所 / アレルギー要確認"
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />
    </div>
  )
}
