import { Star, Clock, MessageSquare } from 'lucide-react'
import { WorkRecord } from '@/lib/types'

interface Props {
  records: WorkRecord[]
}

function avg(r: WorkRecord) {
  return ((r.prep_score + r.measure_score + r.cook_score + r.serve_score) / 4).toFixed(1)
}

function scoreColor(v: string) {
  const n = parseFloat(v)
  if (n >= 8) return 'text-green-600'
  if (n >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

export function EvaluationTimeline({ records }: Props) {
  if (records.length === 0) {
    return <p className="text-sm text-slate-400 py-3">まだ評価データがありません</p>
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <ul className="space-y-3">
      {sorted.map(record => {
        const score = avg(record)
        return (
          <li key={record.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-slate-800">
                  {record.schedule?.menu?.name ?? '（メニュー不明）'}
                </span>
                <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}</span>
                <span className="text-xs text-slate-400 ml-auto">{formatTime(record.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {record.total_time}分
                </span>
                <span className="text-xs text-slate-400">
                  {record.schedule?.meal_type}
                </span>
              </div>
              {record.note && (
                <div className="flex items-start gap-1 mt-1.5">
                  <MessageSquare className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 line-clamp-2">{record.note}</p>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
