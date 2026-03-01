import type { Metadata } from 'next'
import { AppNav } from '@/components/nav/AppNav'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'こんだてアプリ | 厨房作業管理システム',
  description: '高齢者施設の厨房における調理作業量の見える化と献立の継続的改善（PDCA）を実現するWebアプリケーション',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <AppNav />
          {/* Desktop: offset for sidebar (w-56 = 224px). Mobile: bottom padding for bottom nav. */}
          <main className="lg:ml-56 min-h-screen bg-slate-50">
            <div className="pb-24 lg:pb-10">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  )
}
