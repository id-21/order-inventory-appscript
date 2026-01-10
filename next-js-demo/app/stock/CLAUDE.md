<system_context>
Stock management pages for warehouse fulfillment workflow. Refactored into modular hooks and step components. Includes multi-step stock-out process (order selection → QR scanning → image capture → submit) and history view for completed stock movements.
</system_context>

<file_map>
## FILE MAP
- `out/` - Stock-out (fulfillment) workflow
  - `page.tsx` - Server component wrapper with Suspense boundary
  - `StockOutClientRefactored.tsx` - Lightweight orchestrator (262 lines) using hooks + step components
  - `StockOutClient.backup.tsx` - Original monolithic implementation (713 lines) preserved as backup
- `history/` - Stock movement history
  - `page.tsx` - View completed movements grouped by invoice number

See: [../components/stock/](../components/stock/) for step components and scanning UI
See: [../../lib/hooks/](../../lib/hooks/) for session and scan handler hooks
</file_map>

<patterns>
## PATTERNS

**Modular Hooks Architecture**
Stock-out workflow is decomposed into reusable hooks:
- `useStockOutSession()` - Session state, logging, item aggregation
- `useScanHandler()` - QR scanning, validation, audio feedback
Orchestrator imports hooks and passes state to step components
Example: `out/StockOutClientRefactored.tsx:5-6,29-56`

**Step Component Pattern**
Each workflow step is a separate component accepting props:
- `SelectOrderStep` - Order selection UI (35 lines)
- `ScanItemsStep` - QR scanning with scanned items table (163 lines)
- `CaptureImageStep` - Image capture UI (51 lines)
- `SubmitStep` - Final review and submission (177 lines)
Orchestrator conditionally renders based on `currentStep` state
Example: `out/StockOutClientRefactored.tsx:209-257`

**Session Management Hook Pattern**
`useStockOutSession` manages all session state and provides:
- `sessionId` - UUID generated on mount, persists across steps
- `scannedItems` / `scannedItemsRef` - State + ref for validation
- `aggregatedItems` - Auto-computed from scannedItems
- `addLog()` - Timestamped logging to logsRef
- `downloadLogs()` - Export logs as .txt file
- `resetSession()` - Clear items + generate new session ID
Example: `lib/hooks/useStockOutSession.ts:27-130`

**Scan Handler Hook Pattern**
`useScanHandler` encapsulates scan logic and provides:
- `handleScan()` - Parse QR, validate, play sound, update state
- `playSound(success)` - Web Audio API beeps (800Hz success, 400Hz error)
- `isProcessingScanRef` - Synchronous duplicate prevention
- `debugData` - QR data + validation results for debug modal
Example: `lib/hooks/useScanHandler.ts:31-173`

**Ref-Based State Tracking Pattern**
Hooks use refs to prevent race conditions and stale closures:
- `isProcessingScanRef` blocks duplicate scan callbacks immediately
- `scannedItemsRef` provides current items array without stale closure issues
- useEffect keeps refs synced with state changes
Example: `lib/hooks/useScanHandler.ts:44,73-80`, `lib/hooks/useStockOutSession.ts:35,53-55`

**Audio Feedback Pattern**
Web Audio API generates beeps for scan results:
- 800Hz sine wave = success
- 400Hz sine wave = error
- 0.1s duration with exponential gain ramp
Example: `lib/hooks/useScanHandler.ts:46-66`, search:`playSound`

**Session Logging Pattern**
Logs captured in logsRef for debugging and audit:
- All logs timestamped and stored in memory
- `addLog()` helper appends to logsRef + console.log
- `downloadLogs()` exports as .txt file with session summary
- Logs include: scan events, validation results, API calls, performance timing
Example: `lib/hooks/useStockOutSession.ts:33,45-50,75-106`

**Camera Release Before Transition**
Stop scanner before advancing to image capture step by setting `isScanning` to false:
- QRScanner component watches `isScanning` prop and stops automatically when false
- Wait period (1000ms) provides buffer for camera cleanup (can be adjusted if needed)
- Prevents "device in use" errors when ImageCapture tries to access camera
Example: `out/StockOutClientRefactored.tsx:79-99`, search:`handleProceedToImage`

**Batch Submit Pattern**
Submit happens in 2 API calls:
1. `/api/stock/scan-session/batch` - Save all scanned items to DB
2. `/api/stock/scan-session/submit` - Create stock movement record with image
Example: `out/StockOutClientRefactored.tsx:106-181`

**Invoice Grouping Pattern**
History page groups movements by invoice number using reduce:
- Display all items under same invoice together
- Calculate totals per invoice
- Show single image per invoice (from first movement)
Example: `history/page.tsx:72-78`, search:`groupedMovements`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Refactored Architecture** - StockOutClient was refactored from 713-line monolith to ~100-line orchestrator + focused hooks/components. Original preserved as `StockOutClient.backup.tsx`. Refactored version is live: `out/page.tsx:3`

- **Hook Composition** - Orchestrator uses two hooks: `useStockOutSession()` for session management and `useScanHandler()` for scan logic. Hooks expose state and handlers via return values: `out/StockOutClientRefactored.tsx:29-56`

- **Session ID Persistence** - Generated once on mount using uuidv4(), persists across all steps. Reset only when starting new workflow: `lib/hooks/useStockOutSession.ts:38-42,108-117`

- **Camera Transition Pattern** - Set `isScanning` to false before advancing to image capture step. The QRScanner component automatically stops when this prop changes. A wait period helps ensure cleanup completes: `out/StockOutClientRefactored.tsx:87-98`

- **Session Logs Download** - Reusable `DownloadLogsButton` component available on scan/image/submit steps. Logs include session ID, all scan events, validation results, API calls, performance timing. Exports as .txt file: `app/components/stock/DownloadLogsButton.tsx`, `lib/hooks/useStockOutSession.ts:75-106`

- **Duplicate Prevention via Refs** - Uses `isProcessingScanRef` and `scannedItemsRef` to prevent race conditions and stale closures. State updates are async, refs are synchronous - critical for validation against current scanned items: `lib/hooks/useScanHandler.ts:44,73-80`, `lib/hooks/useStockOutSession.ts:35,53-55`

- **Debug Modal Shows Session Count** - Debug modal displays real-time "Scanned this session" count alongside database fulfilled_quantity. Receives `scannedItems` prop from orchestrator. Shows which items are currently being scanned vs already fulfilled: `app/components/stock/ScanItemsStep.tsx:38,153-160`

- **Custom vs Order Mode** - Workflow supports two modes:
  - Order mode: selectedOrder is set, invoice number auto-filled from order
  - Custom mode: selectedOrder is null, user must enter invoice manually
  - Both use same scanning logic: `out/StockOutClientRefactored.tsx:58-67`

- **Type Coercion on Scan** - All QR fields converted to strings when adding to scannedItems to ensure consistency with validation: `lib/hooks/useScanHandler.ts:134-139`

- **Auto-Advance Pattern** - OrderCardSelector has optional `onStartScanning` callback that auto-advances workflow to scan step after order selection: `out/StockOutClientRefactored.tsx:213`, `app/components/stock/SelectOrderStep.tsx:32`

- **History View is Desktop-Friendly** - Unlike scanning pages (mobile-first), history page uses responsive md: breakpoints for desktop viewing: `history/page.tsx:84`, `history/page.tsx:139`

- **Movement Type Colors** - Stock movements have color-coded badges (OUT=red, IN=green, CUSTOM=purple, ADJUSTMENT=yellow): `history/page.tsx:56-69`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Step to Stock-Out Workflow**
1. Create new step component in `app/components/stock/NewStep.tsx` with "use client" directive
2. Add props interface accepting necessary state and callbacks
3. Add new step type to StepType union: `"select_order" | "scan_items" | "new_step" | "capture_image" | "submit"`
4. Add conditional render block in orchestrator: `if (currentStep === "new_step") return <NewStep ... />`
5. Implement handler to advance to new step: `setCurrentStep("new_step")`
6. Add back button handler in step component calling appropriate callback
7. Ensure proper cleanup (camera release, state reset) when navigating away

**Creating Reusable Workflow Hooks**
Follow the hook patterns:
1. Create hook in `lib/hooks/useFeatureName.ts`
2. Use refs for synchronous state tracking (prevent stale closures)
3. Keep refs synced with state using useEffect
4. Return state + handlers via object destructuring
5. Import in orchestrator and pass values to step components as props
Example: `lib/hooks/useStockOutSession.ts`, `lib/hooks/useScanHandler.ts`

**Implementing Real-Time Validation**
The validation is already client-side. Key validation functions imported from `@/lib/features/client-scan-validation`:
- `validateScan(qrData, order, existingScans)` - Main validation logic
- `aggregateScannedItems(scannedItems)` - Groups items by design+lot
- Always use String() coercion when comparing QR data to order data
Example: `lib/hooks/useScanHandler.ts:108-112`

**Adding Audio Feedback to Other Actions**
Copy the `playSound(success: boolean)` pattern from useScanHandler:
- Create AudioContext, Oscillator, GainNode
- Set frequency (high=success, low=error)
- Use exponentialRampToValueAtTime for smooth decay
- Keep duration short (0.1s) for non-intrusive feedback
Example: `lib/hooks/useScanHandler.ts:46-66`

**Debugging Scan Issues**
1. Use "Download Session Logs" button during scan session (available on scan/image/submit steps)
2. Downloaded .txt file contains:
   - Session summary (ID, order, item count, current step)
   - All scan events with timestamps
   - Validation results (pass/fail with errors)
   - Performance timing for each scan
   - API request/response details
3. Debug modal shows real-time details:
   - Raw QR JSON structure
   - Type mismatches (number vs string)
   - Comparison results (strict vs coerced)
   - Current session scan count vs database fulfilled count
4. Check browser console for real-time timestamped logs (same as downloaded file)
5. Common issue: Type mismatches in QR vs order data → solution: String() coercion