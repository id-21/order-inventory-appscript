<system_context>
Stock workflow components for warehouse order fulfillment. Includes step components for refactored workflow orchestration and reusable primitives for QR scanning, image capture, and data display.
</system_context>

<file_map>
## FILE MAP

**Step Components (Workflow Orchestration):**
- `SelectOrderStep.tsx` - Order selection with OrderCardSelector (35 lines)
- `ScanItemsStep.tsx` - QR scanning with table and debug modal (163 lines)
- `CaptureImageStep.tsx` - Image capture with validation (51 lines)
- `SubmitStep.tsx` - Review and submit with order/scanned items comparison (177 lines)

**Reusable Components:**
- `QRScanner.tsx` - Html5Qrcode wrapper with camera selection and autostart (192 lines)
- `ImageCapture.tsx` - Camera/gallery capture for shipment photos
- `OrderCardSelector.tsx` - Order cards with bottom sheet preview (227 lines)
- `ScannedItemsTable.tsx` - Aggregated items display with totals (91 lines)
- `DebugScanModal.tsx` - Debug modal for QR validation troubleshooting
- `DownloadLogsButton.tsx` - Reusable logs download button (35 lines)
</file_map>

<patterns>
## PATTERNS

**Step Component Pattern**
Each step receives props from orchestrator and calls callbacks:
- Props: State values (selectedOrder, scannedItems, etc.) + callback functions
- Renders: UI for specific workflow step
- Callbacks: onBack, onProceedToNext, onOrderSelect, onSubmit, etc.
- No workflow state management - purely presentational with event handlers
Example: `SelectOrderStep.tsx:20-34`, `CaptureImageStep.tsx:14-50`

**Callback Composition Pattern**
Steps compose reusable components and wire callbacks:
- ScanItemsStep uses QRScanner + ScannedItemsTable + DebugScanModal
- Passes orchestrator handlers to nested components
- Manages local UI state (bottom sheets, modals) but not workflow state
Example: `ScanItemsStep.tsx:49-162`

**Camera Auto-Start Pattern**
QRScanner detects single camera or single back camera and auto-starts:
- Checks device count on mount: `devices.length === 1` or `backCameras.length === 1`
- Sets shouldAutostart flag
- useEffect triggers startScanning when flag is true
- No manual start button shown when autostarts
Example: `QRScanner.tsx:23-67`, `QRScanner.tsx:137-158`

**Props-Controlled Scanner Pattern**
QRScanner watches isScanning prop for external control:
- Orchestrator sets `isScanning` to false before transitioning to image capture
- useEffect detects change and calls stopScanning()
- Prevents "device in use" errors when next step needs camera
Example: `QRScanner.tsx:55-61`

**Html5Qrcode Singleton Management**
Scanner instance lifecycle carefully managed:
- scannerRef stores single instance
- stop() and clear() before creating new instance
- Cleanup in useEffect return on unmount
- Prevents "scanner already running" errors
Example: `QRScanner.tsx:17,77-106,108-122`

**Aggregated Display Pattern**
ScannedItemsTable shows items grouped by design+lot:
- Receives aggregatedItems (already computed by hook)
- Displays quantity badges prominently (green-100/green-700)
- Shows total quantity sum
- Clear All button with confirmation
Example: `ScannedItemsTable.tsx:15-90`

**Bottom Sheet Selection Pattern**
OrderCardSelector uses bottom sheet for preview+confirm:
- Order cards clickable → opens BottomSheet with details
- Bottom sheet shows full item list in packing slip style
- "Start Scanning This Order" button confirms selection + advances workflow
- Calls onOrderSelect + onStartScanning callbacks
Example: `OrderCardSelector.tsx:60-75,186-223`

**Mobile-First Touch Targets**
All components use large sizing for warehouse/mobile use:
- Text: text-xl, text-2xl, text-3xl for headings/buttons
- Padding: py-5, py-6, px-6, px-8 for touch targets
- Buttons: py-4, py-6 for primary actions
Example: `OrderCardSelector.tsx:147-149`, `SubmitStep.tsx:163-166`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Step Components Are Stateless** - SelectOrderStep, ScanItemsStep, CaptureImageStep, SubmitStep manage no workflow state. They receive state via props and call callbacks. Local state limited to UI (modals, bottom sheets): `SelectOrderStep.tsx:20-34`

- **QRScanner Auto-Start Logic** - Auto-starts if exactly 1 camera OR exactly 1 back camera. Prevents showing start/stop buttons in simple camera setups. Check `shouldAutostart` state: `QRScanner.tsx:35-39,64-67,137-158`

- **Camera Release via Props** - QRScanner watches `isScanning` prop. When orchestrator sets to false, useEffect triggers stopScanning(). Critical for camera handoff to ImageCapture: `QRScanner.tsx:56-61`

- **Html5Qrcode Cleanup** - MUST call stop() then clear() before creating new instance. Missing cleanup causes "scanner already running" error: `QRScanner.tsx:108-122`

- **OrderCardSelector Custom Mode** - "Continue without Order" sets selectedOrder to null and calls onStartScanning. Supports custom/non-order workflows: `OrderCardSelector.tsx:82-88`

- **ScannedItemsTable Aggregation** - Expects pre-aggregated items from hook. Does NOT aggregate raw scans. Shows design+lot groups with quantity sums: `ScannedItemsTable.tsx:3-8,15-18`

- **SubmitStep Order Comparison** - Compares aggregatedItems against order_items to show checkmarks (✓/✗). Matches by design+lot with String() coercion: `SubmitStep.tsx:99-107`

- **DownloadLogsButton Reusability** - Used in ScanItemsStep, CaptureImageStep, SubmitStep. Consistent styling with download icon SVG: `DownloadLogsButton.tsx:8-34`

- **DebugScanModal Session Count** - Shows "Scanned this session" vs database fulfilled_quantity. Helps distinguish current session scans from historical data: `ScanItemsStep.tsx:153-160`

- **Bottom Sheet Height** - All bottom sheets use 50vh max height with internal scroll. Content must fit or scroll within this constraint: `OrderCardSelector.tsx:201`
</critical_notes>

<paved_path>
## PAVED PATH

**Creating New Step Component**
1. Create file in this directory: `NewStep.tsx` with "use client"
2. Define props interface with orchestrator state + callbacks
3. Compose existing reusable components (QRScanner, ImageCapture, etc.)
4. Manage only local UI state (modals, bottom sheets)
5. Call callbacks for navigation: onBack, onProceedToNext
6. Use large text/padding: text-xl, py-6, px-8
7. Wire to orchestrator in StockOutClientRefactored
Example: `CaptureImageStep.tsx:6-51`

**Adding New Reusable Component**
1. Create in this directory with "use client"
2. Accept data via props (no API calls)
3. Call callbacks for user actions (onClick, onSelect, etc.)
4. Use mobile-first sizing (text-lg+, py-5+, px-6+)
5. Handle empty states with helpful messages
6. Use consistent color scheme (blue-500 primary, red-500 danger, green-500 success)
Example: `DownloadLogsButton.tsx`, `ScannedItemsTable.tsx`

**Implementing Camera Component**
1. Use refs for Html5Qrcode or MediaStream instances
2. Implement start/stop lifecycle in async functions
3. Add useEffect cleanup to release camera on unmount
4. Watch props for external control (isScanning pattern)
5. Handle permissions errors gracefully
6. Use environment facingMode for back camera by default
Example: `QRScanner.tsx:17-122`

**Integrating Bottom Sheet**
1. Import BottomSheet from `@/app/components/ui/BottomSheet`
2. Add isOpen state for controlling visibility
3. Render bottom sheet with content inside
4. Use onClose callback to close + clear state
5. Keep content scrollable with max-h-56 or similar
Example: `OrderCardSelector.tsx:4,38-39,186-223`

**Debugging Scan Issues**
1. Use DebugScanModal in ScanItemsStep (already integrated)
2. Pass debugData from useScanHandler hook
3. Modal shows raw QR JSON, validation results, type mismatches
4. Shows session scan count vs database fulfilled count
5. Auto-opens on every scan for instant feedback
Example: `ScanItemsStep.tsx:153-160`
</paved_path>
