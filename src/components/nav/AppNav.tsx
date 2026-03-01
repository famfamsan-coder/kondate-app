'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Calendar, FileUp, Target, Thermometer, Download } from 'lucide-react'

const navItems = [
  { href: '/dashboard',  label: 'ダッシュボード',       shortLabel: 'ホーム', icon: LayoutDashboard, mobileHide: false },
  { href: '/record',     label: '作業記録',             shortLabel: '記録',   icon: ClipboardList,   mobileHide: false },
  { href: '/calendar',   label: '献立カレンダー',       shortLabel: '献立',   icon: Calendar,        mobileHide: false },
  { href: '/ooda',       label: 'OODAボード',           shortLabel: 'OODA',   icon: Target,          mobileHide: false },
  { href: '/checks',     label: 'チェックと温度管理',   shortLabel: '点検',   icon: Thermometer,     mobileHide: false },
  { href: '/reports',    label: '提出用出力',           shortLabel: '出力',   icon: Download,        mobileHide: false },
  { href: '/csv-import', label: 'CSVインポート',        shortLabel: 'CSV',    icon: FileUp,          mobileHide: true  },
]

const mobileItems = navItems.filter(i => !i.mobileHide)

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {/* ===== Desktop sidebar ===== */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 bg-teal-700 text-white z-40 shadow-lg">
        <div className="px-5 py-4 border-b border-teal-600">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍱</span>
            <div>
              <h1 className="text-sm font-bold leading-tight">こんだてアプリ</h1>
              <p className="text-xs text-teal-300">厨房作業管理システム</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-teal-100 hover:bg-teal-600/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-5 py-3 border-t border-teal-600">
          <p className="text-xs text-teal-400">v1.0.0</p>
        </div>
      </aside>

      {/* ===== Mobile bottom nav (CSV を除く 6 items) ===== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
        <div className="grid grid-cols-6 safe-b">
          {mobileItems.map(({ href, shortLabel, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  active ? 'text-teal-600' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-none font-medium">{shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
