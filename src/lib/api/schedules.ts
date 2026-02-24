import { supabase } from '@/lib/supabase'
import type { Schedule, MealType, MenuCategory } from '@/lib/types'

// Supabase の join 結果を Schedule 型にマッピング
function mapRow(row: Record<string, unknown>): Schedule {
  const m = row.menu as Record<string, unknown> | null
  return {
    id:        row.id as string,
    date:      row.date as string,
    meal_type: row.meal_type as MealType,
    menu_id:   row.menu_id as string,
    menu: m ? {
      id:            m.id as string,
      name:          m.name as string,
      category:      m.category as MenuCategory,
      standard_time: m.standard_time as number,
      calories:      Number(m.calories),
      protein:       Number(m.protein),
      salt:          Number(m.salt),
      fat:           Number(m.fat),
      carbohydrate:  Number(m.carbohydrate),
      tags:          Array.isArray(m.tags) ? (m.tags as string[]) : [],
      is_fixed_time: Boolean(m.is_fixed_time),
    } : undefined,
  }
}

/** 指定日付リストのスケジュール一覧を取得（Menu 情報を join） */
export async function fetchSchedulesByDates(dates: string[]): Promise<Schedule[]> {
  if (!supabase || dates.length === 0) return []
  const { data, error } = await supabase
    .from('Schedule')
    .select('*, menu:Menu(*)')
    .in('date', dates)
    .order('date')
    .order('meal_type')
  if (error) { console.error('[fetchSchedulesByDates]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** スケジュールを1件 INSERT して返す */
export async function insertSchedule(
  date: string, meal_type: MealType, menu_id: string
): Promise<Schedule | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('Schedule')
    .insert({ date, meal_type, menu_id })
    .select('*, menu:Menu(*)')
    .single()
  if (error) { console.error('[insertSchedule]', error.message); return null }
  return mapRow(data as Record<string, unknown>)
}

/** スケジュールを DELETE */
export async function deleteSchedule(id: string): Promise<boolean> {
  if (!supabase || id.startsWith('tmp_')) return true
  const { error } = await supabase.from('Schedule').delete().eq('id', id)
  if (error) { console.error('[deleteSchedule]', error.message); return false }
  return true
}

/** スケジュールの日付・食事区分を UPDATE（DnD 移動用） */
export async function updateScheduleCell(
  id: string, date: string, meal_type: MealType
): Promise<boolean> {
  if (!supabase || id.startsWith('tmp_')) return true
  const { error } = await supabase
    .from('Schedule')
    .update({ date, meal_type })
    .eq('id', id)
  if (error) { console.error('[updateScheduleCell]', error.message); return false }
  return true
}
