'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { MealType, MEAL_TYPES } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { useMenuItems, buildKey } from '@/lib/menuItemContext'

// ──────────────────────────────────────────────
// 食事区分カラー設定
// ──────────────────────────────────────────────
const MEAL_COLORS: Record<MealType, string> = {
  '朝食': 'bg-sky-50 text-sky-700 border-sky-200',
  '昼食': 'bg-amber-50 text-amber-700 border-amber-200',
  '夕食': 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

// カテゴリに応じたバッジ色（主要カテゴリのみ、未定義はグレー）
const CATEGORY_COLORS: Record<string, string> = {
  '主食': 'bg-amber-100 text-amber-700',
  '主菜': 'bg-red-100   text-red-700',
  '副菜': 'bg-green-100 text-green-700',
  '汁物': 'bg-blue-100  text-blue-700',
  'デザート': 'bg-pink-100 text-pink-700',
}

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'
}

// ──────────────────────────────────────────────
// 各セルコンポーネント
// ──────────────────────────────────────────────
function MenuCell({
  date,
  meal_type,
  isToday,
}: {
  date:      string
  meal_type: MealType
  isToday:   boolean
}) {
  const { getMenuItems, addItem, removeItem } = useMenuItems()
  const items = getMenuItems(date, meal_type)

  const [showForm, setShowForm] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newCat,   setNewCat]   = useState('')
  const [adding,   setAdding]   = useState(false)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await addItem({ date, meal_type, menu_name: newName.trim(), category: newCat.trim() })
    setAdding(false)
    setNewName('')
    setNewCat('')
    setShowForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setShowForm(false); setNewName(''); setNewCat('') }
  }

  return (
    <div className={`min-h-[110px] p-2 rounded-xl border-2 transition-all flex flex-col gap-1 ${
      isToday ? 'border-teal-200 bg-teal-50/40' : 'border-slate-100 bg-white'
    }`}>
      {/* メニュー一覧 */}
      {items.map(item => (
        <div
          key={item.id}
          className="group flex items-center gap-1 bg-white rounded-lg px-1.5 py-1 border border-slate-100 hover:border-slate-200 transition-colors"
        >
          {item.category && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${getCategoryColor(item.category)}`}>
              {item.category}
            </span>
          )}
          <span className="text-xs text-slate-700 flex-1 truncate leading-relaxed">
            {item.menu_name}
          </span>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-0.5 shrink-0"
            title="削除"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* 追加フォーム */}
      {showForm ? (
        <div className="space-y-1 mt-1">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メニュー名"
            autoFocus
            className="w-full text-xs px-2 py-1 rounded-lg border border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
          />
          <input
            type="text"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="カテゴリ（任意）"
            className="w-full text-xs px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(''); setNewCat('') }}
              className="flex-1 text-xs py-1 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="flex-1 text-xs py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium transition-colors"
            >
              {adding ? '追加中…' : '追加'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-teal-500 transition-colors mt-auto py-1"
        >
          <Plus className="w-3 h-3" />
          追加
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main WeeklyCalendar
// ──────────────────────────────────────────────
interface Props {
  weekDates: string[]
  today:     string
}

export function WeeklyCalendar({ weekDates, today }: Props) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[600px]">
        {/* Header row */}
        <div className="grid grid-cols-[72px_1fr_1fr_1fr] gap-1 mb-1">
          <div />
          {MEAL_TYPES.map(meal => (
            <div key={meal} className={`text-center text-xs font-bold py-1.5 rounded-lg border ${MEAL_COLORS[meal]}`}>
              {meal}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {weekDates.map(date => {
          const isToday = date === today
          return (
            <div key={date} className="grid grid-cols-[72px_1fr_1fr_1fr] gap-1 mb-2">
              <div className={`flex flex-col items-center justify-center rounded-xl text-xs font-bold py-2 ${
                isToday ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {formatDate(date)}
              </div>
              {MEAL_TYPES.map(meal => (
                <MenuCell
                  key={buildKey(date, meal)}
                  date={date}
                  meal_type={meal}
                  isToday={isToday}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
