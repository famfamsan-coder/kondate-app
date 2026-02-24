'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Tag, Lock, Unlock, X, Loader2 } from 'lucide-react'
import { IssueCard } from '@/components/knowledge/IssueCard'
import { useSchedules } from '@/lib/scheduleContext'
import { Issue, IssueStatus, Menu, MenuCategory, MENU_CATEGORIES } from '@/lib/types'
import {
  fetchIssues,
  insertIssue,
  updateIssueStatus,
  updateIssueNextAction,
} from '@/lib/api/issues'

type PageTab = '課題管理' | 'メニュー管理'
type StatusFilter = 'すべて' | IssueStatus

const CATEGORY_STYLE: Partial<Record<MenuCategory, string>> = {
  '主食':     'bg-sky-100 text-sky-700',
  '主菜':     'bg-orange-100 text-orange-700',
  '副菜':     'bg-green-100 text-green-700',
  '汁物':     'bg-amber-100 text-amber-700',
  'デザート': 'bg-pink-100 text-pink-700',
}

// ──────────────────────────────────────────────
// メニュー管理タブ
// ──────────────────────────────────────────────
function MenuManagement() {
  const { allMenus } = useSchedules()
  const [menus, setMenus] = useState<Menu[]>(allMenus)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | 'すべて'>('すべて')
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const filtered = menus.filter(m => {
    const matchCat = categoryFilter === 'すべて' || m.category === categoryFilter
    const matchSearch = !searchQuery || m.name.includes(searchQuery) || m.tags.some(t => t.includes(searchQuery))
    return matchCat && matchSearch
  })

  const addTag = (id: string, tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    setMenus(prev => prev.map(m =>
      m.id === id && !m.tags.includes(trimmed) ? { ...m, tags: [...m.tags, trimmed] } : m
    ))
    setTagInput('')
  }

  const removeTag = (id: string, tag: string) => {
    setMenus(prev => prev.map(m =>
      m.id === id ? { ...m, tags: m.tags.filter(t => t !== tag) } : m
    ))
  }

  const toggleFixedTime = (id: string) => {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, is_fixed_time: !m.is_fixed_time } : m))
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルタ */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="メニュー名・タグで検索…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {(['すべて', ...MENU_CATEGORIES] as (MenuCategory | 'すべて')[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* メニューリスト */}
      <div className="space-y-3">
        {filtered.map(m => {
          const isEditing = editingMenuId === m.id
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              {/* ヘッダー行 */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{m.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLE[m.category] ?? 'bg-slate-100 text-slate-600'}`}>
                      {m.category}
                    </span>
                    <span className="text-xs text-slate-400">標準 {m.standard_time}分</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 固定時間トグル */}
                  <button
                    type="button"
                    onClick={() => toggleFixedTime(m.id)}
                    title={m.is_fixed_time ? 'クリックで固定を解除' : 'クリックで固定時間に設定'}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      m.is_fixed_time
                        ? 'bg-slate-100 text-slate-600 border-slate-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {m.is_fixed_time ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {m.is_fixed_time ? '固定' : '通常'}
                  </button>
                  {/* タグ編集トグル */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMenuId(isEditing ? null : m.id)
                      setTagInput('')
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isEditing
                        ? 'bg-teal-50 text-teal-700 border-teal-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    タグ編集
                  </button>
                </div>
              </div>

              {/* タグ表示 */}
              <div className="flex flex-wrap gap-1.5">
                {m.tags.length === 0 && !isEditing && (
                  <span className="text-xs text-slate-400 italic">タグなし</span>
                )}
                {m.tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeTag(m.id, tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* タグ入力フォーム（編集中のみ） */}
              {isEditing && (
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag(m.id, tagInput) }
                    }}
                    placeholder="タグを入力（例: 魚、和食）"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => addTag(m.id, tagInput)}
                    disabled={!tagInput.trim()}
                    className="px-3 py-1.5 bg-teal-600 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingMenuId(null); setTagInput('') }}
                    className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs rounded-lg hover:bg-slate-50"
                  >
                    完了
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────
export default function KnowledgePage() {
  const { allMenus } = useSchedules()
  const [activeTab, setActiveTab] = useState<PageTab>('課題管理')
  const [issues, setIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('すべて')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIssue, setNewIssue] = useState({ menu_id: '', description: '', next_action: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchIssues().then(data => {
      setIssues(data)
      setIsLoading(false)
    })
  }, [])

  const handleStatusChange = async (id: string, status: IssueStatus) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    await updateIssueStatus(id, status)
  }

  const handleNextActionChange = async (id: string, next_action: string) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, next_action } : i))
    await updateIssueNextAction(id, next_action)
  }

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIssue.menu_id || !newIssue.description) return
    setIsSubmitting(true)
    const saved = await insertIssue({
      menu_id: newIssue.menu_id,
      description: newIssue.description,
      next_action: newIssue.next_action,
    })
    setIsSubmitting(false)
    if (saved) {
      setIssues(prev => [saved, ...prev])
    }
    setNewIssue({ menu_id: '', description: '', next_action: '' })
    setShowAddForm(false)
  }

  const filtered = issues.filter(issue => {
    const matchStatus = statusFilter === 'すべて' || issue.status === statusFilter
    const matchSearch = !searchQuery || issue.menu?.name.includes(searchQuery) || issue.description.includes(searchQuery)
    return matchStatus && matchSearch
  })

  const counts: Record<StatusFilter, number> = {
    'すべて': issues.length,
    '未対応': issues.filter(i => i.status === '未対応').length,
    '対応中': issues.filter(i => i.status === '対応中').length,
    '解決済': issues.filter(i => i.status === '解決済').length,
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ナレッジ管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">課題PDCA・メニューマスタ管理</p>
        </div>
        {activeTab === '課題管理' && (
          <button
            onClick={() => setShowAddForm(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />新規課題
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {(['課題管理', 'メニュー管理'] as PageTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'メニュー管理' ? '🍽 メニュー管理' : '📋 課題管理'}
          </button>
        ))}
      </div>

      {/* ── 課題管理タブ ── */}
      {activeTab === '課題管理' && (
        <>
          {showAddForm && (
            <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-4 space-y-3">
              <h2 className="font-bold text-slate-700 text-sm">新規課題の登録</h2>
              <form onSubmit={handleAddIssue} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">メニュー</label>
                  <select
                    value={newIssue.menu_id}
                    onChange={e => setNewIssue(f => ({ ...f, menu_id: e.target.value }))}
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">メニューを選択…</option>
                    {allMenus.map(m => (
                      <option key={m.id} value={m.id}>{m.name}（{m.category}）</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">課題の内容</label>
                  <textarea
                    value={newIssue.description}
                    onChange={e => setNewIssue(f => ({ ...f, description: e.target.value }))}
                    required rows={3}
                    placeholder="発生した課題や問題点を詳しく記入…"
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">次回の改善案（任意）</label>
                  <textarea
                    value={newIssue.next_action}
                    onChange={e => setNewIssue(f => ({ ...f, next_action: e.target.value }))}
                    rows={2}
                    placeholder="改善のためのアクションプランを記入…"
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 disabled:bg-teal-400 text-white text-sm font-bold rounded-xl hover:bg-teal-700"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    登録する
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">キャンセル</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="メニュー名・課題内容で検索…"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {(['すべて', '未対応', '対応中', '解決済'] as StatusFilter[]).map(status => (
                <button key={status} onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === status ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {status}
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${statusFilter === status ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {counts[status]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">課題データを読み込み中…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">該当する課題がありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(issue => (
                <IssueCard key={issue.id} issue={issue}
                  onStatusChange={handleStatusChange}
                  onNextActionChange={handleNextActionChange}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── メニュー管理タブ ── */}
      {activeTab === 'メニュー管理' && <MenuManagement />}
    </div>
  )
}
