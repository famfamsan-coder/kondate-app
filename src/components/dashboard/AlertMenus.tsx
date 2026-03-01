'use client'

import type { MenuItem, Ooda } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  menuItems: MenuItem[]  // 直近3日間の MenuItem
  oodas:     Ooda[]      // 全 Ooda アイテム（menu_item_id チェック用）
}

export function AlertMenus({ menuItems, oodas }: Props) {
  // menu_item_id → 未解決 Ooda 件数 マップ
  const oodaCountMap = new Map<string, number>()
  for (const o of oodas) {
    if (!o.menu_item_id || o.status === 'Act') continue
    oodaCountMap.set(o.menu_item_id, (oodaCountMap.get(o.menu_item_id) ?? 0) + 1)
  }

  // 要注意判定：未解決 Ooda が紐づいている MenuItem
  const alertItems = menuItems.filter(m => (oodaCountMap.get(m.id) ?? 0) > 0)

  if (alertItems.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        直近3日間に要注意のメニューはありません
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {alertItems.map(m => {
        const oodaCount = oodaCountMap.get(m.id) ?? 0
        return (
          <li
            key={m.id}
            className="flex gap-3 items-start p-2.5 -mx-1 rounded-xl bg-amber-50/60 border border-amber-100"
          >
            {/* 日付・食事区分バッジ */}
            <div className="shrink-0 pt-0.5">
              <span className="block text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2 py-0.5 text-center whitespace-nowrap">
                {formatDate(m.date)}&nbsp;{m.meal_type}
              </span>
            </div>

            {/* メニュー名 + 課題カウント */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {oodaCount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                    未解決課題 {oodaCount}件
                  </span>
                )}
                {m.category && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0">
                    {m.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {m.menu_name || <span className="text-slate-400 italic">（名称未入力）</span>}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
