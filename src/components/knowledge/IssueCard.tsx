'use client'

import { CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Issue, IssueStatus } from '@/lib/types'

const STATUS_CONFIG: Record<IssueStatus, { color: string; icon: React.ElementType }> = {
  '未対応': { color: 'bg-red-100 text-red-700 border-red-200',   icon: XCircle },
  '対応中': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  '解決済': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
}

interface Props {
  issue: Issue
  onStatusChange: (id: string, status: IssueStatus) => void
  onNextActionChange: (id: string, text: string) => void
}

export function IssueCard({ issue, onStatusChange, onNextActionChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editingAction, setEditingAction] = useState(false)
  const [draftAction, setDraftAction] = useState(issue.next_action)
  const { color, icon: Icon } = STATUS_CONFIG[issue.status]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-bold text-slate-800">{issue.menu?.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{issue.date}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            {issue.status}
          </span>
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">
          {issue.description}
        </p>

        {issue.next_action && !editingAction && (
          <div className="mt-2 text-sm">
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">次回の改善案</span>
            <p className="text-slate-700 mt-0.5 leading-relaxed">{issue.next_action}</p>
          </div>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-3 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? '閉じる' : '詳細・編集'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {/* ステータス変更 */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">ステータス変更</p>
            <div className="flex gap-2">
              {(['未対応', '対応中', '解決済'] as IssueStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => onStatusChange(issue.id, status)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium ${
                    issue.status === status
                      ? STATUS_CONFIG[status].color + ' shadow-sm'
                      : 'text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* 改善案編集 */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">次回の改善案</p>
            {editingAction ? (
              <div className="space-y-2">
                <textarea
                  value={draftAction}
                  onChange={e => setDraftAction(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onNextActionChange(issue.id, draftAction)
                      setEditingAction(false)
                    }}
                    className="flex-1 py-1.5 bg-teal-600 text-white text-xs rounded-lg font-medium hover:bg-teal-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setDraftAction(issue.next_action); setEditingAction(false) }}
                    className="flex-1 py-1.5 border border-slate-200 text-slate-500 text-xs rounded-lg hover:bg-slate-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingAction(true)}
                className="w-full text-left p-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
              >
                {issue.next_action || '＋ 改善案を入力…'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
