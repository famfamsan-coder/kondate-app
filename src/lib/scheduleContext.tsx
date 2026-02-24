'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { Schedule, Menu, MealType } from './types'
import {
  fetchSchedulesByDates,
  insertSchedule,
  deleteSchedule,
  updateScheduleCell,
} from './api/schedules'

// ──────────────────────────────────────────────
// CellKey helpers — single source of truth
// ──────────────────────────────────────────────
export type CellKey = string  // "YYYY-MM-DD_MealType"

export function buildKey(date: string, meal: MealType): CellKey {
  return `${date}_${meal}`
}

export function parseCellKey(key: CellKey): { date: string; meal_type: MealType } {
  const idx = key.indexOf('_')
  return { date: key.slice(0, idx), meal_type: key.slice(idx + 1) as MealType }
}

// ──────────────────────────────────────────────
// State helpers
// ──────────────────────────────────────────────
export type CalendarState = Record<CellKey, Schedule[]>

function buildState(schedules: Schedule[]): CalendarState {
  const state: CalendarState = {}
  for (const s of schedules) {
    const key = buildKey(s.date, s.meal_type)
    if (!state[key]) state[key] = []
    state[key].push(s)
  }
  return state
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────
interface ScheduleContextValue {
  allMenus: Menu[]
  calendarData: CalendarState
  isLoading: boolean
  getCell: (date: string, meal: MealType) => Schedule[]
  /** 指定日付リストの最新スケジュールを Supabase から取得してキャッシュ更新 */
  loadWeek: (dates: string[]) => Promise<void>
  addMenu: (cellKey: CellKey, menuId: string) => Promise<void>
  removeMenu: (cellKey: CellKey, scheduleId: string) => Promise<void>
  moveMenu: (fromCell: CellKey, toCell: CellKey, scheduleId: string) => Promise<void>
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)

export function ScheduleProvider({
  children,
  initialMenus,
}: {
  children: ReactNode
  initialMenus: Menu[]
}) {
  const [calendarData, setCalendarData] = useState<CalendarState>({})
  const [isLoading, setIsLoading]       = useState(false)

  // ref: stale-closure を避けるため最新 calendarData を常に参照できるようにする
  const dataRef = useRef<CalendarState>(calendarData)
  dataRef.current = calendarData

  const getCell = useCallback(
    (date: string, meal: MealType) => calendarData[buildKey(date, meal)] ?? [],
    [calendarData]
  )

  // ── 指定日付のスケジュールを Supabase から取得してマージ ──────────────
  const loadWeek = useCallback(async (dates: string[]) => {
    setIsLoading(true)
    const schedules = await fetchSchedulesByDates(dates)
    const newPartial = buildState(schedules)
    setCalendarData(prev => {
      const next = { ...prev }
      // 要求日付の既存キーを一旦クリア
      for (const key of Object.keys(next)) {
        if (dates.includes(parseCellKey(key).date)) delete next[key]
      }
      return { ...next, ...newPartial }
    })
    setIsLoading(false)
  }, [])

  // ── 品目追加（optimistic + INSERT） ───────────────────────────────────
  const addMenu = useCallback(async (cellKey: CellKey, menuId: string) => {
    const menu = initialMenus.find(m => m.id === menuId)
    if (!menu) return
    const { date, meal_type } = parseCellKey(cellKey)

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const tempSchedule: Schedule = { id: tempId, date, meal_type, menu_id: menuId, menu }

    setCalendarData(prev => ({
      ...prev,
      [cellKey]: [...(prev[cellKey] ?? []), tempSchedule],
    }))

    const saved = await insertSchedule(date, meal_type, menuId)
    if (saved) {
      setCalendarData(prev => ({
        ...prev,
        [cellKey]: (prev[cellKey] ?? []).map(s =>
          s.id === tempId ? { ...saved, menu } : s
        ),
      }))
    } else {
      // 失敗 → ロールバック
      setCalendarData(prev => ({
        ...prev,
        [cellKey]: (prev[cellKey] ?? []).filter(s => s.id !== tempId),
      }))
    }
  }, [initialMenus])

  // ── 品目削除（optimistic + DELETE） ──────────────────────────────────
  const removeMenu = useCallback(async (cellKey: CellKey, scheduleId: string) => {
    const item = dataRef.current[cellKey]?.find(s => s.id === scheduleId)
    setCalendarData(prev => ({
      ...prev,
      [cellKey]: (prev[cellKey] ?? []).filter(s => s.id !== scheduleId),
    }))
    const ok = await deleteSchedule(scheduleId)
    if (!ok && item) {
      setCalendarData(prev => ({
        ...prev,
        [cellKey]: [...(prev[cellKey] ?? []), item],
      }))
    }
  }, [])

  // ── DnD 移動（optimistic + UPDATE） ──────────────────────────────────
  const moveMenu = useCallback(async (
    fromCell: CellKey, toCell: CellKey, scheduleId: string
  ) => {
    const item = dataRef.current[fromCell]?.find(s => s.id === scheduleId)
    if (!item) return

    const { meal_type: toMealType, date: toDate } = parseCellKey(toCell)
    const updatedItem: Schedule = { ...item, meal_type: toMealType, date: toDate }

    setCalendarData(prev => ({
      ...prev,
      [fromCell]: (prev[fromCell] ?? []).filter(s => s.id !== scheduleId),
      [toCell]:   [...(prev[toCell] ?? []), updatedItem],
    }))

    const ok = await updateScheduleCell(scheduleId, toDate, toMealType)
    if (!ok) {
      // 失敗 → ロールバック
      setCalendarData(prev => ({
        ...prev,
        [fromCell]: [...(prev[fromCell] ?? []), item],
        [toCell]:   (prev[toCell] ?? []).filter(s => s.id !== scheduleId),
      }))
    }
  }, [])

  return (
    <ScheduleContext.Provider value={{
      allMenus: initialMenus,
      calendarData,
      isLoading,
      getCell,
      loadWeek,
      addMenu,
      removeMenu,
      moveMenu,
    }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedules() {
  const ctx = useContext(ScheduleContext)
  if (!ctx) throw new Error('useSchedules must be used within ScheduleProvider')
  return ctx
}
