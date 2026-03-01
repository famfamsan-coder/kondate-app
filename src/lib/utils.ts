import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}(${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]})`
}

export function getWeekDates(baseDate: Date): string[] {
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ─── カテゴリ表示順 ────────────────────────────────────────────────────────
// 未定義カテゴリは末尾（order = 99）
const CATEGORY_ORDER: Record<string, number> = {
  '主食':    0,
  '主菜':    1,
  '副菜':    2,
  '汁物':    3,
  'デザート': 4,
}

/** MenuItem をカテゴリ固定順 → created_at 昇順でソートして返す（破壊なし） */
export function sortMenuItems<T extends { category: string; created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const oa = CATEGORY_ORDER[a.category] ?? 99
    const ob = CATEGORY_ORDER[b.category] ?? 99
    if (oa !== ob) return oa - ob
    return a.created_at.localeCompare(b.created_at)
  })
}
