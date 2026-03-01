import { supabase } from '@/lib/supabase'
import type { Ooda, OodaCategory, OodaStatus, MealType } from '@/lib/types'

// ─── Row mapper ───────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Ooda {
  const mi = row.menu_item as Record<string, unknown> | null
  return {
    id:           row.id           as string,
    menu_item_id: (row.menu_item_id as string) ?? null,
    title:        row.title        as string,
    content:      (row.content     as string) ?? '',
    category:     row.category     as OodaCategory,
    status:       row.status       as OodaStatus,
    created_at:   row.created_at   as string,
    menu_item: mi ? {
      id:           mi.id           as string,
      date:         mi.date         as string,
      meal_type:    mi.meal_type    as MealType,
      menu_name:    (mi.menu_name   as string) ?? '',
      category:     (mi.category    as string) ?? '',
      tags:         (mi.tags        as string[]) ?? [],
      note:         (mi.note        as string) ?? '',
      comment:      (mi.comment     as string) ?? '',
      prep_time:    (mi.prep_time   as number) ?? 0,
      measure_time: (mi.measure_time as number) ?? 0,
      cook_time:    (mi.cook_time   as number) ?? 0,
      serve_time:   (mi.serve_time  as number) ?? 0,
      created_at:   mi.created_at   as string,
    } : undefined,
  }
}

// ─── Input type ───────────────────────────────────────────────────────────

export interface OodaInput {
  menu_item_id?: string | null
  title:         string
  content?:      string
  category:      OodaCategory
  status?:       OodaStatus
}

// ─── API functions ────────────────────────────────────────────────────────

/** 全 Ooda アイテムを新しい順で取得（MenuItem を join） */
export async function fetchOodas(): Promise<Ooda[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('Ooda')
    .select('*, menu_item:MenuItem(*)')
    .order('created_at', { ascending: false })
  if (error) { console.error('[fetchOodas]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** 指定 menu_item_id に紐づく Ooda を新しい順で取得 */
export async function fetchOodasByMenuItemId(menuItemId: string): Promise<Ooda[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('Ooda')
    .select('*, menu_item:MenuItem(*)')
    .eq('menu_item_id', menuItemId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[fetchOodasByMenuItemId]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

/** Ooda を INSERT して返す。失敗時は Error を throw する */
export async function insertOoda(input: OodaInput): Promise<Ooda> {
  if (!supabase) throw new Error('Supabase 未設定（.env.local を確認してください）')
  const { data, error } = await supabase
    .from('Ooda')
    .insert({
      menu_item_id: input.menu_item_id ?? null,
      title:        input.title,
      content:      input.content  ?? '',
      category:     input.category,
      status:       input.status   ?? 'Observe',
    })
    .select('*, menu_item:MenuItem(*)')
    .single()
  if (error) {
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(' | ')
    console.error('[insertOoda]', error.code, detail)
    throw new Error(detail || error.message)
  }
  return mapRow(data as Record<string, unknown>)
}

/** ステータス・タイトル・内容をまとめて UPDATE。失敗時は Error を throw する */
export async function updateOodaFields(
  id: string,
  fields: { status?: OodaStatus; title?: string; content?: string },
): Promise<Ooda> {
  if (!supabase) throw new Error('Supabase 未設定（.env.local を確認してください）')
  const { data, error } = await supabase
    .from('Ooda')
    .update(fields)
    .eq('id', id)
    .select('*, menu_item:MenuItem(*)')
    .single()
  if (error) {
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(' | ')
    console.error('[updateOodaFields]', error.code, detail)
    throw new Error(detail || error.message)
  }
  return mapRow(data as Record<string, unknown>)
}

/** ステータスを UPDATE（カンバンの列移動用） */
export async function updateOodaStatus(id: string, status: OodaStatus): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('Ooda').update({ status }).eq('id', id)
  if (error) { console.error('[updateOodaStatus]', error.message); return false }
  return true
}

/** アイテムを DELETE */
export async function deleteOoda(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('Ooda').delete().eq('id', id)
  if (error) { console.error('[deleteOoda]', error.message); return false }
  return true
}
