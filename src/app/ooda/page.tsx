'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronRight, X, Loader2, AlertCircle, Target, Trash2, Pencil, Download, Bot, CheckCircle2 } from 'lucide-react'
import { fetchOodas, insertOoda, updateOodaStatus, updateOodaFields, deleteOoda } from '@/lib/api/ooda'
import type { OodaInput } from '@/lib/api/ooda'
import type { Ooda, OodaStatus, OodaCategory } from '@/lib/types'
import { OODA_CATEGORIES, OODA_STATUSES } from '@/lib/types'

// ─── ステータス設定 ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OodaStatus, {
  ja: string; desc: string; icon: string
  header: string; card: string; badge: string
}> = {
  'Observe': {
    ja: 'Observe', desc: '観察・発見', icon: '👁',
    header: 'bg-sky-600',
    card:   'border-sky-100 hover:border-sky-300',
    badge:  'bg-sky-100 text-sky-700',
  },
  'Orient': {
    ja: 'Orient', desc: '状況判断', icon: '🔍',
    header: 'bg-violet-600',
    card:   'border-violet-100 hover:border-violet-300',
    badge:  'bg-violet-100 text-violet-700',
  },
  'Decide': {
    ja: 'Decide', desc: '対策決定', icon: '💡',
    header: 'bg-amber-500',
    card:   'border-amber-100 hover:border-amber-300',
    badge:  'bg-amber-100 text-amber-700',
  },
  'Act': {
    ja: 'Act', desc: '実施済み', icon: '✅',
    header: 'bg-emerald-600',
    card:   'border-emerald-100 hover:border-emerald-300',
    badge:  'bg-emerald-100 text-emerald-700',
  },
}

// ─── カテゴリ設定 ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<OodaCategory, { icon: string; style: string }> = {
  '献立':             { icon: '🍱', style: 'bg-teal-100 text-teal-700' },
  '備品・お皿':       { icon: '🍽️', style: 'bg-purple-100 text-purple-700' },
  '動線・環境':       { icon: '🚶', style: 'bg-amber-100 text-amber-700' },
  'マニュアル作成':   { icon: '📋', style: 'bg-blue-100 text-blue-700' },
  '衛生・整理・整頓': { icon: '🧹', style: 'bg-cyan-100 text-cyan-700' },
  'その他':           { icon: '📝', style: 'bg-slate-100 text-slate-600' },
}

// ─── フィルタリング ───────────────────────────────────────────────────────

type PeriodFilter   = 'all' | 'thisMonth' | 'lastMonth'
type StatusFilter   = 'all' | 'unresolved' | 'resolved'
type CategoryFilter = OodaCategory | 'all'

function applyExportFilters(
  items:          Ooda[],
  period:         PeriodFilter,
  statusFilter:   StatusFilter,
  categoryFilter: CategoryFilter,
): Ooda[] {
  let result = [...items]

  if (period !== 'all') {
    const now  = new Date()
    const y    = now.getFullYear()
    const m    = now.getMonth()
    const [ty, tm] = period === 'thisMonth'
      ? [y, m]
      : m === 0 ? [y - 1, 11] : [y, m - 1]
    result = result.filter(item => {
      const d = new Date(item.created_at)
      return d.getFullYear() === ty && d.getMonth() === tm
    })
  }

  if (statusFilter === 'unresolved') result = result.filter(i => i.status !== 'Act')
  else if (statusFilter === 'resolved') result = result.filter(i => i.status === 'Act')

  if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter)

  return result
}

function generateCsv(items: Ooda[]): string {
  const BOM    = '\uFEFF'
  const header = '登録日,カテゴリ,タイトル,内容・詳細,ステータス'
  const esc    = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows   = items.map(item => [
    item.created_at.slice(0, 10),
    item.category,
    esc(item.title),
    esc(item.content),
    `${STATUS_CONFIG[item.status].ja}（${STATUS_CONFIG[item.status].desc}）`,
  ].join(','))
  return BOM + [header, ...rows].join('\r\n')
}

function generateAiPrompt(items: Ooda[]): string {
  const th  = '| 登録日 | カテゴリ | タイトル | 内容 | ステータス |'
  const sep = '|--------|----------|----------|------|------------|'
  const rows = items.map(item =>
    `| ${item.created_at.slice(0, 10)} | ${item.category} | ${item.title} | ${item.content || '－'} | ${STATUS_CONFIG[item.status].icon}${STATUS_CONFIG[item.status].ja}（${STATUS_CONFIG[item.status].desc}） |`
  )
  const table = [th, sep, ...rows].join('\n')

  return `あなたは給食・厨房運営の専門コンサルタントです。
以下の「現場の課題と改善記録（OODAデータ）」を分析し、月次会議用の報告書を作成してください。

【出力要件】
1. 今月の成果：解決済みの課題とその対応内容のまとめ
2. 懸念事項：現在も未解決の重要な課題（※安全・衛生・アレルギー関連があれば最優先で警告すること）
3. 今後のアクション：現場の傾向から読み取れる、次月への具体的な改善提案
フォーマットは、会議録にそのまま転記できる簡潔でプロフェッショナルな構成にしてください。

【現場のデータ】
${table}`
}

// ─── トースト通知 ─────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-slate-800 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl whitespace-nowrap">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      {message}
    </div>
  )
}

// ─── データ抽出モーダル ────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'all'       as PeriodFilter, label: 'すべて' },
  { value: 'thisMonth' as PeriodFilter, label: '今月'   },
  { value: 'lastMonth' as PeriodFilter, label: '先月'   },
]
const STATUS_FILTER_OPTIONS = [
  { value: 'all'        as StatusFilter, label: 'すべて' },
  { value: 'unresolved' as StatusFilter, label: '未解決のみ（Observe / Orient / Decide）' },
  { value: 'resolved'   as StatusFilter, label: '解決済みのみ（Act）' },
]

function ExportModal({
  items,
  onClose,
  onToast,
}: {
  items:   Ooda[]
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const [period,    setPeriod]    = useState<PeriodFilter>('thisMonth')
  const [statusF,   setStatusF]   = useState<StatusFilter>('all')
  const [categoryF, setCategoryF] = useState<CategoryFilter>('all')
  const [copying,   setCopying]   = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const filtered = applyExportFilters(items, period, statusF, categoryF)

  const handleCsvDownload = () => {
    const csv  = generateCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `OODAデータ_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyPrompt = async () => {
    const text = generateAiPrompt(filtered)
    setCopying(true)
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      onToast('コピーしました。AIに貼り付けてください')
      onClose()
    } catch {
      onToast('コピーに失敗しました。手動でコピーしてください')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-600" />
            データ抽出 / 報告書作成
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">対象期間</label>
            <div className="flex gap-2">
              {PERIOD_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPeriod(opt.value)}
                  className={`flex-1 text-sm py-2 rounded-xl border font-medium transition-colors ${
                    period === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">ステータス</label>
            <div className="flex flex-col gap-1.5">
              {STATUS_FILTER_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setStatusF(opt.value)}
                  className={`text-sm py-2 px-3 rounded-xl border text-left font-medium transition-colors ${
                    statusF === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">カテゴリ</label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setCategoryF('all')}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  categoryF === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                すべて
              </button>
              {OODA_CATEGORIES.map(cat => {
                const cc = CATEGORY_CONFIG[cat]
                return (
                  <button key={cat} type="button" onClick={() => setCategoryF(cat)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      categoryF === cat ? `${cc.style} border-current` : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cc.icon} {cat}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
            <span className="font-bold text-teal-700 text-lg">{filtered.length}</span>
            件のデータが対象です
          </div>

          <div className="space-y-2 pt-1">
            <button type="button" onClick={handleCsvDownload} disabled={filtered.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4 text-teal-600" />
              CSVをダウンロード
            </button>
            <button type="button" onClick={handleCopyPrompt} disabled={filtered.length === 0 || copying}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition-colors"
            >
              {copying
                ? <><Loader2 className="w-4 h-4 animate-spin" />コピー中…</>
                : <><Bot className="w-4 h-4" />AI報告書用プロンプトをコピー</>
              }
            </button>
            <p className="text-center text-[11px] text-slate-400">
              ChatGPT・Gemini 等に貼り付けるだけで月次報告書を自動生成できます
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OODAカード ───────────────────────────────────────────────────────────

function OodaCard({
  item, onEdit, onAdvance, onDelete,
}: {
  item:      Ooda
  onEdit:    (item: Ooda) => void
  onAdvance: (id: string, next: OodaStatus) => void
  onDelete:  (id: string) => void
}) {
  const cfg        = STATUS_CONFIG[item.status]
  const catCfg     = CATEGORY_CONFIG[item.category]
  const statusIdx  = OODA_STATUSES.indexOf(item.status)
  const nextStatus = statusIdx < OODA_STATUSES.length - 1
    ? OODA_STATUSES[statusIdx + 1]
    : null

  return (
    <div
      onClick={() => onEdit(item)}
      className={`group relative bg-white rounded-xl border p-3 shadow-xs transition-all cursor-pointer ${cfg.card}`}
    >
      <button type="button"
        onClick={e => { e.stopPropagation(); onDelete(item.id) }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
        title="削除"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <span className="absolute top-2 right-8 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
        <Pencil className="w-3 h-3 text-slate-500" />
      </span>

      <div className="flex items-center gap-1.5 mb-2 pr-8">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${catCfg.style}`}>
          {catCfg.icon} {item.category}
        </span>
        {item.menu_item && (
          <span className="text-xs text-teal-600 truncate">
            {item.menu_item.date} {item.menu_item.meal_type} {item.menu_item.menu_name}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-800 leading-snug mb-1.5">{item.title}</p>

      {item.content && item.content !== item.title && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{item.content}</p>
      )}

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
        <span className="text-[11px] text-slate-400">{item.created_at.slice(0, 10)}</span>
        {nextStatus ? (
          <button type="button"
            onClick={e => { e.stopPropagation(); onAdvance(item.id, nextStatus) }}
            className={`flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[nextStatus].badge} hover:opacity-80 transition-opacity`}
          >
            {STATUS_CONFIG[nextStatus].desc}へ <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <span className="text-[11px] font-medium text-emerald-600">完了</span>
        )}
      </div>
    </div>
  )
}

// ─── 編集モーダル ─────────────────────────────────────────────────────────

function EditModal({
  item, onClose, onSave,
}: {
  item:    Ooda
  onClose: () => void
  onSave:  (id: string, fields: { status: OodaStatus; title: string; content: string }) => Promise<void>
}) {
  const [status,  setStatus]  = useState<OodaStatus>(item.status)
  const [title,   setTitle]   = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true); setError('')
    try {
      await onSave(item.id, { status, title: title.trim(), content: content.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-teal-600" />
            課題を編集
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">ステータス</label>
            <div className="grid grid-cols-2 gap-2">
              {OODA_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      status === s ? `${cfg.badge} border-current` : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base">{cfg.icon}</span>
                    <div className="text-left">
                      <p>{cfg.ja}</p>
                      <p className="text-[10px] opacity-60 font-normal leading-tight">{cfg.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">タイトル</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">内容・詳細</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-300"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button type="button" onClick={handleSave} disabled={!title.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />保存中…</> : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 新規登録モーダル ─────────────────────────────────────────────────────

function AddModal({
  onClose, onAdd,
}: {
  onClose: () => void
  onAdd:   (input: OodaInput) => Promise<void>
}) {
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [category, setCategory] = useState<OodaCategory>('その他')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSaving(true); setError('')
    try {
      await onAdd({
        title:        title.trim(),
        content:      content.trim(),
        category,
        menu_item_id: null,
        status:       'Observe',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" />
            新しい課題・気付きを登録
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">カテゴリ</label>
            <div className="grid grid-cols-2 gap-2">
              {OODA_CATEGORIES.map(cat => {
                const cc = CATEGORY_CONFIG[cat]
                return (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      category === cat ? `${cc.style} border-current` : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cc.icon}</span>{cat}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              タイトル <span className="text-red-400">*</span>
            </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="例：きのこあんのとろみが強すぎる"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">詳細・内容（任意）</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
              placeholder="状況の詳細や観察した内容を書いてください"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-300"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button type="button" onClick={handleSubmit} disabled={!title.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />登録中…</>
                : <><Plus className="w-3.5 h-3.5" />登録</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OODAボードページ ─────────────────────────────────────────────────────

export default function OodaPage() {
  const [items,       setItems]       = useState<Ooda[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [editingItem, setEditingItem] = useState<Ooda | null>(null)
  const [filterCat,   setFilterCat]   = useState<OodaCategory | 'all'>('all')
  const [toast,       setToast]       = useState('')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }, [])

  useEffect(() => {
    fetchOodas().then(data => { setItems(data); setLoading(false) })
  }, [])

  const handleAdvance = useCallback(async (id: string, next: OodaStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    await updateOodaStatus(id, next)
  }, [])

  const handleEdit = useCallback(async (
    id: string,
    fields: { status: OodaStatus; title: string; content: string },
  ) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i))
    setEditingItem(null)
    await updateOodaFields(id, fields)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('この課題を削除しますか？')) return
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteOoda(id)
  }, [])

  const handleAdd = async (input: OodaInput) => {
    const inserted = await insertOoda(input)
    setItems(prev => [inserted, ...prev])
    setShowModal(false)
  }

  const filteredItems  = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)
  const totalByStatus  = (s: OodaStatus) => items.filter(i => i.status === s).length

  return (
    <div className="p-4 lg:p-8 max-w-screen-xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            OODAボード
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">現場の気付きを観察→判断→対策→実施のサイクルで改善</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />データ抽出 / 報告書作成
          </button>
          <button type="button" onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />新しい課題・気付きを登録
          </button>
        </div>
      </div>

      {/* ── カテゴリフィルター ── */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <button onClick={() => setFilterCat('all')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            filterCat === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          すべて ({items.length})
        </button>
        {OODA_CATEGORIES.map(cat => {
          const cc  = CATEGORY_CONFIG[cat]
          const cnt = items.filter(i => i.category === cat).length
          return (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filterCat === cat ? `${cc.style} border-current` : 'text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cc.icon} {cat} ({cnt})
            </button>
          )
        })}
      </div>

      {/* ── カンバンボード ── */}
      {loading ? (
        <div className="flex items-center gap-3 py-16 justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />読み込み中…
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="grid grid-cols-4 gap-3 min-w-[720px]">
            {OODA_STATUSES.map(status => {
              const cfg      = STATUS_CONFIG[status]
              const colItems = filteredItems.filter(i => i.status === status)
              return (
                <div key={status} className="flex flex-col gap-2">
                  <div className={`${cfg.header} text-white rounded-xl px-3 py-2.5 flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold">{cfg.icon} {cfg.ja}</p>
                      <p className="text-[11px] opacity-80">{cfg.desc}</p>
                    </div>
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {totalByStatus(status)}
                    </span>
                  </div>
                  {colItems.length === 0 ? (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-300">
                      カードなし
                    </div>
                  ) : (
                    colItems.map(item => (
                      <OodaCard key={item.id} item={item}
                        onEdit={setEditingItem}
                        onAdvance={handleAdvance}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showModal    && <AddModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
      {editingItem  && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleEdit} />}
      {showExport   && <ExportModal items={items} onClose={() => setShowExport(false)} onToast={showToast} />}
      {toast        && <Toast message={toast} />}
    </div>
  )
}
