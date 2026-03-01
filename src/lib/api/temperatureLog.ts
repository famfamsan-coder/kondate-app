import { supabase } from '@/lib/supabase'

export type TempSlots = (number | null)[]

/** 冷蔵庫スロット数（No.1〜5） */
export const FRIDGE_SLOT_COUNT  = 5
/** 冷凍庫スロット数（No.6〜7） */
export const FREEZER_SLOT_COUNT = 2

// DB上の行型（1スロット = 1行）
interface SlotRow {
  slot:        number
  temperature: number | null
  assignee:    string
  updated_at?: string | null
}

/** DB行リストから TempSlots・assignee・updated_at を組み立てる */
function buildFromRows(rows: SlotRow[]): {
  fridge:     TempSlots
  freezer:    TempSlots
  assignee:   string
  updated_at: string
} {
  const bySlot = new Map(rows.map(r => [r.slot, r]))

  const fridge = Array.from({ length: FRIDGE_SLOT_COUNT }, (_, i) =>
    bySlot.get(i + 1)?.temperature ?? null,
  )
  const freezer = Array.from({ length: FREEZER_SLOT_COUNT }, (_, i) =>
    bySlot.get(FRIDGE_SLOT_COUNT + i + 1)?.temperature ?? null,
  )

  // assignee は全スロット共通なので先頭行から取る
  const assignee = rows[0]?.assignee ?? ''

  // updated_at は最新スロットのものを採用
  const updated_at = rows.reduce(
    (max, r) => ((r.updated_at ?? '') > max ? (r.updated_at ?? '') : max),
    '',
  )

  return { fridge, freezer, assignee, updated_at }
}

/** 指定日付の温度ログを取得。未登録は全スロット null で返す */
export async function fetchTemperatureLog(
  date: string,
): Promise<{ fridge: TempSlots; freezer: TempSlots; assignee: string }> {
  const empty = {
    fridge:   Array(FRIDGE_SLOT_COUNT).fill(null)  as TempSlots,
    freezer:  Array(FREEZER_SLOT_COUNT).fill(null) as TempSlots,
    assignee: '',
  }
  if (!supabase) return empty

  const { data, error } = await supabase
    .from('temperaturelog')
    .select('slot, temperature, assignee, updated_at')
    .eq('date', date)
    .order('slot', { ascending: true })

  if (error) {
    console.error('[fetchTemperatureLog]', error.message)
    return empty
  }
  if (!data || data.length === 0) return empty

  const { fridge, freezer, assignee } = buildFromRows(data as SlotRow[])
  return { fridge, freezer, assignee }
}

/** 指定日付の温度ログを upsert（7行を date+slot で一意保存）。成功なら true */
export async function upsertTemperatureLog(
  date:     string,
  fridge:   TempSlots,
  freezer:  TempSlots,
  assignee: string,
): Promise<boolean> {
  if (!supabase) return false

  // 冷蔵庫 slot 1-5、冷凍庫 slot 6-7 として 7 行を組み立てる
  const rows = [
    ...fridge.map((temperature, i) => ({
      date,
      slot:     i + 1,
      temperature: temperature ?? null,
      assignee,
    })),
    ...freezer.map((temperature, i) => ({
      date,
      slot:     FRIDGE_SLOT_COUNT + i + 1,
      temperature: temperature ?? null,
      assignee,
    })),
  ]

  const { error } = await supabase
    .from('temperaturelog')
    .upsert(rows, { onConflict: 'date,slot' })

  if (error) {
    console.error('[upsertTemperatureLog]', error.message)
    return false
  }
  return true
}

/** 期間内の温度ログを日付昇順で取得（報告書生成用） */
export async function fetchTemperatureLogsInRange(
  start: string,
  end:   string,
): Promise<{ date: string; fridge: TempSlots; freezer: TempSlots; updated_at: string }[]> {
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

  // 日付ごとにグループ化
  const byDate = new Map<string, SlotRow[]>()
  for (const row of data ?? []) {
    const key = row.date as string
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(row as SlotRow)
  }

  return Array.from(byDate.entries()).map(([date, slots]) => {
    const { fridge, freezer, updated_at } = buildFromRows(slots)
    return { date, fridge, freezer, updated_at }
  })
}
