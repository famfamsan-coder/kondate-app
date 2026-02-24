import { supabase } from '@/lib/supabase'
import type { WorkRecord } from '@/lib/types'

export interface RecordInput {
  schedule_id: string
  prep_score: number
  measure_score: number
  cook_score: number
  serve_score: number
  total_time: number | null
  note: string | null
}

/** 指定 schedule_id に紐づく最新レコードを取得 */
export async function fetchRecordByScheduleId(scheduleId: string): Promise<WorkRecord | null> {
  if (!supabase || scheduleId.startsWith('tmp_')) return null
  const { data, error } = await supabase
    .from('Record')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) { console.error('[fetchRecordByScheduleId]', error.message); return null }
  if (!data) return null
  return {
    id:            data.id as string,
    schedule_id:   data.schedule_id as string,
    prep_score:    data.prep_score as number,
    measure_score: data.measure_score as number,
    cook_score:    data.cook_score as number,
    serve_score:   data.serve_score as number,
    total_time:    data.total_time as number,
    note:          (data.note as string) ?? '',
    created_at:    data.created_at as string,
  }
}

/** 最新の評価レコードを件数指定で取得（ダッシュボード用） */
export async function fetchRecentRecords(limit = 10): Promise<WorkRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('Record')
    .select('*, schedule:Schedule(*, menu:Menu(*))')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[fetchRecentRecords]', error.message); return [] }
  return (data ?? []).map(row => ({
    id:            row.id as string,
    schedule_id:   row.schedule_id as string,
    prep_score:    row.prep_score as number,
    measure_score: row.measure_score as number,
    cook_score:    row.cook_score as number,
    serve_score:   row.serve_score as number,
    total_time:    row.total_time as number,
    note:          (row.note as string) ?? '',
    created_at:    row.created_at as string,
    schedule:      row.schedule as WorkRecord['schedule'],
  }))
}

/**
 * 同じ schedule_id のレコードが既存なら UPDATE、なければ INSERT する。
 * @returns エラーメッセージ文字列（成功時は null）
 */
export async function upsertRecord(input: RecordInput): Promise<string | null> {
  if (!supabase) return 'Supabase が未設定です'

  const existing = await fetchRecordByScheduleId(input.schedule_id)

  if (existing) {
    const { error } = await supabase
      .from('Record')
      .update({
        prep_score:    input.prep_score,
        measure_score: input.measure_score,
        cook_score:    input.cook_score,
        serve_score:   input.serve_score,
        total_time:    input.total_time,
        note:          input.note,
      })
      .eq('id', existing.id)
    if (error) { console.error('[upsertRecord update]', error.message); return error.message }
  } else {
    const { error } = await supabase.from('Record').insert(input)
    if (error) { console.error('[upsertRecord insert]', error.message); return error.message }
  }
  return null
}
