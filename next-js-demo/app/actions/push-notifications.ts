'use server'

import webpush from 'web-push'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure VAPID details for web push (called lazily to avoid build-time issues)
function ensureVapidDetails() {
  // Only set VAPID details if keys are available
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:support@dagawallpapers.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
}

interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Subscribe the current user to push notifications
 * Stores the browser's push subscription in the database
 */
export async function subscribeUser(sub: PushSubscriptionJSON) {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Save subscription to database (upsert to handle re-subscriptions)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        is_active: true,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'endpoint' // Update if endpoint already exists
      })

    if (error) {
      console.error('[subscribeUser] Database error:', error)
      return { success: false, error: error.message }
    }

    console.log('[subscribeUser] Subscription saved for user:', userId)
    return { success: true }
  } catch (error: any) {
    console.error('[subscribeUser] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unsubscribe the current user from push notifications
 * Marks all user's subscriptions as inactive
 */
export async function unsubscribeUser() {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Mark all user's subscriptions as inactive (soft delete)
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)

    if (error) {
      console.error('[unsubscribeUser] Database error:', error)
      return { success: false, error: error.message }
    }

    console.log('[unsubscribeUser] Subscriptions deactivated for user:', userId)
    return { success: true }
  } catch (error: any) {
    console.error('[unsubscribeUser] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send push notification to a specific user
 * Sends to all their active device subscriptions
 */
export async function sendNotificationToUser(userId: string, payload: {
  title: string
  body: string
  icon?: string
  url?: string
  orderId?: string
}) {
  try {
    // Ensure VAPID details are configured
    ensureVapidDetails()

    // Get all active subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('[sendNotificationToUser] Database error:', error)
      return { success: false, error: error.message }
    }

    if (!subscriptions?.length) {
      console.log('[sendNotificationToUser] No active subscriptions for user:', userId)
      return { success: false, error: 'No active subscriptions' }
    }

    // Send notification to all user's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/icon-192x192.png',
              url: payload.url,
              orderId: payload.orderId,
              tag: payload.orderId || 'notification',
            })
          )

          // Update last_used_at timestamp
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)

          console.log('[sendNotificationToUser] Sent to subscription:', sub.id)
          return { success: true, subscriptionId: sub.id }
        } catch (error: any) {
          console.error('[sendNotificationToUser] Send failed:', error)

          // If subscription expired (410 Gone), mark as inactive
          if (error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id)
            console.log('[sendNotificationToUser] Marked expired subscription as inactive:', sub.id)
          }

          return { success: false, subscriptionId: sub.id, error: error.message }
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    console.log(`[sendNotificationToUser] Sent ${successCount}/${subscriptions.length} notifications`)

    return {
      success: successCount > 0,
      total: subscriptions.length,
      successful: successCount
    }
  } catch (error: any) {
    console.error('[sendNotificationToUser] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Broadcast notification to all non-admin users
 * Used when admin creates a new order that needs fulfillment
 */
export async function broadcastToNonAdmins(payload: {
  title: string
  body: string
  icon?: string
  url?: string
  orderId?: string
}) {
  try {
    // Ensure VAPID details are configured
    ensureVapidDetails()

    // Get all active subscriptions for non-admin users
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select(`
        *,
        users!inner(role)
      `)
      .eq('is_active', true)
      .neq('users.role', 'admin')

    if (error) {
      console.error('[broadcastToNonAdmins] Database error:', error)
      return { success: false, error: error.message }
    }

    if (!subscriptions?.length) {
      console.log('[broadcastToNonAdmins] No active non-admin subscriptions found')
      return { success: false, error: 'No active subscriptions found' }
    }

    console.log(`[broadcastToNonAdmins] Sending to ${subscriptions.length} subscriptions`)

    // Send to all non-admin subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/icon-192x192.png',
              url: payload.url,
              orderId: payload.orderId,
              tag: payload.orderId || 'notification',
            })
          )

          // Update last_used_at
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)

          return { success: true }
        } catch (error: any) {
          console.error('[broadcastToNonAdmins] Send failed:', error)

          // If subscription expired, mark as inactive
          if (error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id)
          }

          return { success: false, error: error.message }
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    console.log(`[broadcastToNonAdmins] Sent ${successCount}/${subscriptions.length} notifications`)

    return {
      success: successCount > 0,
      total: subscriptions.length,
      successful: successCount,
    }
  } catch (error: any) {
    console.error('[broadcastToNonAdmins] Error:', error)
    return { success: false, error: error.message }
  }
}
