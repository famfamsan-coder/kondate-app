import { supabase } from '@/lib/supabase'
import type { CheckItem } from '@/lib/api/finalCheckLog'

/** 厨房機器点検表の固定チェック項目 */
export const EQUIPMENT_CHECK_ITEMS: Omit<CheckItem, 'checked'>[] = [
  { key: 'washer',      label: '洗浄機' },
  { key: 'extinguisher', label: '消火器' },
  { key: 'rotary_kiln', label: '回転窯' },
  { key: 'steamer',     label: '蒸し器' },
  { key: 'rice_cooker', label: '炊飯器' },
  { key: 'gas_valve',   label: 'ガス元栓' },
]

export interface EquipmentCheckData {
  items:     CheckItem[]
  confirmer: string
  adminSign: string
}

function toInitial(): CheckItem[] {
  return EQUIPMENT_CHECK_ITEMS.map(d => ({ ...d, checked: false }))
}

function mergeItems(stored: unknown): CheckItem[] {
  if (!Array.isArray(stored)) return toInitial()
  const map = new Map<string, boolean>(
    stored
      .filter((i): i is { key: string; checked: boolean } => typeof i?.key === 'string')
      .map(i => [i.key, !!i.checked]),
  )
  return EQUIPMENT_CHECK_ITEMS.map(def => ({ ...def, checked: map.get(def.key) ?? false }))
}

/** 指定日付の厨房機器点検データを取得。未登録はデフォルト値で返す */
export async function fetchEquipmentCheckLog(date: string): Promise<EquipmentCheckData> {
  if (!supabase) return { items: toInitial(), confirmer: '', adminSign: '' }
  const { data, error } = await supabase
    .from('equipmentchecklog')
    .select('items, confirmer, admin_sign')
    .eq('date', date)
    .maybeSingle()
  if (error) {
    console.error('[fetchEquipmentCheckLog]', error.message)
    return { items: toInitial(), confirmer: '', adminSign: '' }
  }
  return {
    items:     mergeItems(data?.items),
    confirmer: (data?.confirmer as string) ?? '',
    adminSign: (data?.admin_sign as string) ?? '',
  }
}

/** 指定日付の厨房機器点検データを upsert。成功なら true */
export async function upsertEquipmentCheckLog(
  date:      string,
  items:     CheckItem[],
  confirmer: string,
  adminSign: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('equipmentchecklog')
    .upsert(
      { date, items, confirmer, admin_sign: adminSign, updated_at: new Date().toISOString() },
      { onConflict: 'date' },
    )
  if (error) {
    console.error('[upsertEquipmentCheckLog]', error.message)
    return false
  }
  return true
}
