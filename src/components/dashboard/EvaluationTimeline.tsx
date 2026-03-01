import { Clock } from 'lucide-react'
import type { MenuItem } from '@/lib/types'

interface Props {
  items: MenuItem[]
}

function totalTime(item: MenuItem): number {
  return item.prep_time + item.measure_time + item.cook_time + item.serve_time
}

function timeColor(minutes: number): string {
  if (minutes >= 60) return 'text-red-600'
  if (minutes >= 30) return 'text-amber-600'
  return 'text-green-600'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

export function EvaluationTimeline({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 py-3">まだ作業記録がありません</p>
  }

  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <ul className="space-y-3">
      {sorted.map(item => {
        const total = totalTime(item)
        return (
          <li key={item.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-slate-800 truncate max-w-[160px]">
                  {item.menu_name}
                </span>
                {item.category && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0">
                    {item.category}
                  </span>
                )}
                {total > 0 && (
                  <span className={`text-sm font-bold ${timeColor(total)}`}>{total}分</span>
                )}
                <span className="text-xs text-slate-400 ml-auto">{formatTime(item.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="text-xs text-slate-400">{item.date} {item.meal_type}</span>
                {total > 0 && (
                  <span className="text-xs text-slate-400">
                    仕込{item.prep_time}+計量{item.measure_time}+調理{item.cook_time}+盛{item.serve_time}分
                  </span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
