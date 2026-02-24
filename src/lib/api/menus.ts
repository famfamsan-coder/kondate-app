import { supabase } from '@/lib/supabase'
import type { Menu, MenuCategory } from '@/lib/types'
import { MENUS } from '@/lib/mockData'

/**
 * Supabase の Menu テーブルから全メニューを取得する。
 * Supabase が未設定、またはエラー・空の場合はモックデータにフォールバックする。
 */
export async function fetchMenus(): Promise<Menu[]> {
  if (!supabase) return MENUS

  const { data, error } = await supabase
    .from('Menu')
    .select('*')
    .order('category')
    .order('name')

  if (error || !data || data.length === 0) {
    console.warn('[fetchMenus] Supabase 取得失敗またはデータなし、モックを使用します', error?.message)
    return MENUS
  }

  return data.map(row => ({
    id:            row.id as string,
    name:          row.name as string,
    category:      row.category as MenuCategory,
    standard_time: row.standard_time as number,
    calories:      Number(row.calories),
    protein:       Number(row.protein),
    salt:          Number(row.salt),
    fat:           Number(row.fat),
    carbohydrate:  Number(row.carbohydrate),
    // Supabase は text[] を JS 配列として返す。念のため安全変換
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    is_fixed_time: Boolean(row.is_fixed_time),
  }))
}
