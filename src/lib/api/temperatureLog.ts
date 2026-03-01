import { supabase } from '@/lib/supabase'

export type TempSlots = (number | null)[]

const SLOT_COUNT = 6

function normalize(raw: unknown): TempSlots {
  const arr = Array.isArray(raw) ? raw : []
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const v = arr[i]
    return typeof v === 'number' && !isNaN(v) ? v : null
  })
}

/** 指定日付の温度ログを取得。未登録は全スロット null で返す */
export async function fetchTemperatureLog(
  date: string,
): Promise<{ fridge: TempSlots; freezer: TempSlots }> {
  if (!supabase) return { fridge: normalize([]), freezer: normalize([]) }
  const { data, error } = await supabase
    .from('TemperatureLog')
    .select('fridge, freezer')
    .eq('date', date)
    .maybeSingle()
  if (error) {
    console.error('[fetchTemperatureLog]', error.message)
    return { fridge: normalize([]), freezer: normalize([]) }
  }
  return {
    fridge:  normalize(data?.fridge),
    freezer: normalize(data?.freezer),
  }
}

/** 指定日付の温度ログを upsert。成功なら true */
export async function upsertTemperatureLog(
  date: string,
  fridge: TempSlots,
  freezer: TempSlots,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('TemperatureLog')
    .upsert(
      { date, fridge, freezer, updated_at: new Date().toISOString() },
      { onConflict: 'date' },
    )
  if (error) {
    console.error('[upsertTemperatureLog]', error.message)
    return false
  }
  return true
}
