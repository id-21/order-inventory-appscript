<system_context>
React components for the order fulfillment and inventory scanning application. Includes authentication UI, stock management components (QR scanning, image capture, order selection), PWA notification system, and reusable UI primitives.
</system_context>

<file_map>
## FILE MAP
- `AuthHeader.tsx` - Clerk authentication wrapper with sign-in/sign-up buttons and user profile
- `AdminHeaderLink.tsx` - Conditional admin dashboard link (checks `/api/auth/is-admin`)
- **Notification Components** (PWA + Real-Time):
  - `NotificationWrapper.tsx` - Orchestrates notification system, conditionally shown to non-admin users
  - `PushNotificationManager.tsx` - Web Push subscription UI, service worker registration
  - `OrderNotificationListener.tsx` - Supabase Realtime listener for in-app order notifications
  - `InstallPrompt.tsx` - PWA install prompt (beforeinstallprompt event handling)
- `stock/` - Stock management workflow components for order fulfillment
  - Step Components (Refactored Workflow):
    - `SelectOrderStep.tsx` - Order selection step with OrderCardSelector integration
    - `ScanItemsStep.tsx` - QR scanning step with scanned items table and debug modal
    - `CaptureImageStep.tsx` - Image capture step with validation
    - `SubmitStep.tsx` - Final submission step with review and submit
  - Reusable Components:
    - `QRScanner.tsx` - Html5Qrcode wrapper for scanning QR codes with camera selection
    - `ImageCapture.tsx` - Camera/gallery image capture for shipment photos
    - `OrderCardSelector.tsx` - Order selection UI with bottom sheet preview
    - `ScannedItemsTable.tsx` - Aggregated scan results display with totals
    - `DebugScanModal.tsx` - Developer debug modal showing QR validation and type comparisons
    - `DownloadLogsButton.tsx` - Reusable session logs download button
- `ui/` - Reusable UI primitives
  - `BottomSheet.tsx` - Mobile-friendly bottom sheet modal with slide-up animation
</file_map>

<patterns>
## PATTERNS

**Client Components Pattern**
All components use `"use client"` directive for interactivity (refs, state, effects).
Example: `QRScanner.tsx`, search:`"use client"`

**Step Component Pattern**
Each workflow step is a self-contained component:
- Accepts props for state + callbacks from orchestrator
- Handles UI rendering for that specific step
- Composes reusable components (QRScanner, ImageCapture, ScannedItemsTable)
- Returns back to orchestrator via callback props
Example: `stock/SelectOrderStep.tsx`, `stock/ScanItemsStep.tsx`, `stock/CaptureImageStep.tsx`, `stock/SubmitStep.tsx`

**Callback Props Pattern**
Step components receive orchestrator functions as props:
- `onOrderSelect` - Handle order selection
- `onStartScanning` - Advance to scan step
- `onProceedToImage` - Advance to image capture
- `onBack` - Return to previous step
- `onSubmit` - Submit final workflow
Example: `stock/SelectOrderStep.tsx:15-17`, `stock/ScanItemsStep.tsx:40-42`

**Camera Handling Pattern**
Camera components must properly connect MediaStream to video elements using React lifecycle:
- Use `useEffect` to connect stream AFTER video element renders (critical for conditional rendering)
- Implement retry logic: `startCamera()` retries once after 500ms if first attempt fails
- `stopCamera()` releases all media tracks before unmounting
Example: `ImageCapture.tsx:21-25` (useEffect pattern), `ImageCapture.tsx:27-48` (retry logic)

**Bottom Sheet Integration**
Complex selection UIs use BottomSheet for mobile-optimized previews:
- Opens on card click to show details
- Confirms selection + advances workflow
Example: `OrderCardSelector.tsx:60-75`, imports `BottomSheet.tsx:4`

**Base64 Image Pattern**
Images captured via camera/gallery are converted to base64 data URIs:
- Camera: canvas.toDataURL("image/jpeg", 0.8)
- Upload: FileReader.readAsDataURL()
Example: `ImageCapture.tsx:63`, `ImageCapture.tsx:75`

**Aggregated Display Pattern**
Scanned items are aggregated by design+lot before display:
- Reduces (sum) for total quantity
- Shows quantity badges prominently
Example: `ScannedItemsTable.tsx:19`

**Reusable Button Components**
Shared buttons extracted to separate components with consistent styling:
- Accept onClick and optional disabled props
- Use mobile-first sizing (text-lg, py-3, px-6)
- Include appropriate icons/labels
Example: `stock/DownloadLogsButton.tsx:8-34`

**Notification Orchestration Pattern**
NotificationWrapper conditionally renders notification features:
- Early return if user is admin (admins don't receive their own order notifications)
- Renders OrderNotificationListener for real-time WebSocket updates
- Renders InstallPrompt + PushNotificationManager UI for PWA setup
- All notification components are client components ("use client")
Example: `NotificationWrapper.tsx:17-30`

**Service Worker Registration Pattern**
PushNotificationManager handles browser push subscription:
- Registers service worker from public/sw.js on mount
- Requests notification permission before subscription
- Converts VAPID public key from base64 to Uint8Array
- Saves subscription to Supabase via server action
Example: `PushNotificationManager.tsx:287-298`, `PushNotificationManager.tsx:300-328`

**Supabase Realtime Channel Pattern**
OrderNotificationListener subscribes to database changes:
- Creates channel for 'orders' table INSERT events
- Shows browser notification (if permission granted)
- Shows in-app toast notification
- Cleanup removes channel on unmount
Example: `OrderNotificationListener.tsx:696-741`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Step Components Are Composable** - Each step component (SelectOrderStep, ScanItemsStep, CaptureImageStep, SubmitStep) is designed to be composable. Orchestrator passes state + callbacks as props. Components don't manage workflow state - they only render UI and call callbacks: `stock/SelectOrderStep.tsx:20-34`

- **Camera Stream Connection Lifecycle** - CRITICAL: When video elements are conditionally rendered, you MUST use useEffect to connect the MediaStream after the element exists in DOM. Setting `videoRef.current.srcObject` directly in an async function will fail silently if called before `setUseCamera(true)` causes the element to render. See `ImageCapture.tsx:21-25` for the correct pattern.

- **QR Scanner Camera Release** - Always call `stopScanning()` in cleanup (useEffect return) to prevent "device in use" errors. QRScanner component watches `isScanning` prop and automatically stops when it becomes false: `QRScanner.tsx:49-54`

- **Type Coercion in Validation** - QR codes may have numeric fields but order data uses strings. Always use String() coercion for comparisons. Debug modal shows type mismatches: `DebugScanModal.tsx:27-31`

- **DebugScanModal Shows Session Count** - Modal now accepts `scannedItems` prop and displays real-time scan count for current session alongside database fulfilled_quantity. Helps distinguish between already-fulfilled items vs current session scans: `DebugScanModal.tsx:14`, `DebugScanModal.tsx:273-287`

- **DownloadLogsButton Is Reusable** - Used across multiple steps (scan, image, submit). Accepts onClick handler + optional disabled flag. Maintains consistent styling: `stock/DownloadLogsButton.tsx:8-11`

- **Admin Link Hidden** - `AdminHeaderLink` is conditionally commented out in `AuthHeader.tsx:5,16`. Uncomment when admin dashboard is ready.

- **Mobile-First Design** - All components use large touch targets (py-5, py-6, text-xl, text-2xl) for warehouse/mobile scanning scenarios: `QRScanner.tsx:126`, `OrderCardSelector.tsx:147`

- **Bottom Sheet Fixed Height** - Bottom sheets use fixed 50vh min/max height with internal scroll. Don't exceed this or content may be cut off: `BottomSheet.tsx:40-50`

- **Html5Qrcode Singleton** - QRScanner must stop() and clear() existing instance before creating new one, otherwise "scanner already running" error: `QRScanner.tsx:80-82`

- **HTTPS Required for PWA** - Service worker registration and push notifications only work on HTTPS or localhost. Test on deployed site or use `npm run dev -- --experimental-https`: `PushNotificationManager.tsx:289`

- **VAPID Key Conversion** - Public VAPID key must be converted from base64 to Uint8Array before subscription. Helper function urlBase64ToUint8Array handles this: `PushNotificationManager.tsx:263-273`, `PushNotificationManager.tsx:313-314`

- **Notification Permission Timing** - Request permission only when user clicks "Enable Notifications", not on page load. Improves UX and permission grant rate: `PushNotificationManager.tsx:304`

- **Realtime Subscription Cleanup** - MUST call supabase.removeChannel() in useEffect cleanup to prevent memory leaks and duplicate subscriptions: `OrderNotificationListener.tsx:744-747`

- **NotificationWrapper Admin Check** - Wrapper returns null for admin users to prevent them receiving notifications for orders they create. Don't modify this logic without updating home page: `NotificationWrapper.tsx:17-19`
</critical_notes>

<paved_path>
## PAVED PATH

**Creating New Step Component**
1. Create in `stock/` directory with `"use client"` directive
2. Define props interface with state from orchestrator + callbacks
3. Use large text sizes (text-xl, text-2xl) and padding (py-5, py-6) for mobile
4. Compose existing components (QRScanner, ImageCapture, ScannedItemsTable, DownloadLogsButton)
5. Call orchestrator callbacks for navigation (onBack, onProceedToNext)
6. Handle loading states with spinner (see `OrderCardSelector.tsx:91-96`)
7. Show errors in red-50 bg with red-700 text (see `QRScanner.tsx:135-138`)
Example: `stock/SelectOrderStep.tsx`, `stock/CaptureImageStep.tsx`

**Adding New Stock Workflow Component**
1. Create in `stock/` directory with `"use client"` directive
2. Use large text sizes (text-xl, text-2xl) and padding (py-5, py-6) for mobile
3. If showing previews/details, integrate with `BottomSheet` component
4. Handle loading states with spinner (see `OrderCardSelector.tsx:91-96`)
5. Show errors in red-50 bg with red-700 text (see `QRScanner.tsx:135-138`)

**Camera Component Requirements**
1. **CRITICAL**: Use useEffect to connect stream to video element when both exist:
   ```javascript
   useEffect(() => {
     if (useCamera && videoRef.current && stream) {
       videoRef.current.srcObject = stream;
     }
   }, [useCamera, stream]);
   ```
2. Implement retry logic for camera access (500ms delay, 1 retry)
3. Clean up streams in useEffect cleanup function
4. Use environment facingMode for back camera: `{ video: { facingMode: "environment" } }`
5. Handle permissions errors gracefully with user-friendly messages

**Integrating with Order Validation**
- Import validation from `@/lib/features/client-scan-validation`
- Always coerce types to strings for comparison: `String(qrData.Design) === String(item.design)`
- Use DebugScanModal during development to verify type matching
</paved_path>