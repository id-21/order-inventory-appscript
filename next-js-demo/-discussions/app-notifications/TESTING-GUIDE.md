# PWA Testing Guide

## ✅ Pre-Testing Checklist

### 1. Install Dependencies
```bash
cd next-js-demo
npm install web-push @types/web-push
```

### 2. Run SQL Migrations in Supabase
Go to **Supabase Dashboard → SQL Editor** and run:

1. ✅ [01-create-push-subscriptions-table.sql](01-create-push-subscriptions-table.sql)
2. ✅ [02-enable-realtime-for-orders.sql](02-enable-realtime-for-orders.sql)

Verify tables exist:
```sql
SELECT * FROM push_subscriptions LIMIT 1;
```

### 3. Environment Variables
Verify in `.env.local`:
```
✅ NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-key>
✅ VAPID_PRIVATE_KEY=<your-key>
✅ NEXT_PUBLIC_SUPABASE_URL=<your-url>
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
✅ SUPABASE_SERVICE_ROLE_KEY=<your-key>
```

### 4. Start Dev Server with HTTPS
```bash
npm run dev -- --experimental-https
```

**Important:** HTTPS is required for PWA and Push Notifications!

---

## 🧪 Testing Scenarios

### Test 1: PWA Installation

#### Desktop (Chrome/Edge)
1. Visit `https://localhost:3000`
2. Accept the SSL certificate warning (localhost)
3. Login as a **non-admin user**
4. Look for install prompt on home page
5. Click "Add to Home Screen"
6. Verify app icon appears on desktop/taskbar
7. Open app from desktop - should open without browser UI

#### Mobile (iOS Safari 16.4+)
1. Visit site on iPhone/iPad
2. Login as **non-admin user**
3. Tap Share button (⎋)
4. Scroll down → "Add to Home Screen" (➕)
5. Tap "Add"
6. Verify app appears on home screen
7. Open from home screen - should run in standalone mode

#### Mobile (Android Chrome)
1. Visit site on Android
2. Login as **non-admin user**
3. Tap browser menu → "Install app" or "Add to Home Screen"
4. Confirm installation
5. App appears in app drawer

---

### Test 2: Push Notification Subscription

#### Subscribe to Notifications
1. Login as **non-admin user**
2. On home page, find "🔔 Push Notifications" card
3. Click "Enable Notifications"
4. Accept browser permission prompt
5. Verify success message: "✓ You will receive notifications for new orders"

#### Verify in Database
```sql
SELECT * FROM push_subscriptions WHERE user_id = '<your-clerk-user-id>';
```

Should show:
- ✅ `endpoint` (unique browser URL)
- ✅ `p256dh` (encryption key)
- ✅ `auth` (auth secret)
- ✅ `is_active = true`

---

### Test 3: Real-Time In-App Notifications

**Setup:**
- Browser Tab 1: Non-admin user logged in, app open
- Browser Tab 2: Admin user ready to create order

**Steps:**
1. Tab 1 (Non-admin): Keep home page or orders page open
2. Tab 2 (Admin): Create a new order
3. Tab 1: Should see browser notification appear instantly
4. Notification should say: "New Order Created! Order #X for [Customer Name] needs fulfillment"
5. Click notification → should navigate to order detail page

**Expected Behavior:**
- ✅ Notification appears within 1-2 seconds
- ✅ Notification shows order number and customer name
- ✅ Clicking notification opens order page
- ✅ Optional: Notification sound plays (if added)

**Troubleshooting:**
- Open browser console, should see:
  ```
  [OrderNotificationListener] New order received: {...}
  ```
- Check notification permission: `console.log(Notification.permission)` → should be "granted"

---

### Test 4: Push Notifications (Background)

**This is the key PWA feature - notifications when app is CLOSED**

**Setup:**
- Login as non-admin user
- Enable notifications (Test 2)
- **Close the browser completely** (or close PWA if installed)

**Steps:**
1. Wait 10 seconds for browser to fully close
2. From another device or browser, login as admin
3. Create a new order
4. Check your **system notification center** (Windows/Mac/Mobile)

**Expected Behavior:**
- ✅ System notification appears even though browser is closed
- ✅ Notification shows in notification center
- ✅ Clicking notification opens browser/PWA to order page

**Note:** This requires:
- Service worker to be active (automatic)
- Browser process running in background (automatic on desktop)
- iOS: App must be installed to home screen for background notifications

---

### Test 5: Multi-Device Support

**Test that one user can receive notifications on multiple devices**

1. Login as non-admin on Desktop Chrome
2. Enable notifications
3. Login as same user on Mobile Safari
4. Enable notifications
5. Check database:
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = '<user-id>';
   ```
   Should show 2 rows (one per device)

6. Create order as admin
7. **Both devices** should receive notification

---

### Test 6: Admin Users Don't Get Notifications

1. Login as **admin user**
2. Home page should **NOT** show:
   - ❌ Install prompt
   - ❌ Push notification manager
3. Create order as admin
4. Admin should **NOT** receive notification (only non-admins get them)

---

## 🐛 Troubleshooting

### Service Worker Not Registering
**Symptoms:** No notifications, console errors

**Check:**
```javascript
navigator.serviceWorker.getRegistration().then(reg => console.log(reg))
```

**Solutions:**
- Ensure using HTTPS (or localhost)
- Check `public/sw.js` exists
- Clear browser cache: DevTools → Application → Clear Storage
- Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

### Notifications Not Appearing
**Symptoms:** Subscription works but no notifications show

**Check Permission:**
```javascript
console.log(Notification.permission) // Should be "granted"
```

**Check Browser Settings:**
- Chrome: `chrome://settings/content/notifications`
- Safari: System Preferences → Notifications
- Make sure localhost/your domain is allowed

**Test Manual Notification:**
```javascript
new Notification('Test', { body: 'Testing notifications' })
```

---

### Realtime Not Working
**Symptoms:** No in-app notifications when order created

**Check Subscription Status:**
Open console, should see:
```
[OrderNotificationListener] Subscription status: SUBSCRIBED
```

**Verify Realtime Enabled:**
Supabase Dashboard → Database → Replication → Find `orders` table → Should be toggled ON

**Check RLS Policies:**
Users must have SELECT permission on orders table:
```sql
-- Test query as user
SELECT * FROM orders LIMIT 1;
```

---

### Push Send Failing (410 Gone Error)
**Symptoms:** Subscription exists but push fails

**Cause:** Browser subscription expired

**Solution:**
- System automatically marks subscription as inactive
- User needs to re-subscribe (click "Enable Notifications" again)

---

### iOS Not Receiving Background Notifications
**Requirements for iOS:**
- ✅ iOS 16.4 or later
- ✅ App must be installed to home screen (not just browser)
- ✅ App must be in "standalone" display mode
- ✅ Notifications enabled in iOS Settings → Safari → Notifications

---

## 📊 Monitoring

### Check Active Subscriptions
```sql
SELECT
  user_id,
  COUNT(*) as device_count,
  MAX(last_used_at) as last_notification
FROM push_subscriptions
WHERE is_active = true
GROUP BY user_id;
```

### Check Recent Notifications
Monitor server logs for:
```
[broadcastToNonAdmins] Sent X/Y notifications
[sendNotificationToUser] Sent to subscription: <id>
```

### Cleanup Expired Subscriptions
```sql
-- Find inactive subscriptions
SELECT * FROM push_subscriptions WHERE is_active = false;

-- Optional: Delete old inactive subscriptions
DELETE FROM push_subscriptions
WHERE is_active = false
AND last_used_at < NOW() - INTERVAL '30 days';
```

---

## 🎯 Success Criteria

Your PWA is working correctly if:

1. ✅ App can be installed to home screen
2. ✅ Non-admin users see notification UI
3. ✅ Users can subscribe/unsubscribe
4. ✅ Subscriptions saved to database
5. ✅ In-app notifications appear instantly when order created
6. ✅ Background notifications work when app is closed
7. ✅ Notifications navigate to correct order page
8. ✅ Admin users don't see notification features
9. ✅ Multi-device support works
10. ✅ Service worker registers without errors

---

## 📝 Next Steps After Testing

1. **Add notification sound** (optional)
   - See [notification-sound-readme.md](notification-sound-readme.md)

2. **Generate production VAPID keys**
   - Current keys are for development only
   - Generate new keys for production deployment

3. **Test on production HTTPS domain**
   - PWA features require HTTPS in production
   - Vercel/Netlify provide automatic HTTPS

4. **Monitor notification delivery rates**
   - Track how many subscriptions are active
   - Monitor for 410 errors (expired subscriptions)

5. **Add order creation logic**
   - Update your order creation code to call `broadcastToNonAdmins()`
   - See next step for implementation

---

## 🚀 Ready to Integrate?

Once testing is successful, you need to update your order creation logic to send notifications.

Let me know when you're ready and I'll help you integrate the notification trigger into your existing order creation code!
