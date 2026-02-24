import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Issue, IssueStatus } from '@/lib/types'

const STATUS_STYLE: Record<IssueStatus, string> = {
  '未対応': 'bg-red-100 text-red-700 border-red-200',
  '対応中': 'bg-amber-100 text-amber-700 border-amber-200',
  '解決済': 'bg-green-100 text-green-700 border-green-200',
}

interface Props {
  issues: Issue[]
}

export function IssueReminders({ issues }: Props) {
  const open = issues.filter(i => i.status !== '解決済')

  if (open.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        今週の未解決課題はありません
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {open.map(issue => (
        <li key={issue.id} className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm text-slate-800">{issue.menu?.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[issue.status]}`}>
                {issue.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">{issue.description}</p>
            {issue.next_action && (
              <p className="text-xs text-teal-700 mt-1 font-medium">→ {issue.next_action}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
