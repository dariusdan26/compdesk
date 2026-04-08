'use client'

import { SessionProvider } from 'next-auth/react'
import { PushNotificationManager } from './components/PushNotificationManager'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PushNotificationManager />
    </SessionProvider>
  )
}
