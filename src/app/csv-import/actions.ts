'use server'

// このモジュールはサーバー専用です。
// クライアントバンドルに含まれた場合はビルドエラーになります。
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { MealType } from '@/lib/types'

export interface BulkImportItem {
  date:      string
  meal_type: MealType
  menu_name: string
  category:  string
  tags?:     string[]
  note?:     string
}

type BulkImportResult =
  | { success: true;  count: number }
  | { success: false; error: string }

/**
 * CSV インポート Server Action。
 *
 * ⚠️ supabase.ts のモジュールシングルトンは意図的に使わない。
 *    supabase.ts は menuItemContext.tsx ('use client') の依存ツリーに含まれるため
 *    クライアントバンドルにも存在する。同じモジュールを Server Action でインポートすると
 *    Turbopack/Webpack がサーバー境界を誤判定し、Server Action をブラウザで実行してしまう。
 *    そのため createClient を関数スコープ内で直接呼び出し、依存チェーンを断ち切る。
 */
export async function bulkImportMenuItemsAction(
  items: BulkImportItem[],
): Promise<BulkImportResult> {
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: 'Supabase が未設定です。環境変数 NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。',
    }
  }

  // auth を無効化して navigator.locks / localStorage を使わないサーバー専用クライアント
  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false,
    },
  })

  if (items.length === 0) return { success: true, count: 0 }

  // Step 1: インポート対象の (date, meal_type) ペアを重複なく抽出
  const pairSet = new Set<string>()
  for (const item of items) pairSet.add(`${item.date}___${item.meal_type}`)
  const pairs = [...pairSet].map(key => {
    const sep = key.indexOf('___')
    return { date: key.slice(0, sep), meal_type: key.slice(sep + 3) as MealType }
  })

  // Step 2: 対象セルの既存 MenuItem を削除（上書き保証）
  for (const { date, meal_type } of pairs) {
    const { error } = await sb
      .from('MenuItem')
      .delete()
      .eq('date', date)
      .eq('meal_type', meal_type)
    if (error) {
      console.error('[bulkImportMenuItemsAction] delete', error.message)
      return { success: false, error: `既存データ削除エラー: ${error.message}` }
    }
  }

  // Step 3: 新データを一括 INSERT
  const rows = items.map(m => ({
    date:      m.date,
    meal_type: m.meal_type,
    menu_name: m.menu_name,
    category:  m.category,
    tags:      m.tags ?? [],
    note:      m.note ?? '',
  }))

  const { data, error } = await sb
    .from('MenuItem')
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[bulkImportMenuItemsAction] insert', error.message, error.details, error.hint)
    return { success: false, error: `保存エラー（MenuItem）: ${error.message}` }
  }

  return { success: true, count: data?.length ?? 0 }
}
