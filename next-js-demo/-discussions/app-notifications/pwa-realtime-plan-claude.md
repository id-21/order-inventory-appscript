# PWA + Real-Time Notifications Implementation Guide
**Next.js + Supabase**

---

## Executive Summary

### Features Being Added
1. **Progressive Web App (PWA)** - Installable web app with offline capabilities
2. **Push Notifications** - Background notifications when app is closed
3. **Real-Time Order Updates** - Instant notifications when admin creates orders (no polling)

### Technology Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 14+ (App Router) | Web application |
| Database | Supabase (PostgreSQL) | Data storage + real-time subscriptions |
| Push Notifications | `web-push` npm package | Server-side push delivery |
| Real-Time Updates | Supabase Realtime | WebSocket-based database change listening |
| Service Worker | Native Web API | Handle background push events |
| Client State | React hooks | Manage subscription state |

### Key Benefits
- ✅ **Zero API polling** - Supabase Realtime doesn't count against request limits
- ✅ **Instant delivery** - WebSocket-based, <100ms latency
- ✅ **Background capable** - Users receive notifications even when app is closed
- ✅ **Multi-device support** - Each browser/device gets independent subscription
- ✅ **HTTPS only** - Built-in security requirement

---

## Part 1: Database Schema Setup

### 1.1 Create Push Subscriptions Table

This table stores browser push subscriptions for each user device.

```sql
CREATE TABLE push_subscriptions (
  -- Primary key
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- User association (cascading delete when user deleted)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Push subscription credentials (from browser PushSubscription API)
  endpoint TEXT NOT NULL UNIQUE,  -- Unique push server URL
  p256dh TEXT NOT NULL,            -- Client public key (encryption)
  auth TEXT NOT NULL,              -- Authentication secret (encryption)
  
  -- Device metadata
  user_agent TEXT,                 -- Browser/OS information
  device_name TEXT,                -- Optional: "Chrome on MacBook Pro"
  
  -- Lifecycle management
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ           -- Optional: subscription expiry
);

-- Performance indexes
CREATE INDEX idx_push_subscriptions_user_id 
  ON push_subscriptions(user_id);
  
CREATE INDEX idx_push_subscriptions_active 
  ON push_subscriptions(is_active) 
  WHERE is_active = true;
  
CREATE INDEX idx_push_subscriptions_endpoint 
  ON push_subscriptions(endpoint);
```

**Why separate table?**
- Users can have multiple subscriptions (desktop Chrome, mobile Safari, etc.)
- Subscriptions expire/change independently from user accounts
- Keeps `users` table clean (already has duplicate columns from auth merge)

---

## Part 2: PWA Configuration

### 2.1 Generate VAPID Keys

VAPID keys authenticate your push notifications to browser push services.

```bash
# Install web-push globally
npm install -g web-push

# Generate keys (run once)
web-push generate-vapid-keys
```

Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

⚠️ **IMPORTANT:** Never commit `VAPID_PRIVATE_KEY` to version control!

### 2.2 Create Web App Manifest

Create `app/manifest.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daga Wallpapers Inventory',
    short_name: 'Daga Stock',
    description: 'Real-time inventory management for Daga Wallpapers',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      },
    ],
  }
}
```

**Generate icons:**
1. Use [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Place in `public/` folder

### 2.3 Create Service Worker

Create `public/sw.js`:

```javascript
// Listen for push notifications from server
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      tag: data.tag || 'default', // Prevents duplicate notifications
      data: {
        url: data.url || '/',
        orderId: data.orderId,
        timestamp: Date.now(),
      },
      actions: data.actions || [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' }
      ]
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  
  if (event.action === 'close') {
    return
  }
  
  // Open app or specific URL
  const urlToOpen = event.notification.data.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
```

### 2.4 Security Headers

Update `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
}
```

---

## Part 3: Client-Side Implementation

### 3.1 Push Notification Manager Component

Create `app/components/PushNotificationManager.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser } from '../actions/push-notifications'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  async function subscribeToPush() {
    setIsLoading(true)
    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Notification permission denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      
      setSubscription(sub)
      
      // Serialize and save to database
      const serializedSub = JSON.parse(JSON.stringify(sub))
      await subscribeUser(serializedSub)
    } catch (error) {
      console.error('Push subscription failed:', error)
      alert('Failed to subscribe to notifications')
    } finally {
      setIsLoading(false)
    }
  }

  async function unsubscribeFromPush() {
    setIsLoading(true)
    try {
      await subscription?.unsubscribe()
      setSubscription(null)
      await unsubscribeUser()
    } catch (error) {
      console.error('Unsubscribe failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          Push notifications are not supported in this browser.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white border rounded shadow-sm">
      <h3 className="font-semibold mb-2">Push Notifications</h3>
      {subscription ? (
        <div className="space-y-2">
          <p className="text-sm text-green-600">
            ✓ You will receive notifications for new orders
          </p>
          <button
            onClick={unsubscribeFromPush}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Unsubscribe'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Enable notifications to receive order alerts
          </p>
          <button
            onClick={subscribeToPush}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Enable Notifications'}
          </button>
        </div>
      )}
    </div>
  )
}
```

### 3.2 Install Prompt Component

Create `app/components/InstallPrompt.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    )
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response: ${outcome}`)
    setDeferredPrompt(null)
  }

  if (isStandalone) {
    return null // Already installed
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-semibold mb-2">Install App</h3>
      
      {deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add to Home Screen
        </button>
      )}
      
      {isIOS && !deferredPrompt && (
        <p className="text-sm text-gray-700">
          To install this app on your iOS device, tap the share button{' '}
          <span role="img" aria-label="share icon">⎋</span> and then
          "Add to Home Screen" <span role="img" aria-label="plus icon">➕</span>
        </p>
      )}
    </div>
  )
}
```

---

## Part 4: Server Actions (Push Notifications)

### 4.1 Install Dependencies

```bash
npm install web-push
npm install --save-dev @types/web-push
```

### 4.2 Create Server Actions

Create `app/actions/push-notifications.ts`:

```typescript
'use server'

import webpush from 'web-push'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Configure VAPID details
webpush.setVapidDetails(
  'mailto:your-email@dagawallpapers.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function subscribeUser(sub: PushSubscriptionJSON) {
  const supabase = createServerActionClient({ cookies })
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Save subscription to database
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      is_active: true,
      last_used_at: new Date().toISOString(),
    }, {
      onConflict: 'endpoint' // Update if endpoint already exists
    })

  if (error) {
    console.error('Database error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function unsubscribeUser() {
  const supabase = createServerActionClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Mark all user's subscriptions as inactive
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function sendNotificationToUser(userId: string, payload: {
  title: string
  body: string
  icon?: string
  url?: string
  orderId?: string
}) {
  const supabase = createServerActionClient({ cookies })

  // Get all active subscriptions for user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !subscriptions?.length) {
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
        
        // Update last_used_at
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
          
        return { success: true, subscriptionId: sub.id }
      } catch (error: any) {
        console.error('Send notification failed:', error)
        
        // If subscription expired (410 Gone), mark as inactive
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
        }
        
        return { success: false, subscriptionId: sub.id, error: error.message }
      }
    })
  )

  const successCount = results.filter(r => r.status === 'fulfilled').length
  return { 
    success: successCount > 0, 
    total: subscriptions.length,
    successful: successCount 
  }
}

export async function broadcastToNonAdmins(payload: {
  title: string
  body: string
  icon?: string
  url?: string
  orderId?: string
}) {
  const supabase = createServerActionClient({ cookies })

  // Get all non-admin users with active subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*, users!inner(role)')
    .eq('is_active', true)
    .neq('users.role', 'admin')

  if (error || !subscriptions?.length) {
    return { success: false, error: 'No active subscriptions found' }
  }

  // Send to all non-admin subscriptions
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
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
    )
  )

  const successCount = results.filter(r => r.status === 'fulfilled').length
  return {
    success: successCount > 0,
    total: subscriptions.length,
    successful: successCount,
  }
}
```

---

## Part 5: Real-Time Updates (Supabase Realtime)

### 5.1 Enable Realtime in Supabase

1. Go to **Database → Replication** in Supabase dashboard
2. Find `orders` table
3. Toggle on replication
4. Select events: `INSERT`, `UPDATE`

### 5.2 Create Real-Time Listener Component

Create `app/components/OrderNotificationListener.tsx`:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast' // or your toast library
import { RealtimeChannel } from '@supabase/supabase-js'

export function OrderNotificationListener() {
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    // Subscribe to INSERT events on orders table
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
          const newOrder = payload.new as any
          
          console.log('New order received:', newOrder)

          // Show browser notification (if permission granted)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order Created!', {
              body: `Order #${newOrder.order_number} for ${newOrder.customer_name}`,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: newOrder.id, // Prevents duplicate notifications
              data: {
                orderId: newOrder.id,
                url: `/orders/${newOrder.id}`,
              },
            })
          }

          // Show in-app toast notification
          toast({
            title: 'New Order Received',
            description: `Order #${newOrder.order_number} for ${newOrder.customer_name} needs fulfillment`,
            action: {
              label: 'View Order',
              onClick: () => window.location.href = `/orders/${newOrder.id}`,
            },
          })

          // Optional: Play notification sound
          const audio = new Audio('/notification.mp3')
          audio.play().catch(console.error)
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase, toast])

  return null // This component doesn't render UI
}
```

### 5.3 Add Listener to Layout (Non-Admin Only)

Update `app/(dashboard)/layout.tsx`:

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { OrderNotificationListener } from '@/components/OrderNotificationListener'
import { PushNotificationManager } from '@/components/PushNotificationManager'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single()

  const isAdmin = userData?.role === 'admin'

  return (
    <div>
      {/* Only non-admin users get real-time notifications */}
      {!isAdmin && (
        <>
          <OrderNotificationListener />
          <div className="p-4">
            <PushNotificationManager />
          </div>
        </>
      )}
      {children}
    </div>
  )
}
```

---

## Part 6: Triggering Notifications on Order Creation

### 6.1 Update Order Creation Logic

When admin creates an order, trigger both Realtime (automatic) and Push notifications.

Create `app/actions/orders.ts`:

```typescript
'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { broadcastToNonAdmins } from './push-notifications'
import { revalidatePath } from 'next/cache'

export async function createOrder(orderData: {
  customer_name: string
  order_json: any
  items: Array<{
    design: string
    quantity: number
    lot_number: string
  }>
}) {
  const supabase = createServerActionClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // 1. Insert order into database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: orderData.customer_name,
        order_json: orderData.order_json,
        created_by: user.id,
        status: 'PENDING',
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Insert order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        orderData.items.map((item) => ({
          order_id: order.id,
          design: item.design,
          quantity: item.quantity,
          lot_number: item.lot_number,
          status: 'PENDING',
        }))
      )

    if (itemsError) throw itemsError

    // 3. Send push notifications to all non-admin users
    // (Realtime listeners will automatically get notified via WebSocket)
    await broadcastToNonAdmins({
      title: 'New Order Created',
      body: `Order #${order.order_number} for ${order.customer_name} needs fulfillment`,
      url: `/orders/${order.id}`,
      orderId: order.id,
    })

    // 4. Revalidate orders page cache
    revalidatePath('/orders')

    return { success: true, order }
  } catch (error: any) {
    console.error('Order creation failed:', error)
    return { success: false, error: error.message }
  }
}
```

---

## Part 7: Testing Guide

### 7.1 Local Development Setup

```bash
# Install dependencies
npm install web-push @supabase/auth-helpers-nextjs @supabase/supabase-js

# Start dev server with HTTPS (required for PWA)
npm run dev -- --experimental-https
```

Visit: `https://localhost:3000`

### 7.2 Testing Checklist

**PWA Installation:**
- [ ] Visit app in Chrome/Edge
- [ ] Click install prompt or use browser menu → "Install app"
- [ ] Verify app icon appears on desktop/home screen
- [ ] Open installed app (should open without browser chrome)

**Push Notifications Setup:**
- [ ] Login as non-admin user
- [ ] Click "Enable Notifications" button
- [ ] Accept browser permission prompt
- [ ] Verify subscription saved in `push_subscriptions` table

**Real-Time Notifications (In-App):**
- [ ] Keep app open in one browser tab
- [ ] In another tab (as admin), create new order
- [ ] Verify toast notification appears in first tab
- [ ] Verify browser notification appears (if permission granted)

**Push Notifications (Background):**
- [ ] Close the app completely
- [ ] As admin, create new order
- [ ] Verify system notification appears (Windows/Mac notification center)
- [ ] Click notification → app should open to order detail

**Multi-Device:**
- [ ] Subscribe from desktop Chrome
- [ ] Subscribe from mobile Safari
- [ ] Create order → both devices should receive notification

### 7.3 Debugging Tips

**Service Worker Not Registering:**
```bash
# Check browser console
# Chrome DevTools → Application → Service Workers
# Verify sw.js is listed and "Activated"
```

**Notifications Not Appearing:**
```javascript
// Check permission status in console
console.log(Notification.permission) // Should be "granted"

// Test notification manually
new Notification('Test', { body: 'Testing' })
```

**Realtime Not Working:**
```typescript
// Check subscription status
supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
    (payload) => console.log('Change:', payload)
  )
  .subscribe((status) => console.log('Status:', status))
// Should log: Status: SUBSCRIBED
```

**Push Send Failing:**
```bash
# Check VAPID keys are set
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY

# Test with web-push CLI
web-push send-notification \
  --endpoint="..." \
  --key="..." \
  --auth="..." \
  --payload='{"title":"Test"}'
```

---

## Part 8: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐        ┌─────────────────────┐          │
│  │  Next.js App     │        │  Service Worker     │          │
│  │  (React)         │◄──────►│  (sw.js)            │          │
│  └────────┬─────────┘        └──────────┬──────────┘          │
│           │                              │                      │
│           │ 1. Subscribe                 │ 2. Listen for Push  │
│           │                              │                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐        ┌─────────────────────┐          │
│  │ Server Actions   │        │  Web Push Library   │          │
│  │ - subscribeUser  │───────►│  (web-push)         │          │
│  │ - createOrder    │        └──────────┬──────────┘          │
│  └────────┬─────────┘                   │                      │
│           │                              │ 3. Send Push        │
│           │                              │                      │
│           ▼                              ▼                      │
│  ┌─────────────────────────────────────────────────┐          │
│  │          Supabase PostgreSQL                    │          │
│  │  ┌──────────────┐  ┌────────────────────────┐  │          │
│  │  │   orders     │  │ push_subscriptions     │  │          │
│  │  ├──────────────┤  ├────────────────────────┤  │          │
│  │  │ id           │  │ id                     │  │          │
│  │  │ order_number │  │ user_id                │  │          │
│  │  │ customer_name│  │ endpoint               │  │          │
│  │  │ status       │  │ p256dh                 │  │          │
│  │  │ created_by   │  │ auth                   │  │          │
│  │  └──────────────┘  │ is_active              │  │          │
│  │                    └────────────────────────┘  │          │
│  │                                                 │          │
│  │  4. Realtime WebSocket (postgres_changes)      │          │
│  └─────────────────────────────────────────────────┘          │
│                      │                                         │
└──────────────────────┼─────────────────────────────────────────┘
                       │
                       │ 5. Broadcast INSERT event
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONNECTED CLIENTS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐        ┌─────────────────────┐          │
│  │ OrderNotification│        │  Toast Notification │          │
│  │ Listener         │───────►│  + Browser Alert    │          │
│  │ (React Component)│        │                     │          │
│  └──────────────────┘        └─────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Flow Summary:
1. User clicks "Enable Notifications" → Subscription saved to DB
2. Admin creates order → Inserted into orders table
3. Server sends push notifications via web-push to all non-admin subscriptions
4. Supabase Realtime broadcasts INSERT event to all connected WebSocket clients
5. Both push and realtime trigger notifications on user devices
```

---

## Part 9: Production Deployment

### 9.1 Environment Variables

```env
# .env.local (development)
NEXT_PUBLIC_DOMAIN_URL=https://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```env
# Production (Vercel/Netlify)
NEXT_PUBLIC_DOMAIN_URL=https://yourdomain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 9.2 HTTPS Requirements

- **Required:** HTTPS is mandatory for PWA and Push Notifications
- **Development:** Use `next dev --experimental-https`
- **Production:** Most hosting platforms (Vercel, Netlify) provide automatic HTTPS

### 9.3 Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| PWA | ✅ | ✅ (16.4+) | ✅ | ✅ |
| Push Notifications | ✅ | ✅ (iOS 16.4+) | ✅ | ✅ |
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| Realtime WebSockets | ✅ | ✅ | ✅ | ✅ |

---

## Part 10: Key Differences vs Alternatives

### Why NOT Short/Long Polling?

**Short Polling:**
```typescript
// ❌ BAD: Wastes API requests
setInterval(async () => {
  const { data } = await supabase.from('orders').select('*')
  // Check for new orders every 5 seconds
}, 5000)
// Problem: 17,280 requests per day per user!
```

**Long Polling:**
```typescript
// ❌ BAD: Still needs repeated connections
async function pollForOrders() {
  const { data } = await supabase.from('orders').select('*')
  await pollForOrders() // Repeat
}
// Problem: Expensive, complex, still counts as API request
```

**Supabase Realtime (Recommended):**
```typescript
// ✅ GOOD: Single WebSocket connection
supabase.channel('orders')
  .on('postgres_changes', { event: 'INSERT', ... }, callback)
  .subscribe()
// Benefit: Zero API requests, instant delivery, scales infinitely
```

### Why NOT Server-Sent Events (SSE)?

**SSE Issue:**
```typescript
// SSE requires keeping HTTP connections open 24/7 for all users
const eventSource = new EventSource('/api/orders-stream')
// Problems:
// 1. Server resource intensive (one connection per user)
// 2. Still need to poll database to know when to send events
// 3. Doesn't survive page reloads
// 4. Can't send notifications when app is closed
```

**Realtime + Push (Recommended):**
- Realtime: Handles in-app notifications (WebSocket, low overhead)
- Push: Handles background notifications (OS-level, works when app closed)

---

## Part 11: Cost Analysis

### Supabase Pricing Impact

| Method | API Requests/Day | Supabase Limit | Cost |
|--------|-----------------|----------------|------|
| **Short Polling (5s)** | 17,280 per user | Free tier: 500,000/month | ❌ Exceeds limit with 29 users |
| **Long Polling** | ~8,640 per user | Free tier: 500,000/month | ⚠️ Expensive, scales poorly |
| **Realtime + Push** | 0 (WebSocket) | Unlimited connections | ✅ Free tier sufficient |

**Example:**
- 10 warehouse staff monitoring orders
- 8-hour shifts, checking every 5 seconds
- Short polling: 172,800 requests/day = 5.2M/month ❌
- Realtime: 0 requests ✅

---

## Troubleshooting

### "Service Worker registration failed"
- Ensure you're using HTTPS (or localhost)
- Check `sw.js` is in `public/` folder
- Clear browser cache and reload

### "Push subscription failed"
- Verify VAPID keys are set correctly
- Check browser notification permission (must be "granted")
- Try incognito mode to test fresh state

### "Realtime not receiving events"
- Verify replication is enabled in Supabase dashboard
- Check channel subscription status in console
- Ensure user is authenticated (RLS policies)

### "Notifications not appearing on iOS"
- App must be installed to home screen (iOS 16.4+ requirement)
- Check notification permission in iOS Settings → Safari
- Ensure `display: standalone` in manifest

### "Database query returns null"
- Check RLS (Row Level Security) policies in Supabase
- Verify user authentication token is valid
- Use Supabase dashboard SQL editor to test queries directly

---

## Summary

You've implemented:
1. ✅ **PWA** - Installable web app with manifest + service worker
2. ✅ **Push Notifications** - Background alerts via web-push
3. ✅ **Real-Time Updates** - Instant in-app notifications via Supabase Realtime
4. ✅ **Zero Polling** - No wasted API requests, stays within free tier
5. ✅ **Multi-Device Support** - Each device gets independent subscription

**Key Files Created:**
- `push_subscriptions` table (SQL)
- `app/manifest.ts` (PWA manifest)
- `public/sw.js` (Service worker)
- `app/actions/push-notifications.ts` (Server actions)
- `app/components/PushNotificationManager.tsx` (UI)
- `app/components/OrderNotificationListener.tsx` (Realtime)
- `app/actions/orders.ts` (Order creation with notifications)

**Next Steps:**
1. Test locally with `npm run dev -- --experimental-https`
2. Deploy to production with HTTPS
3. Monitor Supabase dashboard for subscription health
4. Customize notification UI/UX for your brand

---

**Questions or Issues?** Check the Troubleshooting section or Supabase documentation.