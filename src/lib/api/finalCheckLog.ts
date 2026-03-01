import { supabase } from '@/lib/supabase'

export interface CheckItem {
  key:     string
  label:   string
  checked: boolean
}

/** コードで管理する固定チェック項目（順序・ラベルはここで変更可） */
export const DEFAULT_CHECK_ITEMS: Omit<CheckItem, 'checked'>[] = [
  { key: 'gas',          label: 'ガスの元栓を閉めた' },
  { key: 'fire',         label: '火元の確認OK' },
  { key: 'extinguisher', label: '消火器の場所・状態OK' },
  { key: 'lock',         label: '戸締りの確認OK' },
  { key: 'electric',     label: '電気・電源の確認OK' },
  { key: 'clean',        label: '清掃・片付け完了' },
]

function toInitialItems(): CheckItem[] {
  return DEFAULT_CHECK_ITEMS.map(item => ({ ...item, checked: false }))
}

/** DB に保存された items を DEFAULT_CHECK_ITEMS の順序に合わせてマージ */
function mergeItems(stored: unknown): CheckItem[] {
  if (!Array.isArray(stored)) return toInitialItems()
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

/** 指定日付の最終点検ログを取得。未登録は全項目 false で返す */
export async function fetchFinalCheckLog(date: string): Promise<CheckItem[]> {
  if (!supabase) return toInitialItems()
  const { data, error } = await supabase
    .from('FinalCheckLog')
    .select('items')
    .eq('date', date)
    .maybeSingle()
  if (error) {
    console.error('[fetchFinalCheckLog]', error.message)
    return toInitialItems()
  }
  return mergeItems(data?.items)
}

/** 指定日付の最終点検ログを upsert。成功なら true */
export async function upsertFinalCheckLog(
  date: string,
  items: CheckItem[],
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('FinalCheckLog')
    .upsert(
      { date, items, updated_at: new Date().toISOString() },
      { onConflict: 'date' },
    )
  if (error) {
    console.error('[upsertFinalCheckLog]', error.message)
    return false
  }
  return true
}
