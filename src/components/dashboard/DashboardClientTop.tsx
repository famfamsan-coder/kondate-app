'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, TrendingUp, CheckCircle2, X, Eye, Compass, Lightbulb } from 'lucide-react'
import type { OodaStatus, MenuItem, Ooda } from '@/lib/types'
import { updateOodaStatus, insertOoda, deleteOoda } from '@/lib/api/ooda'
import { AlertMenus } from './AlertMenus'
import { IssueReminders } from './IssueReminders'

// ─── 型定義 ───────────────────────────────────────────────────────────────

interface ToastState {
  oodaId:         string
  originalStatus: OodaStatus
  actOodaId:      string | null
}

export interface DashboardClientTopProps {
  totalTime:       number        // 本日の合計作業時間（今日の MenuItem から計算）
  todayMealCount:  number        // 本日登録済みメニュー件数
  next3MenuItems:  MenuItem[]    // AlertMenus 用（今日〜3日後）
  allOodas:        Ooda[]
}

// ─── コンポーネント ───────────────────────────────────────────────────────

export function DashboardClientTop({
  totalTime, todayMealCount,
  next3MenuItems, allOodas,
}: DashboardClientTopProps) {
  const [oodas,  setOodas]  = useState<Ooda[]>(allOodas)
  const [toast,  setToast]  = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openCount    = oodas.filter(o => o.status !== 'Act').length
  const observeCount = oodas.filter(o => o.status === 'Observe').length
  const orientCount  = oodas.filter(o => o.status === 'Orient').length
  const decideCount  = oodas.filter(o => o.status === 'Decide').length
  const actCount     = oodas.filter(o => o.status === 'Act').length

  // トースト自動消去（6 秒）
  useEffect(() => {
    if (!toast) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast])

  // ─── 課題解決ハンドラ ─────────────────────────────────────────────────

  const handleResolve = async (oodaId: string, actionMemo: string) => {
    const ooda = oodas.find(o => o.id === oodaId)
    if (!ooda) return
    const originalStatus = ooda.status

    setOodas(prev => prev.map(o =>
      o.id === oodaId ? { ...o, status: 'Act' as OodaStatus } : o
    ))

    await updateOodaStatus(oodaId, 'Act')

    let insertedActOodaId: string | null = null
    if (actionMemo.trim()) {
      try {
        const newOoda = await insertOoda({
          menu_item_id: ooda.menu_item_id,
          title:        `対応: ${ooda.title.slice(0, 28)}`,
          content:      actionMemo.trim(),
          category:     '献立',
          status:       'Act',
        })
        insertedActOodaId = newOoda.id
      } catch (e) {
        console.error('[handleResolve] OODA 登録失敗:', e)
      }
    }

    setToast({ oodaId, originalStatus, actOodaId: insertedActOodaId })
  }

  // ─── Undo ハンドラ ────────────────────────────────────────────────────

  const handleUndo = async () => {
    if (!toast) return
    if (timerRef.current) clearTimeout(timerRef.current)

    setOodas(prev => prev.map(o =>
      o.id === toast.oodaId ? { ...o, status: toast.originalStatus } : o
    ))

    await updateOodaStatus(toast.oodaId, toast.originalStatus)
    if (toast.actOodaId) await deleteOoda(toast.actOodaId)
    setToast(null)
  }

  const openOodas = oodas.filter(o => o.status !== 'Act')

  return (
    <>
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="本日の作業時間（合計）"
          value={totalTime > 0 ? `${totalTime} 分` : '—'}
          icon={<Clock className="w-5 h-5 text-teal-600" />}
          bg="bg-teal-50"
        />
        <KpiCard
          label="本日のメニュー件数"
          value={`${todayMealCount} 品`}
          icon={<TrendingUp className="w-5 h-5 text-sky-600" />}
          bg="bg-sky-50"
        />
        <KpiCard
          label="未解決課題"
          value={`${openCount} 件`}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          bg="bg-amber-50"
          alert={openCount > 0}
        />
      </div>

      {/* ── OODA ステータス別件数 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Observe" value={`${observeCount} 件`} icon={<Eye        className="w-5 h-5 text-sky-600"     />} bg="bg-sky-50"      href="/ooda" />
        <KpiCard label="Orient"  value={`${orientCount} 件`}  icon={<Compass    className="w-5 h-5 text-violet-600" />} bg="bg-violet-50"   href="/ooda" />
        <KpiCard label="Decide"  value={`${decideCount} 件`}  icon={<Lightbulb  className="w-5 h-5 text-amber-500"  />} bg="bg-amber-50"    href="/ooda" />
        <KpiCard label="Act"     value={`${actCount} 件`}     icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" href="/ooda" />
      </div>

      {/* ── 安全優先グリッド: 要注意献立 + 未解決課題 ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-slate-700">⚠️ 直近の要注意メニュー</h2>
            <span className="text-xs text-slate-400">（今日〜3日後）</span>
          </div>
          <AlertMenus menuItems={next3MenuItems} oodas={allOodas} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-700">今週の未解決課題</h2>
            {openOodas.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                要対応
              </span>
            )}
          </div>
          <IssueReminders issues={openOodas} onResolve={handleResolve} />
        </div>
      </div>

      {/* ── Undo トースト ── */}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50">
          <div className="flex items-center gap-3 bg-slate-800 text-white pl-4 pr-3 py-3 rounded-2xl shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm font-medium">課題を解決済みにしました</span>
            <button
              onClick={handleUndo}
              className="text-sm font-bold text-teal-300 hover:text-white transition-colors ml-1 shrink-0 px-1"
            >
              元に戻す
            </button>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white transition-colors shrink-0 p-0.5"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── KPI カード ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, bg, alert = false, href,
}: {
  label: string; value: string; icon: React.ReactNode; bg: string; alert?: boolean; href?: string
}) {
  const inner = (
    <div className={`${bg} rounded-2xl p-4 border ${alert ? 'border-amber-300' : 'border-transparent'}${href ? ' hover:opacity-80 transition-opacity' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}
