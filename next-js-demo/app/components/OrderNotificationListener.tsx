'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Initialize Supabase client for real-time subscriptions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Component that listens for real-time order creation events
 * Shows browser notifications when new orders are created (in-app only)
 * This component doesn't render any UI - it just manages the subscription
 */
export function OrderNotificationListener() {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    console.log('[OrderNotificationListener] Setting up real-time subscription')

    // Subscribe to INSERT events on the orders table
    channelRef.current = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[OrderNotificationListener] New order received:', payload)

          const newOrder = payload.new as any

          // Show browser notification if permission is granted
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('New Order Created!', {
              body: `Order #${newOrder.order_number} for ${newOrder.customer_name} needs fulfillment`,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: newOrder.id, // Prevents duplicate notifications
              requireInteraction: false,
              data: {
                orderId: newOrder.id,
                orderNumber: newOrder.order_number,
                url: `/stock/out?order=${newOrder.order_number}`,
              },
            })

            // Handle notification click
            notification.onclick = function(event) {
              event.preventDefault()
              window.focus()
              window.location.href = `/stock/out?order=${newOrder.order_number}`
              notification.close()
            }
          }

          // Optional: Play notification sound
          try {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.5
            audio.play().catch((err) => {
              console.log('[OrderNotificationListener] Audio play failed (user interaction required):', err)
            })
          } catch (err) {
            console.log('[OrderNotificationListener] Audio not available:', err)
          }

          // Optional: Show in-app toast notification
          // If you have a toast library, trigger it here
          // Example: toast.success('New order received!')
        }
      )
      .subscribe((status) => {
        console.log('[OrderNotificationListener] Subscription status:', status)

        if (status === 'SUBSCRIBED') {
          console.log('[OrderNotificationListener] Successfully subscribed to order notifications')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[OrderNotificationListener] Channel error - check Supabase Realtime configuration')
        } else if (status === 'TIMED_OUT') {
          console.error('[OrderNotificationListener] Subscription timed out - retrying...')
        }
      })

    // Cleanup: Unsubscribe when component unmounts
    return () => {
      if (channelRef.current) {
        console.log('[OrderNotificationListener] Cleaning up subscription')
        supabase.removeChannel(channelRef.current)
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // This component doesn't render anything
  return null
}
