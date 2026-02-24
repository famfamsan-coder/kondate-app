'use client'

import { Star, X } from 'lucide-react'

interface StarRatingProps {
  value: number      // 0 = 不要/未評価、1〜10 = 作業負荷
  onChange: (v: number) => void
  label: string
}

export function StarRating({ value, onChange, label }: StarRatingProps) {
  // 同じ星を再タップ → 0にリセット（トグル）
  const handleClick = (n: number) => onChange(value === n ? 0 : n)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          {value > 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              title="クリア（0に戻す）"
            >
              <X className="w-3 h-3" />
              クリア
            </button>
          )}
          <span className={`text-sm font-bold tabular-nums ${value === 0 ? 'text-slate-400' : 'text-teal-600'}`}>
            {value} / 10
          </span>
        </div>
      </div>

      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => handleClick(n)}
            className="touch-manipulation p-0.5 focus:outline-none active:scale-90 transition-transform"
            aria-label={`${n}点${value === n ? '（タップでクリア）' : ''}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                n <= value
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-200 fill-slate-200'
              }`}
            />
          </button>
        ))}
      </div>

      <div className="flex justify-between text-xs text-slate-400 px-0.5">
        <span>0 = 不要</span>
        <span className="text-amber-600">1★ = 5分</span>
        <span>10 = 負荷大</span>
      </div>
    </div>
  )
}
