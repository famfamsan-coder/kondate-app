import { supabase } from '@/lib/supabase'
import { DEFAULT_CHECK_ITEMS } from '@/lib/api/finalCheckLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'
import type { TempSlots } from '@/lib/api/temperatureLog'

// ─── 返却型 ───────────────────────────────────────────────────────────────

export interface TempLogRow {
  date:       string
  fridge:     TempSlots
  freezer:    TempSlots
  updated_at: string
}

export interface CheckLogRow {
  date:       string
  items:      CheckItem[]
  updated_at: string
}

// ─── 内部ヘルパー ─────────────────────────────────────────────────────────

function normalizeTempSlots(raw: unknown): TempSlots {
  const arr = Array.isArray(raw) ? raw : []
  return Array.from({ length: 6 }, (_, i) => {
    const v = arr[i]
    return typeof v === 'number' && !isNaN(v) ? v : null
  })
}

function mergeCheckItems(stored: unknown): CheckItem[] {
  if (!Array.isArray(stored)) {
    return DEFAULT_CHECK_ITEMS.map(d => ({ ...d, checked: false }))
  }
  const storedMap = new Map<string, boolean>(
    stored
      .filter((i): i is { key: string; checked: boolean } => typeof i?.key === 'string')
      .map(i => [i.key, !!i.checked]),
  )
  return DEFAULT_CHECK_ITEMS.map(def => ({
    ...def,
    checked: storedMap.get(def.key) ?? false,
  }))
}

// ─── 公開 API ─────────────────────────────────────────────────────────────

/** 期間内の温度ログを日付昇順で取得 */
export async function fetchTemperatureLogsInRange(
  start: string,
  end:   string,
): Promise<TempLogRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('TemperatureLog')
    .select('date, fridge, freezer, updated_at')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
  if (error) {
    console.error('[fetchTemperatureLogsInRange]', error.message)
    return []
  }
  return (data ?? []).map(row => ({
    date:       row.date       as string,
    fridge:     normalizeTempSlots(row.fridge),
    freezer:    normalizeTempSlots(row.freezer),
    updated_at: row.updated_at as string,
  }))
}

/** 期間内の点検ログを日付昇順で取得 */
export async function fetchFinalCheckLogsInRange(
  start: string,
  end:   string,
): Promise<CheckLogRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('FinalCheckLog')
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
    items:      mergeCheckItems(row.items),
    updated_at: row.updated_at as string,
  }))
}
