'use client'

import { useState } from 'react'
import { Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { insertOoda } from '@/lib/api/ooda'
import type { MenuItem } from '@/lib/types'

// カテゴリ → バッジ色（/record と同じ定義）
const CATEGORY_BADGE: Record<string, string> = {
  '主食':    'bg-amber-100 text-amber-800',
  '主菜':    'bg-red-100 text-red-800',
  '副菜':    'bg-green-100 text-green-800',
  '汁物':    'bg-blue-100 text-blue-800',
  'デザート': 'bg-pink-100 text-pink-800',
}
const DEFAULT_BADGE = 'bg-slate-100 text-slate-600'

function formatLabel(dateStr: string, mealType: string): string {
  const d   = new Date(`${dateStr}T00:00:00Z`)
  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getUTCDay()]}）${mealType}`
}

// ── 1件カード ──────────────────────────────────────────────────────────────

function NoteCard({ item }: { item: MenuItem }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const handleRegister = async () => {
    if (status !== 'idle') return
    setStatus('sending')
    try {
      await insertOoda({
        menu_item_id: item.id,
        title:        `[${item.menu_name}] の改善メモ`,
        content:      item.comment,
        category:     '献立',
        status:       'Observe',
      })
      setStatus('done')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const badge = CATEGORY_BADGE[item.category] ?? DEFAULT_BADGE

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
      {/* ヘッダー行 */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-slate-400 shrink-0">
          {formatLabel(item.date, item.meal_type)}
        </span>
        <span className="text-sm font-semibold text-slate-700">{item.menu_name}</span>
        {item.category && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge}`}>
            {item.category}
          </span>
        )}
      </div>

      {/* コメント本文 */}
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-2">
        {item.comment}
      </p>

      {/* OODAに登録ボタン */}
      <div className="flex justify-end">
        {status === 'done' ? (
          <span className="text-xs text-teal-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            OODAボードに登録済み
          </span>
        ) : status === 'error' ? (
          <span className="text-xs text-red-500">登録に失敗しました</span>
        ) : (
          <button
            type="button"
            onClick={handleRegister}
            disabled={status === 'sending'}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 border border-slate-200 hover:border-teal-300 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
          >
            {status === 'sending'
              ? <><Loader2 className="w-3 h-3 animate-spin" />登録中…</>
              : <><Plus className="w-3 h-3" />OODAに課題登録</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────────────────────────────

export function FieldNotes({ items }: { items: MenuItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        まだ改善メモが記入されていません
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <NoteCard key={item.id} item={item} />
      ))}
    </div>
  )
}
