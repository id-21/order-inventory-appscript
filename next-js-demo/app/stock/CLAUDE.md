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
- Validate against selected order + existing scans
- Instant feedback with success/error sounds
Example: `out/StockOutClient.tsx:99-152`, search:`handleScan`

**Audio Feedback Pattern**
Web Audio API generates beeps for scan results:
- 800Hz sine wave = success
- 400Hz sine wave = error
- 0.1s duration with exponential gain ramp
Example: `out/StockOutClient.tsx:154-174`, search:`playSound`

**Camera Release Before Transition**
Stop scanner and wait 500ms before advancing to image capture step:
- Prevents "device in use" errors when ImageCapture tries to access camera
- Ensures proper MediaStream cleanup
Example: `out/StockOutClient.tsx:190-197`, search:`handleProceedToImage`

**Batch Submit Pattern**
Submit happens in 2 API calls:
1. `/api/stock/scan-session/batch` - Save all scanned items to DB
2. `/api/stock/scan-session/submit` - Create stock movement record with image
Example: `out/StockOutClient.tsx:221-254`

**Invoice Grouping Pattern**
History page groups movements by invoice number using reduce:
- Display all items under same invoice together
- Calculate totals per invoice
- Show single image per invoice (from first movement)
Example: `history/page.tsx:71-78`, search:`groupedMovements`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Session ID Persistence** - Generated once on mount using uuidv4(), persists across all steps. Reset only when starting new workflow: `out/StockOutClient.tsx:64`, `out/StockOutClient.tsx:279`

- **Camera Timing Critical** - MUST wait 500ms after stopping scanner before advancing to image capture. Failure causes "NotReadableError: device in use": `out/StockOutClient.tsx:196`

- **Debug Modal Commented Out** - Debug scan modal auto-open is commented out (lines 120-128). Uncomment `setDebugModalOpen(true)` to see validation details for every scan during development: `out/StockOutClient.tsx:121-128`

- **Custom vs Order Mode** - Workflow supports two modes:
  - Order mode: selectedOrder is set, invoice number auto-filled from order
  - Custom mode: selectedOrder is null, user must enter invoice manually
  - Both use same scanning logic: `out/StockOutClient.tsx:74-81`

- **Type Coercion on Scan** - All QR fields converted to strings when adding to scannedItems to ensure consistency with validation: `out/StockOutClient.tsx:137-142`

- **Auto-Advance Pattern** - OrderCardSelector has optional `onStartScanning` callback that auto-advances workflow to scan step after order selection: `out/StockOutClient.tsx:308`, `out/page.tsx:89`

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
1. Uncomment debug modal auto-open: `out/StockOutClient.tsx:121-128`
2. Check DebugScanModal for:
   - Raw QR JSON structure
   - Type mismatches (number vs string)
   - Comparison results (strict vs coerced)
   - All order items for context
3. Common issue: SKU in QR is number, order JSON has string → solution: String() coercion
</paved_path>