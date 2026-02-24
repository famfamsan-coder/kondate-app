'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { MealType, Schedule } from '@/lib/types'
import { calcNutrition } from '@/lib/utils'

// デフォルト目安時間（食事区分ごと）
export const DEFAULT_WARNING_MINUTES: Record<MealType, number> = {
  '朝食': 60,
  '昼食': 120,
  '夕食': 90,
}

interface Props {
  schedules: Schedule[]
  warningMinutes?: Partial<Record<MealType, number>>
}

const MEAL_COLORS: Record<MealType, string> = {
  '朝食': '#0d9488',
  '昼食': '#f59e0b',
  '夕食': '#6366f1',
}

const MEAL_TYPES: MealType[] = ['朝食', '昼食', '夕食']

export function WorkloadChart({ schedules, warningMinutes }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const warnings: Record<MealType, number> = {
    ...DEFAULT_WARNING_MINUTES,
    ...warningMinutes,
  }

  const data = MEAL_TYPES.map(meal => {
    const s = schedules.filter(x => x.meal_type === meal)
    const n = calcNutrition(s)
    const limit = warnings[meal]
    return {
      name: meal,
      予測時間: n.total_time,
      目安: limit,
      超過: n.total_time >= limit,
    }
  })

  if (!mounted) {
    return <div className="h-48 animate-pulse bg-slate-100 rounded-xl" />
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis unit="分" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number | undefined, name: string | undefined) => {
            if (value == null) return ['—', name ?? '']
            if (name === '予測時間') return [`${value}分`, '予測作業時間']
            if (name === '目安') return [`${value}分`, '目安時間']
            return [`${value}`, name ?? '']
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {value === '予測時間' ? '予測作業時間' : value === '目安' ? '目安（食事区分別）' : value}
            </span>
          )}
        />

        {/* 実績バー */}
        <Bar dataKey="予測時間" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map(d => (
            <Cell
              key={d.name}
              fill={d.超過 ? '#ef4444' : MEAL_COLORS[d.name as MealType]}
            />
          ))}
        </Bar>

        {/* 目安ライン（各食事区分で異なる値） */}
        <Line
          dataKey="目安"
          type="linear"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#f59e0b', r: 5, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
