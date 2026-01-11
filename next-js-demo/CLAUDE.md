<system_context>
Next.js 15 PWA-enabled order fulfillment and inventory tracking system with real-time notifications. Uses Clerk authentication, Supabase backend, QR scanning workflow for warehouse operations, and Web Push notifications for instant order alerts.
</system_context>

<file_map>
## FILE MAP
- `app/` - Next.js App Router application (pages, components, API routes)
  - See: [app/CLAUDE.md](app/CLAUDE.md) for app architecture and notification system
- `lib/` - Shared utilities and business logic layer
  - `features/` - Supabase operations, validation (orders, stock, storage)
  - `hooks/` - Custom React hooks (useStockOutSession, useScanHandler)
  - See: [lib/features/CLAUDE.md](lib/features/CLAUDE.md), [lib/hooks/CLAUDE.md](lib/hooks/CLAUDE.md)
- `public/` - Static assets and service worker
  - `sw.js` - Service worker for push notifications and offline support
  - `icon-*.png` - PWA icons (192x192, 512x512)
- `manifest.ts` - PWA manifest configuration (installable app metadata)
- `middleware.ts` - Clerk authentication middleware (protects all routes)
- `next.config.ts` - Next.js configuration with PWA security headers
</file_map>

<patterns>
## PATTERNS

**PWA Architecture**
Progressive Web App with installable capabilities:
- Manifest at root exports MetadataRoute.Manifest
- Service worker in public/sw.js handles push events
- Install prompt shown to non-admin users
Example: `manifest.ts:4-44`, `public/sw.js`, `app/components/InstallPrompt.tsx`

**Real-Time Notification System**
Dual notification strategy for warehouse staff:
- Supabase Realtime: In-app WebSocket notifications when app is open
- Web Push: Background OS notifications when app is closed
- NotificationWrapper orchestrates both, shown only to non-admin users
Example: `app/components/NotificationWrapper.tsx`, `app/actions/push-notifications.ts`

**QR Scanning Workflow**
Mobile-first multi-step order fulfillment:
- Client-side validation for instant feedback (no API latency)
- Session-based scanning with batch submission
- Modular hooks architecture (useStockOutSession, useScanHandler)
Example: `app/stock/out/StockOutClientRefactored.tsx`, `lib/hooks/`

**Authentication Flow**
Clerk-based auth with Supabase role management:
- Middleware protects all routes except public assets
- Server components use auth() from @clerk/nextjs/server
- Supabase profiles table stores role (admin vs warehouse staff)
Example: `middleware.ts`, `app/page.tsx:7-14`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **HTTPS Required** - PWA and push notifications only work on HTTPS or localhost. Service worker registration will fail on HTTP: `public/sw.js`

- **VAPID Keys Required** - Push notifications need VAPID keys in .env.local:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Client-side (safe to expose)
  - `VAPID_PRIVATE_KEY` - Server-side (keep secret)
  Generate with: `npx web-push generate-vapid-keys`

- **Notification Permissions** - Browser notification permission is origin-specific and persistent. Test in incognito for fresh state: `app/components/PushNotificationManager.tsx:304`

- **Service Worker Lifecycle** - sw.js must be in public/ folder and served from root path. Changes require manual unregister/re-register: `app/components/PushNotificationManager.tsx:289`

- **Supabase Realtime** - Requires replication enabled in Supabase dashboard (Database → Replication → orders table). Free tier includes unlimited WebSocket connections: `app/components/OrderNotificationListener.tsx:696`

- **Admin vs Non-Admin** - Admin users (order creators) don't receive notifications. Only warehouse staff (non-admin) get order alerts. Role stored in Supabase profiles table: `app/page.tsx:13`, `app/components/NotificationWrapper.tsx:17`

- **iOS PWA Limitations** - iOS 16.4+ required for push notifications. App must be installed to home screen. Test on actual iOS device: `app/components/InstallPrompt.tsx:405`

- **Database Schema** - Requires push_subscriptions table for storing browser push endpoints. See SQL in `-discussions/app-notifications/01-create-push-subscriptions-table.sql`
</critical_notes>

<paved_path>
## PAVED PATH

**Setting Up Development Environment**
1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` (if exists) or create with required keys:
   - Clerk keys (NEXT_PUBLIC_CLERK_*)
   - Supabase keys (NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY)
   - VAPID keys (generate with `npx web-push generate-vapid-keys`)
3. Run dev server: `npm run dev` (HTTPS required for PWA: `npm run dev -- --experimental-https`)
4. Database setup: Run SQL scripts in `-discussions/app-notifications/`

**Adding New Feature Domain**
1. Create parallel directories: `app/{domain}/` + `app/api/{domain}/`
2. Add business logic in `lib/features/supabase-{domain}.ts`
3. Create CLAUDE.md in both directories documenting patterns
4. Update this file's file_map section
5. Add navigation card to home page: `app/page.tsx`

**Testing Push Notifications**
1. Enable Supabase Realtime for orders table (Database → Replication)
2. Run app on HTTPS (localhost or deployed)
3. Login as non-admin user
4. Click "Enable Notifications" and accept browser permission
5. In another tab (as admin), create new order
6. Verify notification appears (in-app toast + browser notification)
7. Close app completely, create another order → system notification should appear

**Deploying to Production**
1. Ensure all environment variables set in hosting platform (Vercel/Netlify)
2. Verify HTTPS is enabled (automatic on most platforms)
3. Test PWA installation on mobile devices
4. Monitor Supabase dashboard for Realtime connection health
5. Check browser console for service worker registration status
</paved_path>
