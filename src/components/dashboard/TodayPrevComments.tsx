import type { MenuItem } from '@/lib/types'

// カテゴリ → バッジ色
const CATEGORY_BADGE: Record<string, string> = {
  '主食':    'bg-amber-100 text-amber-800',
  '主菜':    'bg-red-100 text-red-800',
  '副菜':    'bg-green-100 text-green-800',
  '汁物':    'bg-blue-100 text-blue-800',
  'デザート': 'bg-pink-100 text-pink-800',
}
const DEFAULT_BADGE = 'bg-slate-100 text-slate-600'

function formatPrevDate(dateStr: string): string {
  const d   = new Date(`${dateStr}T00:00:00Z`)
  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getUTCDay()]}）前回`
}

interface Props {
  // 本日のメニュー（meal_type ごとにラベル表示するため）
  todayItems:    MenuItem[]
  // 同名メニューの過去改善メモ（menu_name をキーに照合）
  prevComments:  MenuItem[]
}

export function TodayPrevComments({ todayItems, prevComments }: Props) {
  if (prevComments.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        本日のメニューに紐づく前回の改善メモはありません
      </p>
    )
  }

  // meal_type 順に todayItems を並べ、それぞれに前回メモがあれば表示
  const mealOrder = ['朝食', '昼食', '夕食']
  const prevMap = new Map(prevComments.map(p => [p.menu_name, p]))

  // today のメニューを meal_type 順・同 meal_type は元の順序で
  const sorted = [...todayItems].sort(
    (a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type)
  )

  const rows = sorted.filter(m => prevMap.has(m.menu_name))
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        本日のメニューに紐づく前回の改善メモはありません
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map(todayItem => {
        const prev = prevMap.get(todayItem.menu_name)!
        const badge = CATEGORY_BADGE[todayItem.category] ?? DEFAULT_BADGE
        return (
          <li
            key={todayItem.id}
            className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3"
          >
            {/* ヘッダー行 */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-semibold text-sky-600 bg-white border border-sky-200 rounded-lg px-2 py-0.5 shrink-0">
                {todayItem.meal_type}
              </span>
              <span className="text-sm font-bold text-slate-800">{todayItem.menu_name}</span>
              {todayItem.category && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge}`}>
                  {todayItem.category}
                </span>
              )}
              <span className="text-xs text-sky-400 ml-auto shrink-0">
                {formatPrevDate(prev.date)}
              </span>
            </div>
            {/* 前回の改善メモ本文 */}
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {prev.comment}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
