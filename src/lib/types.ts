export type MealType    = '朝食' | '昼食' | '夕食'
export type IssueStatus = '未対応' | '対応中' | '解決済'

export const MEAL_TYPES: MealType[] = ['朝食', '昼食', '夕食']

// 1料理1行（縦持ち）献立・作業記録統合テーブル
export interface MenuItem {
  id:           string
  date:         string    // YYYY-MM-DD
  meal_type:    MealType
  menu_name:    string    // 料理名
  category:     string    // カテゴリ（自由テキスト）
  tags:         string[]  // タグ（例: ["肉", "アレルゲン"]）
  note:         string    // 注意事項（マニュアル的な事前メモ）
  comment:      string    // 改善メモ（当日の出来栄え・気づき）
  prep_time:    number    // 仕込み時間（分）
  measure_time: number    // 計量時間（分）
  cook_time:    number    // 調理時間（分）
  serve_time:   number    // 盛り付け時間（分）
  created_at:   string
}

// 課題・PDCA管理
export interface Issue {
  id:          string
  date:        string
  description: string
  status:      IssueStatus
  next_action: string
}

// ─── OODA ─────────────────────────────────────────────────────────────────

export type OodaCategory = '献立' | '備品・お皿' | '動線・環境' | 'マニュアル作成' | '衛生・整理・整頓' | 'その他'
export type OodaStatus   = 'Observe' | 'Orient' | 'Decide' | 'Act'

export const OODA_CATEGORIES: OodaCategory[] = ['献立', '備品・お皿', '動線・環境', 'マニュアル作成', '衛生・整理・整頓', 'その他']
export const OODA_STATUSES:   OodaStatus[]   = ['Observe', 'Orient', 'Decide', 'Act']

export interface Ooda {
  id:           string
  menu_item_id: string | null  // null = 全般的な課題（献立に紐づかない）
  title:        string
  content:      string
  category:     OodaCategory
  status:       OodaStatus
  created_at:   string
  menu_item?:   MenuItem
}
