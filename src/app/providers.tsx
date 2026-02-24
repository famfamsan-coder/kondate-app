'use client'

import { ScheduleProvider } from '@/lib/scheduleContext'
import type { Menu } from '@/lib/types'

interface ProvidersProps {
  children: React.ReactNode
  /** layout.tsx の fetchMenus() から渡されるメニューデータ */
  menus: Menu[]
}

export function Providers({ children, menus }: ProvidersProps) {
  return (
    <ScheduleProvider initialMenus={menus}>
      {children}
    </ScheduleProvider>
  )
}
