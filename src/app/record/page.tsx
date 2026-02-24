'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Calculator, Lock, Unlock, AlertCircle, Loader2 } from 'lucide-react'
import { StarRating } from '@/components/record/StarRating'
import { VoiceInput } from '@/components/record/VoiceInput'
import { useSchedules } from '@/lib/scheduleContext'
import { fetchRecordByScheduleId, upsertRecord } from '@/lib/api/records'
import { MealType, MenuCategory, MENU_CATEGORIES, Schedule } from '@/lib/types'
import { toDateString, getWeekDates } from '@/lib/utils'

const MEAL_TYPES: MealType[] = ['朝食', '昼食', '夕食']

const SCORE_LABELS = [
  { key: 'prep',    label: '仕込み',   desc: '下ごしらえ・準備作業' },
  { key: 'measure', label: '計量',     desc: '食材計量作業' },
  { key: 'cook',    label: '調理',     desc: '加熱・調理作業' },
  { key: 'serve',   label: '盛り付け', desc: '盛り付け・配膳作業' },
] as const

type ScoreKey = typeof SCORE_LABELS[number]['key']

const MINUTES_PER_STAR = 5

function calcAutoTime(scores: Record<ScoreKey, number>): number {
  return (scores.prep + scores.measure + scores.cook + scores.serve) * MINUTES_PER_STAR
}

const INITIAL_SCORES: Record<ScoreKey, number> = { prep: 0, measure: 0, cook: 0, serve: 0 }

interface FormState {
  date: string
  meal_type: MealType
  schedule_id: string
  useFixedTime: boolean
  scores: Record<ScoreKey, number>
  total_time: string
  timeIsManual: boolean
  note: string
}

const CATEGORY_STYLE: Partial<Record<MenuCategory, string>> = {
  '主食':     'bg-sky-100 text-sky-700 border-sky-200',
  '主菜':     'bg-orange-100 text-orange-700 border-orange-200',
  '副菜':     'bg-green-100 text-green-700 border-green-200',
  '汁物':     'bg-amber-100 text-amber-700 border-amber-200',
  'デザート': 'bg-pink-100 text-pink-700 border-pink-200',
}

export default function RecordPage() {
  const { getCell, loadWeek } = useSchedules()

  const [form, setForm] = useState<FormState>({
    date:         toDateString(new Date()),
    meal_type:    '朝食',
    schedule_id:  '',
    useFixedTime: false,
    scores:       INITIAL_SCORES,
    total_time:   '',
    timeIsManual: false,
    note:         '',
  })
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [submitted, setSubmitted]   = useState(false)
  const [isSaving, setIsSaving]     = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [loadingRecord, setLoadingRecord] = useState(false)

  // 日付が変わったら Supabase からその週のスケジュールをロード
  useEffect(() => {
    loadWeek(getWeekDates(new Date(form.date)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date])

  const mealsForDate = getCell(form.date, form.meal_type)

  const presentCategories = [
    ...new Set(
      mealsForDate
        .map(s => s.menu?.category)
        .filter((c): c is MenuCategory => !!c)
    ),
  ]
  const orderedCategories = MENU_CATEGORIES.filter(c => presentCategories.includes(c))

  const filteredMenus = selectedCategory
    ? mealsForDate.filter(s => s.menu?.category === selectedCategory)
    : []

  const selectedSchedule: Schedule | undefined = mealsForDate.find(s => s.id === form.schedule_id)
  const selectedMenu = selectedSchedule?.menu

  // ── ハンドラ ──────────────────────────────────────

  const resetToMeal = (date: string, meal: MealType) => {
    setSelectedCategory(null)
    setForm(f => ({
      ...f, date, meal_type: meal,
      schedule_id: '', useFixedTime: false, scores: INITIAL_SCORES,
      total_time: '', timeIsManual: false, note: '',
    }))
  }

  const selectCategory = (cat: MenuCategory) => {
    setSelectedCategory(cat)
    setForm(f => ({
      ...f, schedule_id: '', useFixedTime: false, scores: INITIAL_SCORES,
      total_time: '', timeIsManual: false, note: '',
    }))
  }

  const selectMenu = async (scheduleId: string) => {
    const schedule = mealsForDate.find(s => s.id === scheduleId)
    const menu = schedule?.menu
    const fixed = menu?.is_fixed_time === true

    // まずデフォルト値でセット
    setForm(f => ({
      ...f,
      schedule_id: scheduleId,
      useFixedTime: fixed,
      scores:       INITIAL_SCORES,
      total_time:   fixed ? String(menu?.standard_time ?? '') : '',
      timeIsManual: false,
      note:         '',
    }))
    setSaveError(null)

    // 既存レコードがあれば上書き
    setLoadingRecord(true)
    const existing = await fetchRecordByScheduleId(scheduleId)
    setLoadingRecord(false)
    if (existing) {
      setForm(f => ({
        ...f,
        scores: {
          prep:    existing.prep_score,
          measure: existing.measure_score,
          cook:    existing.cook_score,
          serve:   existing.serve_score,
        },
        total_time:   existing.total_time != null ? String(existing.total_time) : f.total_time,
        timeIsManual: existing.total_time != null,
        note:         existing.note ?? '',
      }))
    }
  }

  const toggleFixedTime = () => {
    setForm(f => {
      const newFixed = !f.useFixedTime
      if (newFixed) {
        return { ...f, useFixedTime: true, total_time: String(selectedMenu?.standard_time ?? ''), timeIsManual: false }
      } else {
        const autoCalc = calcAutoTime(f.scores)
        return { ...f, useFixedTime: false, total_time: autoCalc > 0 ? String(autoCalc) : '', timeIsManual: false }
      }
    })
  }

  const setScore = (key: ScoreKey, v: number) => {
    setForm(f => {
      if (f.useFixedTime) return f
      const newScores = { ...f.scores, [key]: v }
      const newTime = f.timeIsManual ? f.total_time : String(calcAutoTime(newScores))
      return { ...f, scores: newScores, total_time: newTime }
    })
  }

  const handleTimeChange = (v: string) => {
    setForm(f => ({ ...f, total_time: v, timeIsManual: true }))
  }

  const resetAutoTime = () => {
    setForm(f => ({
      ...f,
      total_time: f.useFixedTime
        ? String(selectedMenu?.standard_time ?? '')
        : String(calcAutoTime(f.scores)),
      timeIsManual: false,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.schedule_id || form.total_time === '') return

    setIsSaving(true)
    setSaveError(null)

    const error = await upsertRecord({
      schedule_id:   form.schedule_id,
      prep_score:    form.scores.prep,
      measure_score: form.scores.measure,
      cook_score:    form.scores.cook,
      serve_score:   form.scores.serve,
      total_time:    parseInt(form.total_time) || null,
      note:          form.note || null,
    })

    setIsSaving(false)

    if (error) {
      setSaveError(error)
      return
    }

    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setForm(f => ({
        ...f, schedule_id: '', useFixedTime: false, scores: INITIAL_SCORES,
        total_time: '', timeIsManual: false, note: '',
      }))
    }, 2500)
  }

  const autoTime  = calcAutoTime(form.scores)
  const hasScores = !Object.values(form.scores).every(v => v === 0)
  const avgScore  = !form.useFixedTime && hasScores
    ? (Object.values(form.scores).reduce((a, b) => a + b, 0) / 4).toFixed(1)
    : null

  const canSubmit = !!form.schedule_id && form.total_time !== '' && !isSaving

  const showResetTime = form.timeIsManual && (
    form.useFixedTime ? !!selectedMenu?.standard_time : hasScores
  )
  const resetTimeLabel = form.useFixedTime
    ? `↩ 標準時間（${selectedMenu?.standard_time}分）に戻す`
    : `↩ 自動計算値（${autoTime}分）に戻す`

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">作業記録・評価入力</h1>
        <p className="text-sm text-slate-500 mt-0.5">現場スタッフ用（スマホ対応）</p>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          記録を保存しました。次のメニューを選択してください。
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          保存に失敗しました: {saveError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ① 日付・食事区分 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <h2 className="font-bold text-slate-700 text-sm">① 対象の食事を選択</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">日付</label>
            <input
              type="date"
              value={form.date}
              onChange={e => resetToMeal(e.target.value, form.meal_type)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">食事区分</label>
            <div className="grid grid-cols-3 gap-2">
              {MEAL_TYPES.map(meal => (
                <button key={meal} type="button"
                  onClick={() => resetToMeal(form.date, meal)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.meal_type === meal
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ② ジャンル選択 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-slate-700 text-sm">② ジャンルを選択</h2>
          {orderedCategories.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">この日付・食事区分のメニューがありません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orderedCategories.map(cat => (
                <button
                  key={cat} type="button"
                  onClick={() => selectCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    selectedCategory === cat
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                      : `${CATEGORY_STYLE[cat] ?? 'bg-slate-50 text-slate-600 border-slate-200'} hover:border-teal-300`
                  }`}
                >
                  {cat}
                  <span className="ml-1.5 text-xs opacity-70">
                    {mealsForDate.filter(s => s.menu?.category === cat).length}品
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ③ メニュー選択 */}
        {selectedCategory && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${CATEGORY_STYLE[selectedCategory] ?? ''}`}>
                {selectedCategory}
              </span>
              <h2 className="font-bold text-slate-700 text-sm">③ 評価するメニューを選択</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredMenus.map(s => (
                <button
                  key={s.id} type="button"
                  onClick={() => selectMenu(s.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    form.schedule_id === s.id
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{s.menu?.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">目安 {s.menu?.standard_time}分</p>
                    </div>
                    {s.menu?.is_fixed_time && (
                      <span className="shrink-0 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />固定
                      </span>
                    )}
                  </div>
                  {s.menu?.tags && s.menu.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.menu.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {/* 既存レコード読込中インジケーター */}
            {loadingRecord && (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                過去の評価データを読み込み中…
              </div>
            )}
          </div>
        )}

        {/* ④ 評価エリア */}
        {selectedSchedule && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-700 text-sm">④ 作業負荷評価（0〜10 ★）</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-600">{selectedMenu?.name}</span> の評価
                  </p>
                </div>
                {avgScore && (
                  <span className="text-xs text-slate-500">
                    平均 <span className="text-teal-600 font-bold text-sm">{avgScore}</span>
                  </span>
                )}
              </div>

              {/* 固定/個別評価トグル */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                form.useFixedTime ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 hover:border-teal-300'
              }`}>
                <div className="relative shrink-0 w-10 h-6">
                  <input type="checkbox" checked={form.useFixedTime} onChange={toggleFixedTime} className="sr-only" />
                  <div className={`absolute inset-0 rounded-full transition-colors ${form.useFixedTime ? 'bg-teal-600' : 'bg-slate-300'}`} />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.useFixedTime ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    {form.useFixedTime
                      ? <><Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />標準時間で固定中</>
                      : <><Unlock className="w-3.5 h-3.5 text-teal-500 shrink-0" />個別評価モード</>
                    }
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    標準時間: {selectedMenu?.standard_time}分
                    {selectedMenu?.is_fixed_time && (
                      <span className="ml-1.5 text-slate-300">（マスタ設定: デフォルト固定）</span>
                    )}
                  </p>
                </div>
              </label>

              {/* 星評価（固定中はグレーアウト） */}
              <div className={`space-y-4 transition-opacity duration-200 ${form.useFixedTime ? 'opacity-40 pointer-events-none' : ''}`}>
                {SCORE_LABELS.map(({ key, label, desc }) => (
                  <div key={key}>
                    <StarRating label={label} value={form.scores[key]} onChange={v => setScore(key, v)} />
                    <p className="text-xs text-slate-400 mt-0.5 ml-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ⑤ 実作業時間（常に手動入力可能） */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-sm font-bold text-slate-700">⑤ 実作業時間（分）</label>
                {!form.useFixedTime && hasScores && (
                  <div className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-xs text-teal-600 font-medium">
                      ({form.scores.prep}+{form.scores.measure}+{form.scores.cook}+{form.scores.serve})×{MINUTES_PER_STAR} = {autoTime}分
                    </span>
                  </div>
                )}
              </div>
              <input
                type="number" min={0} max={300}
                value={form.total_time}
                onChange={e => handleTimeChange(e.target.value)}
                placeholder={form.useFixedTime ? undefined : '★を入力すると自動計算'}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  form.timeIsManual ? 'border-amber-300 bg-amber-50' : 'border-slate-300'
                }`}
              />
              {showResetTime && (
                <button type="button" onClick={resetAutoTime} className="text-xs text-teal-600 hover:underline">
                  {resetTimeLabel}
                </button>
              )}
              {form.timeIsManual && (
                <p className="text-xs text-amber-600">手動入力中（直接入力値が優先されます）</p>
              )}
            </div>

            {/* ⑥ 音声メモ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <label className="text-sm font-bold text-slate-700 block mb-2">
                ⑥ 課題・気づきメモ
                <span className="ml-2 text-xs font-normal text-teal-600">🎤 音声入力対応</span>
              </label>
              <VoiceInput
                value={form.note}
                onChange={v => setForm(f => ({ ...f, note: v }))}
                placeholder="気づいたこと、改善案などを自由に入力（マイクボタンで音声入力）"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-sm transition-colors shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {!form.schedule_id
                ? 'メニューを選択してください'
                : form.total_time === ''
                ? '作業時間を入力してください'
                : isSaving
                ? '保存中…'
                : `「${selectedMenu?.name}」の記録を保存する`}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
