<system_context>
Stock management pages for warehouse fulfillment workflow. Includes multi-step stock-out process (order selection → QR scanning → image capture → submit) and history view for completed stock movements.
</system_context>

<file_map>
## FILE MAP
- `out/` - Stock-out (fulfillment) workflow
  - `page.tsx` - Server component wrapper with Suspense boundary
  - `StockOutClient.tsx` - Multi-step client workflow orchestrator (select order → scan → image → submit)
- `history/` - Stock movement history
  - `page.tsx` - View completed movements grouped by invoice number

See: [../components/stock/](../components/stock/) for reusable scanning components
</file_map>

<patterns>
## PATTERNS

**Multi-Step Workflow Pattern**
StockOutClient uses state machine with 4 steps: "select_order" | "scan_items" | "capture_image" | "submit"
- Each step conditionally renders different UI
- Steps advance linearly but allow back navigation
- Session ID (uuid) generated on mount, persists across steps
Example: `out/StockOutClient.tsx:36-43`, search:`type StepType`

**Client-Side Validation Pattern**
QR validation happens locally (no API call) using imported validation library:
- Parse JSON from QR code
- Validate against selected order + existing scans (uses ref for current state)
- Instant feedback with success/error sounds
Example: `out/StockOutClient.tsx:141-154`, search:`handleScan`

**Ref-Based State Tracking Pattern**
Refs maintain synchronous copies of async state to prevent race conditions:
- `isProcessingScanRef` blocks duplicate scan callbacks immediately
- `scannedItemsRef` provides current items array without stale closure issues
- useEffect keeps refs synced with state changes
Example: `out/StockOutClient.tsx:64-76`, `out/StockOutClient.tsx:107-115`

**Audio Feedback Pattern**
Web Audio API generates beeps for scan results:
- 800Hz sine wave = success
- 400Hz sine wave = error
- 0.1s duration with exponential gain ramp
Example: `out/StockOutClient.tsx:215-234`, search:`playSound`

**Session Logging Pattern**
StockOutClient captures detailed logs in memory for debugging and audit:
- All logs stored in logsRef (persists across steps, resets on new session)
- addLog() helper timestamps and stores each entry
- Download button exports logs as .txt file with session summary
- Logs include: scan events, validation results, API calls, performance timing
Example: `out/StockOutClient.tsx:78-83`, `out/StockOutClient.tsx:246-277`

**Camera Release Before Transition**
Stop scanner and wait 500ms before advancing to image capture step:
- Prevents "device in use" errors when ImageCapture tries to access camera
- Ensures proper MediaStream cleanup
Example: `out/StockOutClient.tsx:282-299`, search:`handleProceedToImage`

**Batch Submit Pattern**
Submit happens in 2 API calls:
1. `/api/stock/scan-session/batch` - Save all scanned items to DB
2. `/api/stock/scan-session/submit` - Create stock movement record with image
Example: `out/StockOutClient.tsx:306-381`

**Invoice Grouping Pattern**
History page groups movements by invoice number using reduce:
- Display all items under same invoice together
- Calculate totals per invoice
- Show single image per invoice (from first movement)
Example: `history/page.tsx:71-78`, search:`groupedMovements`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Session ID Persistence** - Generated once on mount using uuidv4(), persists across all steps. Reset only when starting new workflow: `out/StockOutClient.tsx:70-75`, `out/StockOutClient.tsx:383-394`

- **Camera Timing Critical** - MUST wait 500ms after stopping scanner before advancing to image capture. Failure causes "NotReadableError: device in use": `out/StockOutClient.tsx:296`

- **Session Logs Download** - "Download Session Logs" button available on scan/image/submit steps. Logs include session ID, all scan events, validation results, API calls, performance timing. Exports as .txt file for debugging scan issues: `out/StockOutClient.tsx:246-277`, `out/StockOutClient.tsx:440-448`

- **Duplicate Prevention via Refs** - Uses `isProcessingScanRef` and `scannedItemsRef` to prevent race conditions and stale closures. State updates are async, refs are synchronous - critical for validation against current scanned items: `out/StockOutClient.tsx:64-68`, `out/StockOutClient.tsx:160-164`

- **Debug Modal Shows Session Count** - Debug modal displays real-time "Scanned this session" count alongside database fulfilled_quantity. Enabled by default (auto-opens on every scan). Shows which items are currently being scanned vs already fulfilled: `out/StockOutClient.tsx:168-171`

- **Custom vs Order Mode** - Workflow supports two modes:
  - Order mode: selectedOrder is set, invoice number auto-filled from order
  - Custom mode: selectedOrder is null, user must enter invoice manually
  - Both use same scanning logic: `out/StockOutClient.tsx:97-106`

- **Type Coercion on Scan** - All QR fields converted to strings when adding to scannedItems to ensure consistency with validation: `out/StockOutClient.tsx:185-190`

- **Auto-Advance Pattern** - OrderCardSelector has optional `onStartScanning` callback that auto-advances workflow to scan step after order selection: `out/StockOutClient.tsx:397`, `out/page.tsx` integration

- **History View is Desktop-Friendly** - Unlike scanning pages (mobile-first), history page uses responsive md: breakpoints for desktop viewing: `history/page.tsx:84`, `history/page.tsx:139`

- **Movement Type Colors** - Stock movements have color-coded badges (OUT=red, IN=green, CUSTOM=purple, ADJUSTMENT=yellow): `history/page.tsx:56-69`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Step to Stock-Out Workflow**
1. Add new step type to StepType union: `"select_order" | "scan_items" | "new_step" | "capture_image" | "submit"`
2. Add conditional render block at bottom of StockOutClient render
3. Implement handler function to set `setCurrentStep("new_step")`
4. Add back button to navigate to previous step
5. Ensure proper cleanup (camera release, state reset) when navigating away

**Implementing Real-Time Validation**
The validation is already client-side. Key validation functions imported from `@/lib/features/client-scan-validation`:
- `validateScan(qrData, order, existingScans)` - Main validation logic
- `aggregateScannedItems(scannedItems)` - Groups items by design+lot
- Always use String() coercion when comparing QR data to order data

**Adding Audio Feedback to Other Actions**
Copy the `playSound(success: boolean)` pattern:
- Create AudioContext, Oscillator, GainNode
- Set frequency (high=success, low=error)
- Use exponentialRampToValueAtTime for smooth decay
- Keep duration short (0.1s) for non-intrusive feedback

**Debugging Scan Issues**
1. Use "Download Session Logs" button during scan session (available on scan/image/submit steps)
2. Downloaded .txt file contains:
   - Session summary (ID, order, item count, current step)
   - All scan events with timestamps
   - Validation results (pass/fail with errors)
   - Performance timing for each scan
   - API request/response details
3. Debug modal auto-opens on every scan with real-time details:
   - Raw QR JSON structure
   - Type mismatches (number vs string)
   - Comparison results (strict vs coerced)
   - Current session scan count vs database fulfilled count
4. Check browser console for real-time timestamped logs (same as downloaded file)
5. Common issue: Type mismatches in QR vs order data → solution: String() coercion
</paved_path>