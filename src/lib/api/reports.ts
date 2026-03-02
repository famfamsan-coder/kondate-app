import { supabase } from '@/lib/supabase'
import { DEFAULT_CHECK_ITEMS } from '@/lib/api/finalCheckLog'
import { EQUIPMENT_CHECK_ITEMS } from '@/lib/api/equipmentCheckLog'
import { CLEANING_CHECK_ITEMS }  from '@/lib/api/cleaningCheckLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'
import type { TempSlots } from '@/lib/api/temperatureLog'
import { FRIDGE_SLOT_COUNT, FREEZER_SLOT_COUNT } from '@/lib/api/temperatureLog'

// ─── 返却型 ───────────────────────────────────────────────────────────────

export interface TempLogRow {
  date:       string
  fridge:     TempSlots   // 長さ 5（No.1〜5）
  freezer:    TempSlots   // 長さ 2（No.6〜7）
  assignee:   string
  updated_at: string
}

export interface CheckLogRow {
  date:       string
  items:      CheckItem[]
  updated_at: string
}

export interface EquipmentCheckLogRow {
  date:       string
  items:      CheckItem[]
  confirmer:  string
  updated_at: string
}

export interface CleaningCheckLogRow {
  date:       string
  items:      CheckItem[]
  assignee:   string
  updated_at: string
}

// ─── 内部ヘルパー ─────────────────────────────────────────────────────────

function makeMerge(defs: Omit<CheckItem, 'checked'>[]) {
  return function mergeItems(stored: unknown): CheckItem[] {
    if (!Array.isArray(stored)) {
      return defs.map(d => ({ ...d, checked: false }))
    }
    const map = new Map<string, boolean>(
      stored
        .filter((i): i is { key: string; checked: boolean } => typeof i?.key === 'string')
        .map(i => [i.key, !!i.checked]),
    )
    return defs.map(def => ({ ...def, checked: map.get(def.key) ?? false }))
  }
}

const mergeFinalItems    = makeMerge(DEFAULT_CHECK_ITEMS)
const mergeEquipmentItems = makeMerge(EQUIPMENT_CHECK_ITEMS)
const mergeCleaningItems  = makeMerge(CLEANING_CHECK_ITEMS)

// ─── 公開 API ─────────────────────────────────────────────────────────────

/** 期間内の温度ログを日付昇順で取得 */
export async function fetchTemperatureLogsInRange(
  start: string,
  end:   string,
): Promise<TempLogRow[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('temperaturelog')
    .select('date, slot, temperature, assignee, updated_at')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .order('slot', { ascending: true })

  if (error) {
    console.error('[fetchTemperatureLogsInRange]', error.message)
    return []
  }

  const byDate = new Map<string, {
    slot: number; temperature: number | null; assignee: string; updated_at: string
  }[]>()
  for (const row of data ?? []) {
    const key = row.date as string
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push({
      slot:        row.slot        as number,
      temperature: row.temperature as number | null,
      assignee:    (row.assignee   as string) ?? '',
      updated_at:  (row.updated_at  as string) ?? '',
    })
  }

  return Array.from(byDate.entries()).map(([date, slots]) => {
    const fridge = Array.from({ length: FRIDGE_SLOT_COUNT }, (_, i) =>
      slots.find(r => r.slot === i + 1)?.temperature ?? null,
    )
    const freezer = Array.from({ length: FREEZER_SLOT_COUNT }, (_, i) =>
      slots.find(r => r.slot === FRIDGE_SLOT_COUNT + i + 1)?.temperature ?? null,
    )
    const assignee   = slots.find(r => r.assignee)?.assignee ?? ''
    const updated_at = slots.reduce((max, r) =>
      r.updated_at > max ? r.updated_at : max, '',
    )
    return { date, fridge, freezer, assignee, updated_at }
  })
}

/** 期間内の最終点検ログを日付昇順で取得（finalchecklog） */
export async function fetchFinalCheckLogsInRange(
  start: string,
  end:   string,
): Promise<CheckLogRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('finalchecklog')
    .select('date, items, updated_at')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
  if (error) {
    console.error('[fetchFinalCheckLogsInRange]', error.message)
    return []
  }
  return (data ?? []).map(row => ({
    date:       row.date       as string,
    items:      mergeFinalItems(row.items),
    updated_at: row.updated_at as string,
  }))
}

/** 期間内の設備点検ログを日付昇順で取得（equipmentchecklog） */
export async function fetchEquipmentCheckLogsInRange(
  start: string,
  end:   string,
): Promise<EquipmentCheckLogRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('equipmentchecklog')
    .select('date, items, confirmer, updated_at')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
  if (error) {
    console.error('[fetchEquipmentCheckLogsInRange]', error.message)
    return []
  }
  return (data ?? []).map(row => ({
    date:       row.date       as string,
    items:      mergeEquipmentItems(row.items),
    confirmer:  (row.confirmer as string) ?? '',
    updated_at: row.updated_at as string,
  }))
}

/** 期間内の清掃点検ログを日付昇順で取得（cleaningchecklog） */
export async function fetchCleaningCheckLogsInRange(
  start: string,
  end:   string,
): Promise<CleaningCheckLogRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('cleaningchecklog')
    .select('date, items, assignee, updated_at')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
  if (error) {
    console.error('[fetchCleaningCheckLogsInRange]', error.message)
    return []
  }
  return (data ?? []).map(row => ({
    date:       row.date       as string,
    items:      mergeCleaningItems(row.items),
    assignee:   (row.assignee  as string) ?? '',
    updated_at: row.updated_at as string,
  }))
}
