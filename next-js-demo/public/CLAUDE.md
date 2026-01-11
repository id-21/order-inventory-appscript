<system_context>
Static assets and service worker for PWA. Contains app icons for installation and service worker handling push notifications, notification clicks, and background sync.
</system_context>

<file_map>
## FILE MAP
- `sw.js` - Service worker for push notifications and offline capabilities
- `icon-192x192.png` - PWA icon (192x192, required for install prompt)
- `icon-512x512.png` - PWA icon (512x512, required for splash screen)
- `icon.svg` - Base SVG icon (source for generating PNG icons)
</file_map>

<patterns>
## PATTERNS

**Push Event Handling**
Service worker listens for push events from server:
- Parses JSON payload from event.data
- Creates notification with title, body, icon, actions
- Uses tag to prevent duplicate notifications
- Stores metadata (url, orderId) in notification.data
Example: `sw.js:8-40`

**Notification Click Pattern**
Click handler focuses existing window or opens new one:
1. Check if app window already open with target URL → focus it
2. Check if any app window open → navigate it to URL
3. Otherwise open new window with target URL
- Prevents opening multiple tabs for same notification
Example: `sw.js:43-86`

**Immediate Activation Pattern**
Service worker activates immediately on install:
- install event calls self.skipWaiting()
- activate event calls clients.claim()
- Ensures new service worker takes control without waiting
Example: `sw.js:89-100`

**Version-Based Updates**
VERSION constant forces service worker update:
- Increment VERSION to push new service worker to clients
- Browser detects byte-change in sw.js and updates
Example: `sw.js:5`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Must be in public/** - Service worker MUST be at root path (/sw.js) to control entire app scope. Cannot be in subdirectory: `sw.js`

- **No Cache Headers** - next.config.ts sets no-cache headers for sw.js to ensure updates propagate immediately. Don't add caching: `next.config.ts:34-36`

- **Notification Tag Deduplication** - tag field prevents multiple notifications for same event. Use orderId as tag for order notifications: `sw.js:20`

- **Icon Sizes Required** - 192x192 and 512x512 icons required by PWA spec. 192 for home screen, 512 for splash screen: `icon-192x192.png`, `icon-512x512.png`

- **Client Navigation** - Service worker can navigate existing tabs using client.navigate() to avoid opening duplicate windows: `sw.js:72`

- **Background Sync Placeholder** - sync event listener exists but syncOrders() is unimplemented. Implement for offline order submission: `sw.js:103-116`

- **HTTPS Required** - Service worker only registers on HTTPS or localhost. Will fail silently on HTTP: all files
</critical_notes>

<paved_path>
## PAVED PATH

**Updating Service Worker**
1. Make changes to sw.js
2. Increment VERSION constant (e.g., '1.0.0' → '1.0.1')
3. Deploy or reload local dev server
4. Browser detects change and updates service worker
5. Test in DevTools → Application → Service Workers

**Generating PWA Icons**
1. Create/update icon.svg with app logo
2. Use online tool (e.g., RealFaviconGenerator.net)
3. Upload SVG and generate 192x192 and 512x512 PNGs
4. Replace existing icon-*.png files in public/
5. Verify manifest.ts references correct icon paths

**Adding Custom Notification Actions**
1. Add actions to options.actions array in push event
2. Handle new action in notificationclick event
3. Example: `{ action: 'view-details', title: 'View Details' }`
4. Check event.action in click handler
5. Navigate to appropriate URL based on action

**Implementing Background Sync**
1. Implement syncOrders() function in sw.js
2. Store pending operations in IndexedDB during offline
3. Trigger sync when connection restored
4. Send stored data to API
5. Clear IndexedDB after successful sync
</paved_path>
