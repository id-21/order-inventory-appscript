<system_context>
Server actions for Web Push notification management. Handles push subscription lifecycle (subscribe/unsubscribe) and notification broadcasting to warehouse staff using web-push library with VAPID authentication.
</system_context>

<file_map>
## FILE MAP
- `push-notifications.ts` - Server actions for push notification subscription and broadcast
  - `subscribeUser()` - Save browser push subscription to database
  - `unsubscribeUser()` - Mark user subscriptions as inactive
  - `sendNotificationToUser()` - Send push to specific user's devices
  - `broadcastToNonAdmins()` - Send push to all warehouse staff (non-admin users)
</file_map>

<patterns>
## PATTERNS

**Server Action Pattern**
All functions use 'use server' directive and auth guard:
- Extract userId from Clerk auth()
- Return early with error if not authenticated
- Use Supabase service role client for database operations
Example: `push-notifications.ts:1`, `push-notifications.ts:38-42`

**VAPID Lazy Initialization**
VAPID keys configured lazily to avoid build-time errors:
- ensureVapidDetails() called before sending notifications
- Checks environment variables exist before setting
- Email in mailto format required by Web Push spec
Example: `push-notifications.ts:14-23`

**Upsert Subscription Pattern**
subscribeUser() uses upsert to handle re-subscriptions:
- onConflict: 'endpoint' updates existing subscription
- Same browser re-subscribing updates last_used_at
- Prevents duplicate subscriptions per device
Example: `push-notifications.ts:46-57`

**Multi-Device Broadcast Pattern**
broadcastToNonAdmins() sends to all active subscriptions:
- Queries push_subscriptions joined with users table
- Filters by role !== 'admin' and is_active = true
- Uses Promise.allSettled for parallel sends (handles individual failures)
- Returns success count and total count
Example: `push-notifications.ts:200-239`

**Subscription Expiry Handling**
Send functions detect expired subscriptions (410 Gone):
- Catch webpush errors with statusCode === 410
- Mark subscription as inactive in database
- Prevents future sends to expired endpoints
Example: `push-notifications.ts:163-168`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **VAPID Keys Required** - Must set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local. Generate with: `npx web-push generate-vapid-keys`. Keys authenticate server to browser push services: `push-notifications.ts:16-20`

- **Service Role Required** - Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS when querying all users. Keep this key secret, never expose client-side: `push-notifications.ts:8-11`

- **Soft Delete Pattern** - unsubscribeUser() sets is_active = false instead of deleting. Preserves subscription history and allows re-subscription: `push-notifications.ts:86-93`

- **410 Gone Handling** - Subscriptions expire when user clears browser data or uninstalls PWA. Must detect 410 status and mark inactive to prevent repeated failures: `push-notifications.ts:163-168`

- **Non-Admin Filter** - broadcastToNonAdmins() uses Supabase join to filter users.role !== 'admin'. Ensures admins don't receive notifications for orders they create: `push-notifications.ts:210-213`

- **Promise.allSettled** - Broadcast uses allSettled (not Promise.all) so one failed subscription doesn't abort entire broadcast. Returns partial success: `push-notifications.ts:218-237`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Notification Type**
1. Create new payload interface extending base notification structure
2. Add new server action function (e.g., `notifyStockUpdate()`)
3. Call ensureVapidDetails() before webpush.sendNotification()
4. Query appropriate users from database (filter by role, permissions)
5. Use Promise.allSettled for multi-device sends
6. Return success/failure counts

**Testing Push Notifications Locally**
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to .env.local (both public and private keys)
3. Run app on HTTPS: `npm run dev -- --experimental-https`
4. Subscribe via PushNotificationManager UI
5. Trigger notification (e.g., create order as admin)
6. Check browser DevTools → Application → Service Workers for errors
</paved_path>
