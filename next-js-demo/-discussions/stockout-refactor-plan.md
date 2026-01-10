# Implementation Plan: StockOutClient Refactoring

**Planning Date:** 2026-01-10
**Target:** Refactor StockOutClient.tsx (713 lines) into composable hooks and components without modifying the working original file

---

## Required Reading

**CLAUDE.md Files:**
- `app/stock/CLAUDE.md` - Section: Multi-Step Workflow Pattern, Ref-Based State Tracking Pattern, Session Logging Pattern
- `app/components/CLAUDE.md` - Section: Client Components Pattern, Camera Handling Pattern
- `lib/features/CLAUDE.md` - Section: Client-Side Validation Pattern, String Coercion Pattern

**Reference Implementations:**
- `app/stock/out/StockOutClient.tsx:70-83` - Session logging pattern with logsRef
- `app/stock/out/StockOutClient.tsx:125-216` - Scan handler with ref-based duplicate prevention
- `app/stock/out/StockOutClient.tsx:218-238` - Audio feedback pattern with Web Audio API
- `app/stock/out/StockOutClient.tsx:249-280` - Download logs implementation
- `app/components/stock/QRScanner.tsx` - Camera management and cleanup pattern
- `app/components/stock/ImageCapture.tsx:21-48` - Camera stream connection with retry logic

**Dependencies:**
- `@/lib/features/client-scan-validation` - Functions: `validateScan()`, `aggregateScannedItems()`, Types: `QRCodeData`, `ScannedItem`, `Order`
- `html5-qrcode` - Class: `Html5Qrcode` with `.pause()`, `.resume()` methods
- `uuid` - Function: `v4()` for session ID generation
- `next/navigation` - Functions: `useRouter()`, `useSearchParams()`

---

## Files to Create/Modify

### New: `lib/hooks/useStockOutSession.ts`
**Purpose:** Manage session state, scanned items, and logging functionality
**Pattern source:** `app/stock/out/StockOutClient.tsx:44-88`
**Functions to implement:**
- `useStockOutSession() -> { sessionId, scannedItems, aggregatedItems, logs, addLog, addScannedItem, clearSession, downloadLogs, resetSession }`

### New: `lib/hooks/useScanHandler.ts`
**Purpose:** Handle QR code scanning, validation, and audio feedback
**Pattern source:** `app/stock/out/StockOutClient.tsx:125-238`
**Functions to implement:**
- `useScanHandler(selectedOrder, scannedItemsRef, addLog, addScannedItem) -> { handleScan, scanError, setScanError, playSound }`

### New: `app/components/stock/SelectOrderStep.tsx`
**Purpose:** Order selection step UI
**Pattern source:** `app/stock/out/StockOutClient.tsx:418-428`
**Props:** `{ onOrderSelect, selectedOrderId, onStartScanning }`

### New: `app/components/stock/ScanItemsStep.tsx`
**Purpose:** QR scanning step with order details and scanned items table
**Pattern source:** `app/stock/out/StockOutClient.tsx:431-537`
**Props:** `{ selectedOrder, isScanning, setIsScanning, handleScan, scanError, aggregatedItems, onClear, onDownloadLogs, onProceedToImage, onBack, scannedItems }`

### New: `app/components/stock/CaptureImageStep.tsx`
**Purpose:** Image capture step UI
**Pattern source:** `app/stock/out/StockOutClient.tsx:541-577`
**Props:** `{ capturedImage, setCapturedImage, onDownloadLogs, onProceedToSubmit, onBack }`

### New: `app/components/stock/SubmitStep.tsx`
**Purpose:** Final submission step with review and submit
**Pattern source:** `app/stock/out/StockOutClient.tsx:581-706`
**Props:** `{ selectedOrder, invoiceNumber, setInvoiceNumber, aggregatedItems, capturedImage, onClear, onDownloadLogs, onSubmit, onBack, loading }`

### New: `app/components/stock/DownloadLogsButton.tsx`
**Purpose:** Reusable download logs button component
**Pattern source:** `app/stock/out/StockOutClient.tsx:462-470`
**Props:** `{ onClick, disabled? }`

### New: `app/stock/out/StockOutClientRefactored.tsx`
**Purpose:** Orchestrator using extracted hooks and step components
**Pattern source:** `app/stock/out/StockOutClient.tsx` (overall structure)
**Functions to implement:**
- Main component orchestrating workflow steps using hooks

---

## Implementation Steps

### Step 1: Create Session Management Hook
**Files:** `lib/hooks/useStockOutSession.ts`
**Actions:**
1. Create hook with state for sessionId, scannedItems, aggregatedItems
2. Implement sessionId generation with uuidv4 on mount (pattern: `StockOutClient.tsx:70-75`)
3. Implement logsRef and addLog helper (pattern: `StockOutClient.tsx:68,78-83`)
4. Implement scannedItemsRef sync with useEffect (pattern: `StockOutClient.tsx:86-88`)
5. Implement aggregatedItems calculation with useEffect (pattern: `StockOutClient.tsx:109-112`)
6. Implement clearSession, downloadLogs, resetSession functions (patterns: `StockOutClient.tsx:240-247,249-280,386-397`)
7. Test: Import in test file, verify sessionId is uuid, addLog appends to logs, downloadLogs creates file

**Success criteria:** Hook returns all session state and handlers, logs download as .txt file with session summary

### Step 2: Create Scan Handler Hook
**Files:** `lib/hooks/useScanHandler.ts`
**Actions:**
1. Create hook accepting selectedOrder, scannedItemsRef, addLog, addScannedItem callbacks
2. Implement isProcessingScanRef for duplicate prevention (pattern: `StockOutClient.tsx:64,130-137`)
3. Implement handleScan with QR parsing, validation, and state updates (pattern: `StockOutClient.tsx:125-216`)
4. Implement playSound helper using Web Audio API (pattern: `StockOutClient.tsx:218-238`)
5. Add scanError state and setScanError setter
6. Test: Mock Html5Qrcode scanner, verify duplicate scans blocked, valid scans add items, invalid scans set error

**Success criteria:** Hook handles scans with proper validation, plays sounds, prevents duplicates via ref

### Step 3: Create Reusable Download Logs Button
**Files:** `app/components/stock/DownloadLogsButton.tsx`
**Actions:**
1. Create client component with "use client" directive
2. Extract SVG icon and button styling from pattern (pattern: `StockOutClient.tsx:462-470`)
3. Accept onClick and optional disabled props
4. Use mobile-first sizing (text-lg, py-3, px-6)
5. Test: Render in isolation, verify onClick fires, disabled state works

**Success criteria:** Button renders with consistent styling, accepts onClick handler

### Step 4: Create Step Components
**Files:** `app/components/stock/SelectOrderStep.tsx`, `ScanItemsStep.tsx`, `CaptureImageStep.tsx`, `SubmitStep.tsx`
**Actions:**
1. Create SelectOrderStep with OrderCardSelector integration (pattern: `StockOutClient.tsx:418-428`)
2. Create ScanItemsStep with QRScanner, ScannedItemsTable, BottomSheet, DebugScanModal (pattern: `StockOutClient.tsx:431-537`)
3. Create CaptureImageStep with ImageCapture component (pattern: `StockOutClient.tsx:541-577`)
4. Create SubmitStep with invoice input, order items table, scanned items table, image preview (pattern: `StockOutClient.tsx:581-706`)
5. All components use "use client" directive
6. All components use DownloadLogsButton where needed
7. Test: Render each step in isolation with mock props, verify UI matches original

**Success criteria:** Each step component renders independently, accepts props, matches original UI

### Step 5: Create Refactored Orchestrator
**Files:** `app/stock/out/StockOutClientRefactored.tsx`
**Actions:**
1. Create client component with "use client" directive
2. Import and use useStockOutSession hook
3. Import and use useScanHandler hook
4. Implement currentStep state and StepType (pattern: `StockOutClient.tsx:44`)
5. Implement selectedOrder, invoiceNumber, capturedImage, loading, error, success states
6. Implement workflow handlers: handleOrderSelect, handleStartScanning, handleProceedToImage, handleProceedToSubmit, handleSubmit, handleBackToOrders (patterns: `StockOutClient.tsx:97-397`)
7. Conditionally render step components based on currentStep
8. Pass appropriate props to each step component
9. Test: Navigate through all 4 steps, verify state flows correctly, verify API calls work

**Success criteria:** Refactored component navigates through workflow, maintains all functionality of original

### Step 6: Create Side-by-Side Comparison Test
**Files:** `app/stock/out/page.tsx`
**Actions:**
1. Temporarily import both StockOutClient and StockOutClientRefactored
2. Comment out original, uncomment refactored version
3. Test full workflow: select order → scan items → capture image → submit
4. Verify session logs download works
5. Verify audio feedback works
6. Verify validation errors display correctly
7. Compare network requests against original implementation
8. Test: Process actual stock movement, verify database records match original behavior

**Success criteria:** Refactored version produces identical database records, UI behavior, and network requests as original

### Step 7: Update Page Import
**Files:** `app/stock/out/page.tsx`
**Actions:**
1. Change import from StockOutClient to StockOutClientRefactored
2. Rename StockOutClientRefactored to StockOutClient in the file
3. Keep original StockOutClient.tsx file as StockOutClient.backup.tsx for reference
4. Test: Verify production build succeeds, verify all features work in production mode

**Success criteria:** Production build succeeds, no TypeScript errors, refactored version is live

---

## Data Flow

```
Order Selection → Session Init → QR Scanning → Validation → Image Capture → Submit
     |              |               |             |            |             |
  Order|null    UUID+logs       QRCodeData    ScannedItem  Base64Image  API Calls
     |              |               |             |            |             |
     v              v               v             v            v             v
selectedOrder   sessionId      validateScan   scannedItems capturedImage  POST /batch
                                    |              |                      POST /submit
                                    v              v
                              valid:boolean  aggregatedItems
                                    |
                                    v
                              playSound(success)
```

---

## Testing Plan

**Per-step tests:**
- Step 1: Unit test useStockOutSession - verify sessionId generation, log accumulation, download creates .txt
- Step 2: Unit test useScanHandler - mock scanner, verify duplicate prevention, validation calls
- Step 3: Unit test DownloadLogsButton - verify rendering, onClick handling
- Step 4: Component tests for each step - Storybook or Vitest with mock props
- Step 5: Integration test - navigate through workflow in test environment
- Step 6: E2E test - compare behavior against original StockOutClient.tsx
- Step 7: Production build test - verify no TypeScript errors, bundle size

**Integration test:**
- Run: Navigate to `/stock/out` in development mode
- Expected: Complete workflow from order selection to submission
- Compare: Network tab requests match original implementation
- Verify: Database records identical to original implementation

---

## Rollback Plan

If implementation fails:
1. Revert `app/stock/out/page.tsx` import back to original StockOutClient
2. Keep refactored files for future iteration
3. Document specific issues encountered in `-discussions/stockout-refactor-issues.md`
4. Consider alternative: Refactor in smaller increments (hooks first, then components later)

---

## Success Criteria

- [ ] useStockOutSession hook manages session state and logging
- [ ] useScanHandler hook handles scanning with validation
- [ ] DownloadLogsButton component is reusable across steps
- [ ] All 4 step components render independently
- [ ] StockOutClientRefactored orchestrates workflow
- [ ] Side-by-side testing confirms identical behavior
- [ ] Production build succeeds with no TypeScript errors
- [ ] Database records match original implementation
- [ ] Session logs download works identically
- [ ] Audio feedback works identically
- [ ] Original StockOutClient.tsx preserved as backup
- [ ] Code is more maintainable (reduced from 713 lines to ~100 line orchestrator + focused components)