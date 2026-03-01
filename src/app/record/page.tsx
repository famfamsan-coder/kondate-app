'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { StarRating } from '@/components/record/StarRating'
import {
  fetchMenuItemsByDate,
  insertMenuItem,
  updateMenuItemTimes,
  updateMenuItemComment,
  deleteMenuItem,
} from '@/lib/api/menuItems'
import { insertOoda } from '@/lib/api/ooda'
import type { MenuItem, MealType } from '@/lib/types'
import { MEAL_TYPES } from '@/lib/types'
import { toDateString, sortMenuItems } from '@/lib/utils'

// ─── 定数 ─────────────────────────────────────────────────────────────────

const MINUTES_PER_STAR = 5
const DEBOUNCE_MS      = 600

// カテゴリ別ヘッダーカラー（背景 + テキスト + ボーダー）
const CATEGORY_HEADER: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  '主食':    { bg: 'bg-amber-500',  text: 'text-white',      border: 'border-amber-500',  badge: 'bg-amber-100 text-amber-800' },
  '主菜':    { bg: 'bg-red-500',    text: 'text-white',      border: 'border-red-500',    badge: 'bg-red-100 text-red-800'   },
  '副菜':    { bg: 'bg-green-600',  text: 'text-white',      border: 'border-green-600',  badge: 'bg-green-100 text-green-800' },
  '汁物':    { bg: 'bg-blue-500',   text: 'text-white',      border: 'border-blue-500',   badge: 'bg-blue-100 text-blue-800'  },
  'デザート': { bg: 'bg-pink-500',   text: 'text-white',      border: 'border-pink-500',   badge: 'bg-pink-100 text-pink-800'  },
}
const DEFAULT_HEADER = { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-600', badge: 'bg-slate-100 text-slate-700' }

function getCategoryHeader(category: string) {
  return CATEGORY_HEADER[category] ?? DEFAULT_HEADER
}

const SCORE_LABELS = [
  { key: 'prep_time'    as const, label: '仕込み',   desc: '下ごしらえ・準備作業' },
  { key: 'measure_time' as const, label: '計量',     desc: '食材計量作業' },
  { key: 'cook_time'    as const, label: '調理',     desc: '加熱・調理作業' },
  { key: 'serve_time'   as const, label: '盛り付け', desc: '盛り付け・配膳作業' },
]

type TimeKey = 'prep_time' | 'measure_time' | 'cook_time' | 'serve_time'

type SaveStatus = 'idle' | 'saving' | 'saved'

function totalMinutes(item: MenuItem): number {
  return item.prep_time + item.measure_time + item.cook_time + item.serve_time
}

// ─── メニュー行コンポーネント ──────────────────────────────────────────────

function MenuItemRow({
  item,
  onTimeChange,
  onDelete,
  onCommentChange,
  saveStatus,
  commentStatus,
}: {
  item:            MenuItem
  onTimeChange:    (id: string, key: TimeKey, minutes: number) => void
  onDelete:        (id: string) => void
  onCommentChange: (id: string, comment: string) => void
  saveStatus:      SaveStatus
  commentStatus:   SaveStatus
}) {
  const [oodaStatus, setOodaStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const total  = totalMinutes(item)
  const colors = getCategoryHeader(item.category)

  const handleRegisterOoda = async () => {
    if (!item.comment.trim() || oodaStatus !== 'idle') return
    setOodaStatus('sending')
    try {
      await insertOoda({
        menu_item_id: item.id,
        title:        `[${item.menu_name}] の改善メモ`,
        content:      item.comment,
        category:     '献立',
        status:       'Observe',
      })
      setOodaStatus('done')
    } catch {
      setOodaStatus('error')
      setTimeout(() => setOodaStatus('idle'), 3000)
    }
  }

  return (
    <div className={`rounded-2xl border-2 ${colors.border} shadow-sm overflow-hidden`}>
      {/* カラーヘッダー：メニュー名を大きく強調 */}
      <div className={`${colors.bg} px-4 py-3 flex items-center justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <p className={`text-xl font-bold leading-snug ${colors.text}`}>
            {item.menu_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.category && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                {item.category}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-white/80">
              <Clock className="w-3 h-3" />
              合計 <span className="font-bold">{total} 分</span>
            </span>
            {item.tags.length > 0 && item.tags.map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 text-white/90">
                {tag}
              </span>
            ))}
            {saveStatus === 'saving' && (
              <span className="text-xs text-white/70 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                保存中…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-white/90 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                保存済み
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-colors shrink-0"
          title="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white px-4 py-3 space-y-3">
        {/* 注意事項（マニュアルメモ） */}
        {item.note && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">注意事項</p>
            <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{item.note}</p>
          </div>
        )}

        {/* 4 star ratings */}
        {SCORE_LABELS.map(({ key, label, desc }) => (
          <div key={key}>
            <StarRating
              label={label}
              value={Math.round(item[key] / MINUTES_PER_STAR)}
              onChange={v => onTimeChange(item.id, key, v * MINUTES_PER_STAR)}
            />
            <p className="text-xs text-slate-400 mt-0.5 ml-1">{desc}</p>
          </div>
        ))}

        {/* 改善メモ（当日の出来栄え・気づき） */}
        <div className="pt-3 border-t border-slate-100">
          <label className="text-xs font-medium text-slate-600">
            改善メモ
            <span className="ml-1 font-normal text-slate-400">（今日の出来栄え・気づきを記録）</span>
          </label>
          <div className="relative mt-1">
            <textarea
              value={item.comment}
              onChange={e => onCommentChange(item.id, e.target.value)}
              placeholder="例：盛り付けに時間がかかった。次回は事前に器を並べておく。"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            {commentStatus === 'saving' && (
              <span className="absolute bottom-2 right-2 text-xs text-slate-400 flex items-center gap-1 bg-white/80 px-1 rounded">
                <Loader2 className="w-3 h-3 animate-spin" />
                保存中…
              </span>
            )}
            {commentStatus === 'saved' && (
              <span className="absolute bottom-2 right-2 text-xs text-teal-600 flex items-center gap-1 bg-white/80 px-1 rounded">
                <CheckCircle2 className="w-3 h-3" />
                保存済み
              </span>
            )}
          </div>

          {/* OODAに課題登録ボタン（メモが入力済みのときのみ表示） */}
          {item.comment.trim() && (
            <div className="mt-2 flex justify-end">
              {oodaStatus === 'done' ? (
                <span className="text-xs text-teal-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  OODAボードに登録済み
                </span>
              ) : oodaStatus === 'error' ? (
                <span className="text-xs text-red-500">登録に失敗しました</span>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterOoda}
                  disabled={oodaStatus === 'sending'}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-600 border border-slate-200 hover:border-teal-300 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                >
                  {oodaStatus === 'sending'
                    ? <><Loader2 className="w-3 h-3 animate-spin" />登録中…</>
                    : <><Plus className="w-3 h-3" />OODAボードに課題登録</>
                  }
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────────────────────

export default function RecordPage() {
  const [date,     setDate]     = useState(toDateString(new Date()))
  const [mealType, setMealType] = useState<MealType>('朝食')
  const [items,    setItems]    = useState<MenuItem[]>([])
  const [loading,  setLoading]  = useState(false)
  const [showAdd,  setShowAdd]  = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newCat,   setNewCat]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [saveStatuses,    setSaveStatuses]    = useState<Record<string, SaveStatus>>({})
  const [commentStatuses, setCommentStatuses] = useState<Record<string, SaveStatus>>({})

  // debounce タイマー管理（key = item.id or `${item.id}_comment`）
  const timers   = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // 最新の items を debounce コールバック内で参照するため ref で持つ
  const itemsRef = useRef<MenuItem[]>(items)
  itemsRef.current = items

  // 未保存の debounce タイマーをすべて即時実行して保存する
  const flushPendingSaves = useCallback(async () => {
    const keys = [...timers.current.keys()]
    if (keys.length === 0) return

    // タイマーを全停止してマップをクリア
    for (const timer of timers.current.values()) clearTimeout(timer)
    timers.current.clear()

    // key が "_comment" で終わるかどうかで分類
    const itemIds: string[]    = []
    const commentIds: string[] = []
    for (const key of keys) {
      if (key.endsWith('_comment')) commentIds.push(key.slice(0, -'_comment'.length))
      else itemIds.push(key)
    }

    try {
      await Promise.all([
        ...itemIds.map(id => {
          const latest = itemsRef.current.find(i => i.id === id)
          if (!latest) return Promise.resolve()
          return updateMenuItemTimes(id, {
            prep_time:    latest.prep_time,
            measure_time: latest.measure_time,
            cook_time:    latest.cook_time,
            serve_time:   latest.serve_time,
          })
        }),
        ...commentIds.map(id => {
          const latest = itemsRef.current.find(i => i.id === id)
          if (!latest) return Promise.resolve()
          return updateMenuItemComment(id, latest.comment)
        }),
      ])
    } catch (err) {
      console.error('[flushPendingSaves]', err)
    }
  }, [])

  // 日付・食事区分が変わったらデータ取得（切り替え前のタイマーは即時フラッシュ）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await flushPendingSaves()
      if (cancelled) return
      setSaveStatuses({})
      setCommentStatuses({})
      setLoading(true)
      setItems([])
      const data = await fetchMenuItemsByDate(date, mealType)
      if (!cancelled) { setItems(sortMenuItems(data)); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [date, mealType, flushPendingSaves])

  // ── 時間変更（楽観的更新 + debounce 保存） ──────────────────────────────
  const handleTimeChange = useCallback((id: string, key: TimeKey, minutes: number) => {
    // 楽観的更新
    setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: minutes } : item))
    setSaveStatuses(prev => ({ ...prev, [id]: 'saving' }))

    // debounce — タイマーをリセット
    const existing = timers.current.get(id)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      const latest = itemsRef.current.find(i => i.id === id)
      if (!latest) return
      updateMenuItemTimes(id, {
        prep_time:    latest.prep_time,
        measure_time: latest.measure_time,
        cook_time:    latest.cook_time,
        serve_time:   latest.serve_time,
      }).then(() => {
        setSaveStatuses(s => ({ ...s, [id]: 'saved' }))
        setTimeout(() => {
          setSaveStatuses(s => s[id] === 'saved' ? { ...s, [id]: 'idle' } : s)
        }, 2000)
      })
      timers.current.delete(id)
    }, DEBOUNCE_MS)

    timers.current.set(id, timer)
  }, [])

  // ── 改善メモ変更（楽観的更新 + debounce 保存） ────────────────────────
  const handleCommentChange = useCallback((id: string, comment: string) => {
    // 楽観的更新（itemsRef も同期される）
    setItems(prev => prev.map(item => item.id === id ? { ...item, comment } : item))
    setCommentStatuses(prev => ({ ...prev, [id]: 'saving' }))

    const key = `${id}_comment`
    const existing = timers.current.get(key)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      // itemsRef から最新値を読む（時間ハンドラと同じパターン）
      const latest = itemsRef.current.find(i => i.id === id)
      if (!latest) return
      updateMenuItemComment(id, latest.comment).then(errMsg => {
        if (errMsg) {
          console.error('[handleCommentChange]', errMsg)
          return
        }
        setCommentStatuses(s => ({ ...s, [id]: 'saved' }))
        setTimeout(() => {
          setCommentStatuses(s => s[id] === 'saved' ? { ...s, [id]: 'idle' } : s)
        }, 2000)
      })
      timers.current.delete(key)
    }, DEBOUNCE_MS)

    timers.current.set(key, timer)
  }, [])

  // ── 削除 ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    const existing = timers.current.get(id)
    if (existing) { clearTimeout(existing); timers.current.delete(id) }
    const commentTimer = timers.current.get(`${id}_comment`)
    if (commentTimer) { clearTimeout(commentTimer); timers.current.delete(`${id}_comment`) }
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteMenuItem(id)
  }, [])

  // ── メニュー追加 ──────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    const inserted = await insertMenuItem({
      date,
      meal_type: mealType,
      menu_name: newName.trim(),
      category:  newCat.trim(),
    })
    setAdding(false)
    if (inserted) {
      setItems(prev => sortMenuItems([...prev, inserted]))
      setNewName('')
      setNewCat('')
      setShowAdd(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">作業記録・評価入力</h1>
        <p className="text-sm text-slate-500 mt-0.5">メニュー単位で作業時間を記録</p>
      </div>

      {/* ① 日付・食事区分 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <h2 className="font-bold text-slate-700 text-sm">① 対象の食事を選択</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">日付</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">食事区分</label>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.map(meal => (
              <button key={meal} type="button"
                onClick={() => setMealType(meal)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  mealType === meal
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

      {/* ② メニュー一覧 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">読み込み中…</span>
          </div>
        ) : (
          <>
            {items.length === 0 && !showAdd && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-400">まだメニューが登録されていません</p>
                <p className="text-xs text-slate-300 mt-1">下の「＋ メニューを追加」から登録できます</p>
              </div>
            )}

            {items.map(item => (
              <MenuItemRow
                key={item.id}
                item={item}
                onTimeChange={handleTimeChange}
                onDelete={handleDelete}
                onCommentChange={handleCommentChange}
                saveStatus={saveStatuses[item.id] ?? 'idle'}
                commentStatus={commentStatuses[item.id] ?? 'idle'}
              />
            ))}

            {/* メニュー追加フォーム */}
            {showAdd && (
              <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-4 space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">メニューを追加</h3>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    メニュー名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    placeholder="例：ご飯、鶏の唐揚げ"
                    autoFocus
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">カテゴリ（任意）</label>
                  <input
                    type="text"
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    placeholder="例：主食、主菜、副菜、汁物"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewName(''); setNewCat('') }}
                    className="flex-1 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newName.trim() || adding}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                  >
                    {adding
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />追加中…</>
                      : <><Plus className="w-3.5 h-3.5" />追加</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ＋ メニューを追加ボタン */}
            {!showAdd && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                メニューを追加
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
