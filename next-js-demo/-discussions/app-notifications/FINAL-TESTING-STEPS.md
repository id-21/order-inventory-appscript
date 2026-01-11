# ✅ Final Testing Steps

Everything is configured! Now you just need to restart with HTTPS and test.

## 🚀 Step 1: Restart with HTTPS

**Stop your current server** (Ctrl+C), then run:

```bash
npm run dev -- --experimental-https
```

**Visit:** `https://localhost:3000` (note: **HTTPS** and port **3000**)

You'll get a browser warning about the self-signed certificate:
- Click **"Advanced"**
- Click **"Proceed to localhost (unsafe)"** - this is safe for local development

---

## 🧪 Step 2: Complete End-to-End Test

### Setup
1. **Browser Window 1:** Login as **non-admin user**
   - Should see notification cards on home page
   - Click "Enable Notifications" and accept permission

2. **Browser Window 2:** Login as **admin user** (or use a different browser)

### Test Real-Time + Push Notifications

**From Window 1 (Non-admin):**
1. Keep the home page or orders page open
2. Open browser console to see logs

**From Window 2 (Admin):**
1. Go to `/orders/new` (or wherever you create orders)
2. Create a new order with:
   - Customer name: "Test Customer"
   - Add order items (Design, Quantity, Lot)
3. Submit the order

**Expected Results in Window 1:**
- ✅ Browser notification appears within 1-2 seconds
- ✅ Notification title: "New Order Created"
- ✅ Notification body: "Order #X for Test Customer needs fulfillment"
- ✅ Console logs show:
  ```
  [OrderNotificationListener] New order received: {...}
  ```
- ✅ Click notification → navigates to order detail page

---

## 🎯 Step 3: Test Background Notifications

This is the **key PWA feature** - notifications when app is closed!

1. **Close Window 1 completely** (the non-admin browser)
2. Wait 10 seconds
3. **From Window 2** (admin): Create another order
4. **Check your system notification center**:
   - Windows: Click notification icon in taskbar
   - Mac: Top-right notification center
   - Mobile: Pull down notification shade

**Expected:**
- ✅ System notification appears even though browser was closed
- ✅ Clicking notification opens browser to order page

---

## 📊 What You Should See in Console

### Browser Console (Non-admin user)
```
[OrderNotificationListener] Setting up real-time subscription
[OrderNotificationListener] Subscription status: SUBSCRIBED
[PushNotificationManager] Service worker registered
[PushNotificationManager] Push subscription created
[PushNotificationManager] Subscription saved to database

// When order is created:
[OrderNotificationListener] New order received: { new: {...} }
```

### Server Console (Terminal)
```
// When order is created:
[broadcastToNonAdmins] Sending to 1 subscriptions
[broadcastToNonAdmins] Sent 1/1 notifications
```

---

## 🐛 If Notifications Don't Appear

### Check 1: Verify HTTPS
```javascript
console.log(window.location.protocol) // Should be "https:"
```

### Check 2: Check Service Worker Scope
```javascript
navigator.serviceWorker.getRegistration().then(reg =>
  console.log(reg.scope) // Should be "https://localhost:3000/"
)
```

### Check 3: Check Real-time Connection
Look for this in console:
```
[OrderNotificationListener] Subscription status: SUBSCRIBED ✅
```

If it says `CHANNEL_ERROR` or `TIMED_OUT`:
- Verify you ran the SQL migration: [02-enable-realtime-for-orders.sql](02-enable-realtime-for-orders.sql)
- Check Supabase Dashboard → Database → Replication → `orders` table should be toggled ON

### Check 4: Verify Database Subscription
```sql
-- In Supabase SQL Editor
SELECT * FROM push_subscriptions WHERE is_active = true;
```

Should show your subscription with:
- ✅ `endpoint` starting with `https://`
- ✅ `is_active = true`

---

## ✅ Success Criteria

Your PWA is working when:

1. ✅ Using HTTPS (https://localhost:3000)
2. ✅ Service worker registered
3. ✅ Non-admin users can subscribe to notifications
4. ✅ Creating order triggers notification in open browser
5. ✅ Creating order sends push notification to closed browser
6. ✅ Clicking notification navigates to order page
7. ✅ Console shows real-time subscription as SUBSCRIBED

---

## 🎉 What Happens Next

Once this is working locally:

### For Production Deployment
1. **Deploy to Vercel/Netlify** - they provide automatic HTTPS
2. **Update VAPID keys** - generate new production keys
3. **Test on production domain** with real HTTPS
4. **Test on mobile devices** - install PWA to home screen

### Optional Enhancements
1. Add notification sound (see [notification-sound-readme.md](notification-sound-readme.md))
2. Customize notification UI/styling
3. Add notification preferences (let users choose what to be notified about)
4. Add badge counts showing unread notifications

---

## 📝 Need Help?

If you encounter any issues, share:
1. Console logs from browser
2. Server logs from terminal
3. Screenshot of what you see
4. Result of: `console.log(Notification.permission)`

Good luck! 🚀
