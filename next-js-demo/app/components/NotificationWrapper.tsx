'use client'

import { OrderNotificationListener } from './OrderNotificationListener'
import { PushNotificationManager } from './PushNotificationManager'
import { InstallPrompt } from './InstallPrompt'

interface NotificationWrapperProps {
  isAdmin: boolean
}

/**
 * Wrapper component that conditionally renders notification features
 * Only shown to non-admin users (warehouse staff who need order alerts)
 */
export function NotificationWrapper({ isAdmin }: NotificationWrapperProps) {
  // Only show notification features to non-admin users
  if (isAdmin) {
    return null
  }

  return (
    <>
      {/* Real-time listener for in-app notifications */}
      <OrderNotificationListener />

      {/* UI for managing notifications and installation */}
      <div className="max-w-2xl mx-auto space-y-4 mb-8">
        <InstallPrompt />
        <PushNotificationManager />
      </div>
    </>
  )
}
