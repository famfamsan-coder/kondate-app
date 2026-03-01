import { supabase } from '@/lib/supabase'
import type { MenuItem, MealType } from '@/lib/types'

function mapRow(row: Record<string, unknown>): MenuItem {
  return {
    id:           row.id           as string,
    date:         row.date         as string,
    meal_type:    row.meal_type    as MealType,
    menu_name:    (row.menu_name   as string) ?? '',
    category:     (row.category    as string) ?? '',
    tags:         (row.tags        as string[]) ?? [],
    note:         (row.note        as string) ?? '',
    comment:      (row.comment     as string) ?? '',
    prep_time:    (row.prep_time   as number) ?? 0,
    measure_time: (row.measure_time as number) ?? 0,
    cook_time:    (row.cook_time   as number) ?? 0,
    serve_time:   (row.serve_time  as number) ?? 0,
    created_at:   row.created_at   as string,
  }
}

/** 指定日付・食事区分の MenuItem を取得 */
export async function fetchMenuItemsByDate(date: string, meal_type: MealType): Promise<MenuItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('MenuItem')
    .select('*')
    .eq('date', date)
    .eq('meal_type', meal_type)
    .order('created_at')
  if (error) { console.error('[fetchMenuItemsByDate]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** 指定日付リストの MenuItem を取得 */
export async function fetchMenuItemsByDates(dates: string[]): Promise<MenuItem[]> {
  if (!supabase || dates.length === 0) return []
  const { data, error } = await supabase
    .from('MenuItem')
    .select('*')
    .in('date', dates)
    .order('date')
    .order('meal_type')
    .order('created_at')
  if (error) { console.error('[fetchMenuItemsByDates]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** 日付範囲で MenuItem を取得 */
export async function fetchMenuItemsByDateRange(from: string, to: string): Promise<MenuItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('MenuItem')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('meal_type')
    .order('created_at')
  if (error) { console.error('[fetchMenuItemsByDateRange]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** 改善メモが記入されている MenuItem を新しい順で取得（ダッシュボード用） */
export async function fetchMenuItemsWithComments(limit = 15): Promise<MenuItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('MenuItem')
    .select('*')
    .neq('comment', '')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[fetchMenuItemsWithComments]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** 最近の MenuItem を件数指定で取得（ダッシュボード用） */
export async function fetchRecentMenuItems(limit = 20): Promise<MenuItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('MenuItem')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[fetchRecentMenuItems]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

export interface MenuItemInput {
  date:       string
  meal_type:  MealType
  menu_name:  string
  category?:  string
  tags?:      string[]
  note?:      string
}

/** MenuItem を新規 INSERT して返す */
export async function insertMenuItem(input: MenuItemInput): Promise<MenuItem | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('MenuItem')
    .insert({
      date:      input.date,
      meal_type: input.meal_type,
      menu_name: input.menu_name,
      category:  input.category ?? '',
      tags:      input.tags     ?? [],
      note:      input.note     ?? '',
    })
    .select()
    .single()
  if (error) { console.error('[insertMenuItem]', error.message); return null }
  return mapRow(data as Record<string, unknown>)
}

export interface MenuItemTimeUpdate {
  prep_time:    number
  measure_time: number
  cook_time:    number
  serve_time:   number
}

/** MenuItem の時間フィールドを UPDATE（id 指定） */
export async function updateMenuItemTimes(id: string, times: MenuItemTimeUpdate): Promise<string | null> {
  if (!supabase) return 'Supabase が未設定です'
  const { error } = await supabase
    .from('MenuItem')
    .update(times)
    .eq('id', id)
  if (error) { console.error('[updateMenuItemTimes]', error.message); return error.message }
  return null
}

/** MenuItem の改善メモ（comment）を UPDATE */
export async function updateMenuItemComment(id: string, comment: string): Promise<string | null> {
  if (!supabase) return 'Supabase が未設定です'
  const { error } = await supabase
    .from('MenuItem')
    .update({ comment })
    .eq('id', id)
  if (error) { console.error('[updateMenuItemComment]', error.message); return error.message }
  return null
}

/** MenuItem を DELETE */
export async function deleteMenuItem(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('MenuItem').delete().eq('id', id)
  if (error) { console.error('[deleteMenuItem]', error.message); return false }
  return true
}

/**
 * CSV インポート：対象の (date, meal_type) 既存データを削除してから一括 INSERT する。
 * 「上書き保存」動作：同じ日付・食事区分のデータは全て置き換わる。
 * @returns 保存件数（エラー時は Error を throw）
 */
export async function bulkInsertMenuItems(
  items: { date: string; meal_type: MealType; menu_name: string; category: string; tags?: string[]; note?: string }[]
): Promise<number> {
  if (!supabase) {
    throw new Error(
      'Supabase が未設定です。環境変数 NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。'
    )
  }
  if (items.length === 0) return 0

  // Step 1: インポート対象の (date, meal_type) ペアを重複なく抽出
  const pairSet = new Set<string>()
  for (const item of items) pairSet.add(`${item.date}___${item.meal_type}`)
  const pairs = [...pairSet].map(key => {
    const sep = key.indexOf('___')
    return { date: key.slice(0, sep), meal_type: key.slice(sep + 3) as MealType }
  })

  // Step 2: 対象セルの既存 MenuItem を削除（上書き保証）
  for (const { date, meal_type } of pairs) {
    const { error } = await supabase
      .from('MenuItem')
      .delete()
      .eq('date', date)
      .eq('meal_type', meal_type)
    if (error) {
      console.error('[bulkInsertMenuItems] delete', error.message)
      throw new Error(`既存データ削除エラー: ${error.message}`)
    }
  }

  // Step 3: 新データを一括 INSERT
  const rows = items.map(m => ({
    date:      m.date,
    meal_type: m.meal_type,
    menu_name: m.menu_name,
    category:  m.category,
    tags:      m.tags ?? [],
    note:      m.note ?? '',
  }))

  const { data, error } = await supabase
    .from('MenuItem')
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[bulkInsertMenuItems] insert', error.message, error.details, error.hint)
    throw new Error(`保存エラー（MenuItem）: ${error.message}`)
  }

  return data?.length ?? 0
}
