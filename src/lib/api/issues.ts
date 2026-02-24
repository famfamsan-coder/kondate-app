import { supabase } from '@/lib/supabase'
import type { Issue, IssueStatus, MenuCategory } from '@/lib/types'

function mapRow(row: Record<string, unknown>): Issue {
  const m = row.menu as Record<string, unknown> | null
  return {
    id:          row.id as string,
    menu_id:     row.menu_id as string,
    date:        row.date as string,
    description: row.description as string,
    status:      row.status as IssueStatus,
    next_action: (row.next_action as string) ?? '',
    menu: m ? {
      id:            m.id as string,
      name:          m.name as string,
      category:      m.category as MenuCategory,
      standard_time: m.standard_time as number,
      calories:      Number(m.calories),
      protein:       Number(m.protein),
      salt:          Number(m.salt),
      fat:           Number(m.fat),
      carbohydrate:  Number(m.carbohydrate),
      tags:          Array.isArray(m.tags) ? (m.tags as string[]) : [],
      is_fixed_time: Boolean(m.is_fixed_time),
    } : undefined,
  }
}

/** 全課題を新しい順で取得（Menu 情報を join） */
export async function fetchIssues(): Promise<Issue[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('Issue')
    .select('*, menu:Menu(*)')
    .order('created_at', { ascending: false })
  if (error) { console.error('[fetchIssues]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

export interface IssueInput {
  menu_id: string
  description: string
  next_action: string
}

/** 課題を INSERT して返す */
export async function insertIssue(input: IssueInput): Promise<Issue | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('Issue')
    .insert({
      menu_id:     input.menu_id,
      date:        new Date().toISOString().split('T')[0],
      description: input.description,
      next_action: input.next_action || null,
    })
    .select('*, menu:Menu(*)')
    .single()
  if (error) { console.error('[insertIssue]', error.message); return null }
  return mapRow(data as Record<string, unknown>)
}

/** ステータスを UPDATE */
export async function updateIssueStatus(id: string, status: IssueStatus): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('Issue').update({ status }).eq('id', id)
  if (error) { console.error('[updateIssueStatus]', error.message); return false }
  return true
}

/** 改善案テキストを UPDATE */
export async function updateIssueNextAction(id: string, next_action: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('Issue')
    .update({ next_action: next_action || null })
    .eq('id', id)
  if (error) { console.error('[updateIssueNextAction]', error.message); return false }
  return true
}
