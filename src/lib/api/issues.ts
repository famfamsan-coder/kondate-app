import { supabase } from '@/lib/supabase'
import type { Issue, IssueStatus } from '@/lib/types'

function mapRow(row: Record<string, unknown>): Issue {
  return {
    id:          row.id          as string,
    date:        row.date        as string,
    description: row.description as string,
    status:      row.status      as IssueStatus,
    next_action: (row.next_action as string) ?? '',
  }
}

/** 全課題を新しい順で取得 */
export async function fetchIssues(): Promise<Issue[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('Issue')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('[fetchIssues]', error.message); return [] }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
}

export interface IssueInput {
  description: string
  next_action: string
}

/** 課題を INSERT して返す */
export async function insertIssue(input: IssueInput): Promise<Issue | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('Issue')
    .insert({
      date:        new Date().toISOString().split('T')[0],
      description: input.description,
      next_action: input.next_action || null,
    })
    .select()
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
