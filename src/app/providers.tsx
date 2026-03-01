'use client'

import { MenuItemProvider } from '@/lib/menuItemContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MenuItemProvider>
      {children}
    </MenuItemProvider>
  )
}
