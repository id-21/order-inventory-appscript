<system_context>
React components for the order fulfillment and inventory scanning application. Includes authentication UI, stock management components (QR scanning, image capture, order selection), and reusable UI primitives.
</system_context>

<file_map>
## FILE MAP
- `AuthHeader.tsx` - Clerk authentication wrapper with sign-in/sign-up buttons and user profile
- `AdminHeaderLink.tsx` - Conditional admin dashboard link (checks `/api/auth/is-admin`)
- `stock/` - Stock management workflow components for order fulfillment
  - `QRScanner.tsx` - Html5Qrcode wrapper for scanning QR codes with camera selection
  - `ImageCapture.tsx` - Camera/gallery image capture for shipment photos
  - `OrderCardSelector.tsx` - Order selection UI with bottom sheet preview
  - `ScannedItemsTable.tsx` - Aggregated scan results display with totals
  - `DebugScanModal.tsx` - Developer debug modal showing QR validation and type comparisons
- `ui/` - Reusable UI primitives
  - `BottomSheet.tsx` - Mobile-friendly bottom sheet modal with slide-up animation
</file_map>

<patterns>
## PATTERNS

**Client Components Pattern**
All components use `"use client"` directive for interactivity (refs, state, effects).
Example: `QRScanner.tsx`, search:`"use client"`

**Camera Handling Pattern**
Camera components implement retry logic and proper stream cleanup:
- `startCamera()` retries once after 500ms if first attempt fails
- `stopCamera()` releases all media tracks before unmounting
Example: `ImageCapture.tsx:20-42`, `QRScanner.tsx:45-88`

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
</patterns>

<critical_notes>
## CRITICAL NOTES

- **QR Scanner Camera Release** - Always call `stopScanning()` in cleanup (useEffect return) to prevent "device in use" errors. Camera retry logic handles race conditions: `ImageCapture.tsx:33-38`

- **Type Coercion in Validation** - QR codes may have numeric fields but order data uses strings. Always use String() coercion for comparisons. Debug modal shows type mismatches: `DebugScanModal.tsx:27-31`

- **DebugScanModal Shows Session Count** - Modal now accepts `scannedItems` prop and displays real-time scan count for current session alongside database fulfilled_quantity. Helps distinguish between already-fulfilled items vs current session scans: `DebugScanModal.tsx:14`, `DebugScanModal.tsx:273-287`

- **Admin Link Hidden** - `AdminHeaderLink` is conditionally commented out in `AuthHeader.tsx:5,16`. Uncomment when admin dashboard is ready.

- **Mobile-First Design** - All components use large touch targets (py-5, py-6, text-xl, text-2xl) for warehouse/mobile scanning scenarios: `QRScanner.tsx:126`, `OrderCardSelector.tsx:147`

- **Bottom Sheet Fixed Height** - Bottom sheets use fixed 50vh min/max height with internal scroll. Don't exceed this or content may be cut off: `BottomSheet.tsx:40-50`

- **Html5Qrcode Singleton** - QRScanner must stop() and clear() existing instance before creating new one, otherwise "scanner already running" error: `QRScanner.tsx:80-82`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Stock Workflow Component**
1. Create in `stock/` directory with `"use client"` directive
2. Use large text sizes (text-xl, text-2xl) and padding (py-5, py-6) for mobile
3. If showing previews/details, integrate with `BottomSheet` component
4. Handle loading states with spinner (see `OrderCardSelector.tsx:91-96`)
5. Show errors in red-50 bg with red-700 text (see `QRScanner.tsx:135-138`)

**Camera Component Requirements**
1. Implement retry logic for camera access (500ms delay, 1 retry)
2. Clean up streams in useEffect cleanup function
3. Use environment facingMode for back camera: `{ video: { facingMode: "environment" } }`
4. Handle permissions errors gracefully with user-friendly messages

**Integrating with Order Validation**
- Import validation from `@/lib/features/client-scan-validation`
- Always coerce types to strings for comparison: `String(qrData.Design) === String(item.design)`
- Use DebugScanModal during development to verify type matching
</paved_path>