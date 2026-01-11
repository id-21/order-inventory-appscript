'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser } from '../actions/push-notifications'

/**
 * Converts VAPID public key from base64 to Uint8Array
 * Required for PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array<ArrayBuffer>
}

/**
 * Component for managing push notification subscriptions
 * Allows users to enable/disable push notifications for order updates
 */
export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if browser supports service workers and push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    } else {
      console.warn('[PushNotificationManager] Browser does not support PWA features')
    }
  }, [])

  /**
   * Register service worker and check for existing subscription
   */
  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      console.log('[PushNotificationManager] Service worker registered')

      // Check if user already has an active subscription
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)

      if (sub) {
        console.log('[PushNotificationManager] Existing subscription found')
      }
    } catch (error) {
      console.error('[PushNotificationManager] Service worker registration failed:', error)
      setError('Failed to register service worker')
    }
  }

  /**
   * Subscribe to push notifications
   * Requests browser permission and saves subscription to database
   */
  async function subscribeToPush() {
    setIsLoading(true)
    setError(null)

    try {
      // Request notification permission from user
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setError('Notification permission denied')
        setIsLoading(false)
        return
      }

      console.log('[PushNotificationManager] Permission granted')

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      setSubscription(sub)
      console.log('[PushNotificationManager] Push subscription created')

      // Serialize subscription (converts to plain object)
      const serializedSub = JSON.parse(JSON.stringify(sub))

      // Save subscription to database
      const result = await subscribeUser(serializedSub)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save subscription')
      }

      console.log('[PushNotificationManager] Subscription saved to database')
    } catch (error: any) {
      console.error('[PushNotificationManager] Push subscription failed:', error)
      setError(error.message || 'Failed to subscribe to notifications')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Unsubscribe from push notifications
   * Removes browser subscription and marks as inactive in database
   */
  async function unsubscribeFromPush() {
    setIsLoading(true)
    setError(null)

    try {
      // Unsubscribe from browser push
      await subscription?.unsubscribe()
      setSubscription(null)
      console.log('[PushNotificationManager] Browser subscription removed')

      // Mark as inactive in database
      const result = await unsubscribeUser()

      if (!result.success) {
        throw new Error(result.error || 'Failed to unsubscribe')
      }

      console.log('[PushNotificationManager] Subscription removed from database')
    } catch (error: any) {
      console.error('[PushNotificationManager] Unsubscribe failed:', error)
      setError(error.message || 'Failed to unsubscribe')
    } finally {
      setIsLoading(false)
    }
  }

  // Show message if browser doesn't support PWA features
  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ Push notifications are not supported in this browser.
          Try using Chrome, Edge, Safari 16+, or Firefox.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="font-semibold text-lg mb-2">🔔 Push Notifications</h3>

      {subscription ? (
        <div className="space-y-3">
          <p className="text-sm text-green-600 flex items-center gap-2">
            ✓ You will receive notifications for new orders
          </p>
          <button
            onClick={unsubscribeFromPush}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Disable Notifications'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Enable notifications to receive instant alerts when new orders are created
          </p>
          <button
            onClick={subscribeToPush}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Enable Notifications'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Notifications work even when the app is closed. You can manage permissions in your browser settings.
      </p>
    </div>
  )
}
