import { supabase } from '@/lib/supabase'
import type { CheckItem } from '@/lib/api/finalCheckLog'

/** 厨房清掃管理点検表の固定チェック項目 */
export const CLEANING_CHECK_ITEMS: Omit<CheckItem, 'checked'>[] = [
  { key: 'cart',         label: '台車' },
  { key: 'utensils',    label: '調理器具' },
  { key: 'floor',       label: '床（配膳側）' },
  { key: 'sink',        label: 'シンク' },
  { key: 'trash',       label: 'ゴミ捨て' },
]

export interface CleaningCheckData {
  items:     CheckItem[]
  assignee:  string
  adminSign: string
}

function toInitial(): CheckItem[] {
  return CLEANING_CHECK_ITEMS.map(d => ({ ...d, checked: false }))
}

function mergeItems(stored: unknown): CheckItem[] {
  if (!Array.isArray(stored)) return toInitial()
  const map = new Map<string, boolean>(
    stored
      .filter((i): i is { key: string; checked: boolean } => typeof i?.key === 'string')
      .map(i => [i.key, !!i.checked]),
  )
  return CLEANING_CHECK_ITEMS.map(def => ({ ...def, checked: map.get(def.key) ?? false }))
}

/** 指定日付の厨房清掃管理点検データを取得。未登録はデフォルト値で返す */
export async function fetchCleaningCheckLog(date: string): Promise<CleaningCheckData> {
  if (!supabase) return { items: toInitial(), assignee: '', adminSign: '' }
  const { data, error } = await supabase
    .from('cleaningchecklog')
    .select('items, assignee, admin_sign')
    .eq('date', date)
    .maybeSingle()
  if (error) {
    console.error('[fetchCleaningCheckLog]', error.message)
    return { items: toInitial(), assignee: '', adminSign: '' }
  }
  return {
    items:     mergeItems(data?.items),
    assignee:  (data?.assignee as string) ?? '',
    adminSign: (data?.admin_sign as string) ?? '',
  }
}

/** 指定日付の厨房清掃管理点検データを upsert。成功なら true */
export async function upsertCleaningCheckLog(
  date:      string,
  items:     CheckItem[],
  assignee:  string,
  adminSign: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('cleaningchecklog')
    .upsert(
      { date, items, assignee, admin_sign: adminSign, updated_at: new Date().toISOString() },
      { onConflict: 'date' },
    )
  if (error) {
    console.error('[upsertCleaningCheckLog]', error.message)
    return false
  }
  return true
}
