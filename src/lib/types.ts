export type MealType = '朝食' | '昼食' | '夕食'
export type MenuCategory = '主食' | '主菜' | '副菜' | '汁物' | 'デザート'
export type IssueStatus = '未対応' | '対応中' | '解決済'

export const MENU_CATEGORIES: MenuCategory[] = ['主食', '主菜', '副菜', '汁物', 'デザート']

export interface Menu {
  id: string
  name: string
  category: MenuCategory
  standard_time: number // 標準作業時間（分）
  calories: number // kcal
  protein: number // g
  salt: number // g
  fat: number // g
  carbohydrate: number // g
  tags: string[]          // AI判定用タグ 例: ['魚', '和食', '煮物']
  is_fixed_time: boolean  // true = 定番メニュー（星評価スキップ・standard_timeを固定使用）
}

export interface Schedule {
  id: string
  date: string // YYYY-MM-DD
  meal_type: MealType
  menu_id: string
  menu?: Menu
}

export interface WorkRecord {
  id: string
  schedule_id: string
  prep_score: number    // 仕込み 0-10（0=不要）
  measure_score: number // 計量 0-10
  cook_score: number    // 調理 0-10
  serve_score: number   // 盛り付け 0-10
  total_time: number    // 実作業時間（分）
  note: string
  created_at: string
  schedule?: Schedule & { menu?: Menu }
}

export interface Issue {
  id: string
  menu_id: string
  date: string
  description: string
  status: IssueStatus
  next_action: string
  menu?: Menu
}

export interface NutritionSummary {
  calories: number
  protein: number
  salt: number
  fat: number
  carbohydrate: number
  total_time: number
}
