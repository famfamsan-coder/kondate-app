import Link from 'next/link'
import { Thermometer, CheckCircle2, ChevronRight } from 'lucide-react'

interface Props {
  fridgeMissing:  number
  freezerMissing: number
  uncheckedItems: number
}

export function CheckStatusBanner({ fridgeMissing, freezerMissing, uncheckedItems }: Props) {
  const hasIncomplete = fridgeMissing > 0 || freezerMissing > 0 || uncheckedItems > 0

  return (
    <Link
      href="/checks"
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-colors ${
        hasIncomplete
          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
      }`}
    >
      {hasIncomplete
        ? <Thermometer  className="w-4 h-4 text-amber-500 shrink-0" />
        : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      }
      <span className={`text-sm font-semibold shrink-0 ${hasIncomplete ? 'text-amber-700' : 'text-emerald-700'}`}>
        温度・点検チェック
      </span>

      <div className="flex gap-2 flex-wrap flex-1">
        {fridgeMissing > 0 && (
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
            冷蔵 {fridgeMissing} 未入力
          </span>
        )}
        {freezerMissing > 0 && (
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
            冷凍 {freezerMissing} 未入力
          </span>
        )}
        {uncheckedItems > 0 && (
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
            点検 {uncheckedItems} 未完了
          </span>
        )}
        {!hasIncomplete && (
          <span className="text-xs text-emerald-600">すべて完了 ✓</span>
        )}
      </div>

      <ChevronRight className={`w-4 h-4 shrink-0 ${hasIncomplete ? 'text-amber-400' : 'text-emerald-400'}`} />
    </Link>
  )
}
