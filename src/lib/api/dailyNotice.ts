import { supabase } from '@/lib/supabase'

/** 指定日付の今日のお知らせを取得。未登録・未接続の場合は空文字を返す */
export async function fetchDailyNotice(date: string): Promise<string> {
  if (!supabase) return ''
  const { data, error } = await supabase
    .from('dailynotice')
    .select('content')
    .eq('date', date)
    .maybeSingle()
  if (error) {
    console.error('[fetchDailyNotice]', error.message)
    return ''
  }
  return (data?.content as string) ?? ''
}

/** 指定日付の今日のお知らせを upsert（date が一意キー）。成功なら true */
export async function upsertDailyNotice(date: string, content: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('dailynotice')
    .upsert({ date, content }, { onConflict: 'date' })
  if (error) {
    console.error('[upsertDailyNotice]', error.message)
    return false
  }
  return true
}
