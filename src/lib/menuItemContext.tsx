'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import type { MenuItem, MealType } from './types'
import { sortMenuItems } from './utils'
import {
  fetchMenuItemsByDates,
  insertMenuItem,
  updateMenuItemTimes,
  deleteMenuItem,
  type MenuItemInput,
  type MenuItemTimeUpdate,
} from './api/menuItems'

// ──────────────────────────────────────────────
// CellKey helpers — single source of truth
// ──────────────────────────────────────────────
export type CellKey = string  // "YYYY-MM-DD_MealType"

export function buildKey(date: string, meal: MealType): CellKey {
  return `${date}_${meal}`
}

export function parseCellKey(key: CellKey): { date: string; meal_type: MealType } {
  const idx = key.lastIndexOf('_')
  return { date: key.slice(0, idx), meal_type: key.slice(idx + 1) as MealType }
}

// ──────────────────────────────────────────────
// State type
// ──────────────────────────────────────────────
export type CalendarData = Record<CellKey, MenuItem[]>

function buildData(items: MenuItem[], dates: string[]): CalendarData {
  const data: CalendarData = {}
  // 全セルを空配列で初期化
  for (const date of dates) {
    for (const meal of ['朝食', '昼食', '夕食'] as MealType[]) {
      data[buildKey(date, meal)] = []
    }
  }
  for (const m of items) {
    const key = buildKey(m.date, m.meal_type)
    if (!data[key]) data[key] = []
    data[key].push(m)
  }
  return data
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────
interface MenuItemContextValue {
  calendarData:    CalendarData
  isLoading:       boolean
  getMenuItems:    (date: string, meal: MealType) => MenuItem[]
  /** 指定日付リストの最新データを Supabase から取得してキャッシュ更新 */
  loadWeek:        (dates: string[]) => Promise<void>
  /** MenuItem を追加して返す */
  addItem:         (input: MenuItemInput) => Promise<MenuItem | null>
  /** 時間フィールドを更新（楽観的更新） */
  updateItemTimes: (id: string, times: MenuItemTimeUpdate) => Promise<string | null>
  /** MenuItem を削除（楽観的削除） */
  removeItem:      (id: string) => Promise<void>
}

const MenuItemContext = createContext<MenuItemContextValue | null>(null)

export function MenuItemProvider({ children }: { children: ReactNode }) {
  const [calendarData, setCalendarData] = useState<CalendarData>({})
  const [isLoading,    setIsLoading]    = useState(false)

  const getMenuItems = useCallback(
    (date: string, meal: MealType) => sortMenuItems(calendarData[buildKey(date, meal)] ?? []),
    [calendarData]
  )

  // ── 指定日付のデータを Supabase から取得してマージ ─────────────────────
  const loadWeek = useCallback(async (dates: string[]) => {
    setIsLoading(true)
    const items = await fetchMenuItemsByDates(dates)
    const newPartial = buildData(items, dates)
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

  // ── メニュー追加 ────────────────────────────────────────────────────────
  const addItem = useCallback(async (input: MenuItemInput): Promise<MenuItem | null> => {
    const saved = await insertMenuItem(input)
    if (saved) {
      const key = buildKey(saved.date, saved.meal_type)
      setCalendarData(d => ({
        ...d,
        [key]: [...(d[key] ?? []), saved],
      }))
    }
    return saved
  }, [])

  // ── 時間更新（楽観的更新） ─────────────────────────────────────────────
  const updateItemTimes = useCallback(async (id: string, times: MenuItemTimeUpdate): Promise<string | null> => {
    setCalendarData(d => {
      const next: CalendarData = {}
      for (const [key, items] of Object.entries(d)) {
        next[key] = items.map(item => item.id === id ? { ...item, ...times } : item)
      }
      return next
    })
    return await updateMenuItemTimes(id, times)
  }, [])

  // ── 削除（楽観的削除） ─────────────────────────────────────────────────
  const removeItem = useCallback(async (id: string) => {
    setCalendarData(d => {
      const next: CalendarData = {}
      for (const [key, items] of Object.entries(d)) {
        next[key] = items.filter(item => item.id !== id)
      }
      return next
    })
    await deleteMenuItem(id)
  }, [])

  return (
    <MenuItemContext.Provider value={{
      calendarData, isLoading,
      getMenuItems, loadWeek, addItem, updateItemTimes, removeItem,
    }}>
      {children}
    </MenuItemContext.Provider>
  )
}

export function useMenuItems() {
  const ctx = useContext(MenuItemContext)
  if (!ctx) throw new Error('useMenuItems must be used within MenuItemProvider')
  return ctx
}
