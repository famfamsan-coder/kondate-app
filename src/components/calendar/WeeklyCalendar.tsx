'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  useDroppable, useDraggable, closestCenter,
} from '@dnd-kit/core'
import { AlertTriangle, Clock, Flame, Droplets, GripVertical, Plus, X, ChevronRight } from 'lucide-react'
import { MealType, MenuCategory, MENU_CATEGORIES, Schedule } from '@/lib/types'
import { calcNutrition, formatDate, SALT_LIMIT_PER_MEAL, CALORIE_LIMIT_PER_MEAL } from '@/lib/utils'
import { useSchedules, buildKey, CellKey } from '@/lib/scheduleContext'
// allMenus は useSchedules() から取得するため props では受け取らない

// ──────────────────────────────────────────────
// Draggable menu item (with remove button)
// ──────────────────────────────────────────────
function DraggableMenuItem({
  schedule,
  cellKey,
  ghost = false,
  onRemove,
}: {
  schedule: Schedule
  cellKey: CellKey
  ghost?: boolean
  onRemove?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schedule.id,
    data: { cellKey },
  })

  if (ghost) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg border border-teal-300 shadow-lg text-xs text-slate-700 font-medium">
        <GripVertical className="w-3 h-3 text-slate-400" />
        {schedule.menu?.name}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 select-none transition-all group ${
        isDragging ? 'opacity-40 scale-95' : 'hover:border-teal-300 hover:shadow-sm'
      }`}
    >
      {/* drag handle */}
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3 h-3 text-slate-300 shrink-0" />
      </span>
      <span className="flex-1 leading-tight">{schedule.menu?.name}</span>
      <span className="text-slate-400 shrink-0">{schedule.menu?.standard_time}分</span>
      {/* Remove button — stopPropagation so it doesn't start drag */}
      {onRemove && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100"
          title="削除"
        >
          <X className="w-3 h-3 text-red-400" />
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Droppable cell — with add/remove menu support
// ──────────────────────────────────────────────
function DroppableCell({
  cellKey,
  schedules,
  isToday,
  onAddMenu,
  onRemoveMenu,
}: {
  cellKey: CellKey
  schedules: Schedule[]
  isToday: boolean
  onAddMenu: (menuId: string) => void
  onRemoveMenu: (scheduleId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellKey })
  const { allMenus } = useSchedules()
  const [showPicker, setShowPicker] = useState(false)
  const [pickerCategory, setPickerCategory] = useState<MenuCategory | ''>('')
  const [pickerMenuId, setPickerMenuId] = useState('')

  const categoryMenus = pickerCategory
    ? allMenus.filter(m => m.category === pickerCategory)
    : []

  const nutrition = calcNutrition(schedules)
  const saltWarn = nutrition.salt >= SALT_LIMIT_PER_MEAL
  const calWarn  = nutrition.calories >= CALORIE_LIMIT_PER_MEAL

  const closePicker = () => {
    setShowPicker(false)
    setPickerCategory('')
    setPickerMenuId('')
  }

  const handleAdd = () => {
    if (pickerMenuId) {
      onAddMenu(pickerMenuId)
      setPickerMenuId('')
      setPickerCategory('')
    }
    setShowPicker(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-2 rounded-xl border-2 transition-all flex flex-col ${
        isOver
          ? 'border-teal-400 bg-teal-50'
          : isToday
          ? 'border-teal-200 bg-teal-50/40'
          : 'border-slate-100 bg-white'
      }`}
    >
      {/* Menu items */}
      <div className="space-y-1 flex-1">
        {schedules.map(s => (
          <DraggableMenuItem
            key={s.id}
            schedule={s}
            cellKey={cellKey}
            onRemove={() => onRemoveMenu(s.id)}
          />
        ))}
        {schedules.length === 0 && !showPicker && (
          <div className="h-10 flex items-center justify-center text-xs text-slate-300 border border-dashed border-slate-200 rounded-lg">
            ドロップ
          </div>
        )}
      </div>

      {/* ── Add menu picker ── */}
      {showPicker ? (
        <div className="mt-1.5 space-y-1">
          {/* Step 1: カテゴリ選択 */}
          <div className="flex gap-1 items-center">
            <select
              value={pickerCategory}
              onChange={e => { setPickerCategory(e.target.value as MenuCategory | ''); setPickerMenuId('') }}
              className="flex-1 border border-slate-300 rounded-lg text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              autoFocus
            >
              <option value="">ジャンル選択…</option>
              {MENU_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="button" onClick={closePicker} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          {/* Step 2: メニュー選択（カテゴリ選択後に表示） */}
          {pickerCategory && (
            <div className="flex gap-1 items-center">
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={pickerMenuId}
                onChange={e => setPickerMenuId(e.target.value)}
                className="flex-1 border border-teal-300 rounded-lg text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="">品目を選択…</option>
                {categoryMenus.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!pickerMenuId}
                className="text-xs px-2 py-1 bg-teal-600 disabled:bg-slate-300 text-white rounded-lg shrink-0"
              >
                追加
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="mt-1.5 w-full flex items-center justify-center gap-0.5 text-xs text-slate-400 hover:text-teal-600 py-1 rounded-lg hover:bg-teal-50 transition-colors border border-dashed border-transparent hover:border-teal-200"
        >
          <Plus className="w-3 h-3" />品目を追加
        </button>
      )}

      {/* Nutrition summary */}
      {schedules.length > 0 && (
        <div className="pt-1.5 mt-1.5 border-t border-slate-100 space-y-0.5">
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-slate-600 font-medium">{nutrition.total_time}分</span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${calWarn ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
            <Flame className="w-3 h-3" />
            {Math.round(nutrition.calories)} kcal
            {calWarn && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          </div>
          <div className={`flex items-center gap-1 text-xs ${saltWarn ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
            <Droplets className="w-3 h-3" />
            塩分 {nutrition.salt.toFixed(1)} g
            {saltWarn && <AlertTriangle className="w-3 h-3 text-red-500" />}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Day totals
// ──────────────────────────────────────────────
function DayTotals({ schedules }: { schedules: Schedule[] }) {
  const n = calcNutrition(schedules)
  const saltOver = n.salt > 7.5
  return (
    <div className="mt-1 px-1 grid grid-cols-2 gap-x-2 text-xs text-slate-500">
      <span>🔥 {Math.round(n.calories)} kcal</span>
      <span className={saltOver ? 'text-red-600 font-semibold' : ''}>
        🧂 {n.salt.toFixed(1)} g{saltOver ? ' ⚠' : ''}
      </span>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main WeeklyCalendar — state lives in ScheduleContext
// ──────────────────────────────────────────────
const MEAL_TYPES: MealType[] = ['朝食', '昼食', '夕食']
const MEAL_COLORS: Record<MealType, string> = {
  '朝食': 'bg-sky-50 text-sky-700 border-sky-200',
  '昼食': 'bg-amber-50 text-amber-700 border-amber-200',
  '夕食': 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

interface Props {
  weekDates: string[]
  today: string
}

export function WeeklyCalendar({ weekDates, today }: Props) {
  const { allMenus, calendarData, getCell, addMenu, removeMenu, moveMenu } = useSchedules()
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null)

  const getDaySchedules = useCallback(
    (date: string) => MEAL_TYPES.flatMap(m => getCell(date, m)),
    [getCell]
  )

  // ── DnD handlers ─────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    const sourceCell = active.data.current?.cellKey as CellKey
    const schedules = calendarData[sourceCell] ?? []
    setActiveSchedule(schedules.find(s => s.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveSchedule(null)
    if (!over) return
    const fromCell = active.data.current?.cellKey as CellKey
    const toCell = over.id as CellKey
    if (!fromCell || fromCell === toCell) return
    moveMenu(fromCell, toCell, active.id as string)
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-1 mb-1">
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
              <div key={date} className="mb-3">
                <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-1">
                  <div className={`flex flex-col items-center justify-center rounded-xl text-xs font-bold py-2 ${
                    isToday ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {formatDate(date)}
                  </div>

                  {MEAL_TYPES.map(meal => {
                    const cellKey = buildKey(date, meal)
                    return (
                      <DroppableCell
                        key={meal}
                        cellKey={cellKey}
                        schedules={getCell(date, meal)}
                        isToday={isToday}
                        onAddMenu={menuId => addMenu(cellKey, menuId)}
                        onRemoveMenu={scheduleId => removeMenu(cellKey, scheduleId)}
                      />
                    )
                  })}
                </div>
                <DayTotals schedules={getDaySchedules(date)} />
              </div>
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeSchedule && (
          <DraggableMenuItem schedule={activeSchedule} cellKey="" ghost />
        )}
      </DragOverlay>
    </DndContext>
  )
}
