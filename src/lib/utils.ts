import { clsx, type ClassValue } from 'clsx'
import { NutritionSummary, Schedule } from './types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function calcNutrition(schedules: Schedule[]): NutritionSummary {
  return schedules.reduce(
    (acc, s) => {
      if (!s.menu) return acc
      return {
        calories: acc.calories + s.menu.calories,
        protein: acc.protein + s.menu.protein,
        salt: acc.salt + s.menu.salt,
        fat: acc.fat + s.menu.fat,
        carbohydrate: acc.carbohydrate + s.menu.carbohydrate,
        total_time: acc.total_time + s.menu.standard_time,
      }
    },
    { calories: 0, protein: 0, salt: 0, fat: 0, carbohydrate: 0, total_time: 0 }
  )
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

export const SALT_LIMIT_PER_MEAL = 2.5 // g
export const CALORIE_LIMIT_PER_MEAL = 800 // kcal
export const DAILY_SALT_LIMIT = 7.5 // g
