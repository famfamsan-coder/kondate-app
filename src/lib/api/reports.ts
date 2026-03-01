import { supabase } from '@/lib/supabase'
import { DEFAULT_CHECK_ITEMS } from '@/lib/api/finalCheckLog'
import type { CheckItem } from '@/lib/api/finalCheckLog'
import type { TempSlots } from '@/lib/api/temperatureLog'
import { FRIDGE_SLOT_COUNT, FREEZER_SLOT_COUNT } from '@/lib/api/temperatureLog'

// ─── 返却型 ───────────────────────────────────────────────────────────────

export interface TempLogRow {
  date:       string
  fridge:     TempSlots   // 長さ 5（No.1〜5）
  freezer:    TempSlots   // 長さ 2（No.6〜7）
  updated_at: string
}

export interface CheckLogRow {
  date:       string
  items:      CheckItem[]
  updated_at: string
}

// ─── 内部ヘルパー ─────────────────────────────────────────────────────────

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

/** 期間内の温度ログを日付昇順で取得（行単位スキーマ対応） */
export async function fetchTemperatureLogsInRange(
  start: string,
  end:   string,
): Promise<TempLogRow[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('temperaturelog')
    .select('date, slot, temperature, updated_at')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .order('slot', { ascending: true })

  if (error) {
    console.error('[fetchTemperatureLogsInRange]', error.message)
    return []
  }

  // 日付ごとにグループ化して TempLogRow に変換
  const byDate = new Map<string, { slot: number; temperature: number | null; updated_at: string }[]>()
  for (const row of data ?? []) {
    const key = row.date as string
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push({
      slot:        row.slot        as number,
      temperature: row.temperature as number | null,
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
    const updated_at = slots.reduce((max, r) =>
      r.updated_at > max ? r.updated_at : max, '',
    )
    return { date, fridge, freezer, updated_at }
  })
}

/** 期間内の点検ログを日付昇順で取得 */
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
    items:      mergeCheckItems(row.items),
    updated_at: row.updated_at as string,
  }))
}
