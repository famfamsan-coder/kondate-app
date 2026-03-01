import { MessageSquare } from 'lucide-react'
import type { Ooda, OodaStatus } from '@/lib/types'

const STATUS_STYLE: Record<OodaStatus, string> = {
  'Observe': 'bg-sky-100 text-sky-700 border-sky-200',
  'Orient':  'bg-violet-100 text-violet-700 border-violet-200',
  'Decide':  'bg-amber-100 text-amber-700 border-amber-200',
  'Act':     'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const STATUS_JA: Record<OodaStatus, string> = {
  'Observe': '観察',
  'Orient':  '判断',
  'Decide':  '対策',
  'Act':     '実施済',
}

const STATUS_ICON: Record<OodaStatus, string> = {
  'Observe': '👁',
  'Orient':  '🔍',
  'Decide':  '💡',
  'Act':     '✅',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

interface Props {
  items: Ooda[]
}

export function OodaTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        まだ課題・改善メモはありません
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.slice(0, 8).map(item => (
        <li
          key={item.id}
          className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
        >
          {/* アイコン */}
          <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-base leading-none">
            {STATUS_ICON[item.status]}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${STATUS_STYLE[item.status]}`}>
                {STATUS_JA[item.status]}
              </span>
              <span className="text-xs text-slate-500">{item.category}</span>
              <span className="text-xs text-slate-400 ml-auto">{formatTime(item.created_at)}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
            {item.menu_item && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                🍱 {item.menu_item.date} {item.menu_item.meal_type} — {item.menu_item.menu_name}
              </p>
            )}
            {item.content && item.content !== item.title && (
              <div className="flex items-start gap-1 mt-1">
                <MessageSquare className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 line-clamp-2">{item.content}</p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
