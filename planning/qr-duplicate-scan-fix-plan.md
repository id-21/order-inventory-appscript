# Implementation Plan: QR Duplicate Scan Fix

**Planning Date:** 2026-01-08
**Research Reference:** Investigation performed inline
**Target:** Fix QR scanner triggering 4 scans on first scan instead of 1

---

## Root Cause Analysis

**Problem:** Html5Qrcode library's `onDecode` callback fires multiple times (4x) for the same QR code during continuous scanning before the validation logic can update state.

**Why duplicate check fails on first scan:**
- Html5Qrcode scans at 10 fps (line `QRScanner.tsx:58`)
- `onDecode` callback fires multiple times within ~100ms for same QR code
- React state updates are asynchronous - `scannedItems` array doesn't update immediately
- All 4 callbacks see the same empty `scannedItems` array
- Duplicate check in `checkDuplicateScan()` passes for all 4 scans
- Result: 4 items added to state

**Why it works on second scan:**
- After first scan completes and state updates, `scannedItems` contains the item
- Subsequent scans find the duplicate in state and reject correctly

---

## Required Reading

**CLAUDE.md Files:**
- `next-js-demo/app/components/CLAUDE.md` - Section: Camera Handling Pattern, Html5Qrcode Singleton
- `next-js-demo/app/stock/CLAUDE.md` - Section: Client-Side Validation Pattern
- `next-js-demo/lib/features/CLAUDE.md` - Section: Client-Side Validation Pattern

**Reference Implementations:**
- `next-js-demo/app/components/stock/QRScanner.tsx:61-63` - onDecode callback
- `next-js-demo/app/stock/out/StockOutClient.tsx:99-152` - handleScan with validation
- `next-js-demo/lib/features/client-scan-validation.ts:93-113` - checkDuplicateScan function

**Dependencies:**
- Module: `react` - Function: `useRef<string | null>(null)` for tracking in-flight scans
- Module: `html5-qrcode` - Class: `Html5Qrcode` with fps config
- Data structure: `ScannedItem[]` - Required fields: uniqueIdentifier, design, lot, scannedAt

---

## Files to Modify

### Modify: `next-js-demo/app/components/stock/QRScanner.tsx`
**Changes:** Add debounce/deduplication to prevent multiple onDecode fires for same QR code
**Lines affected:** 17-18 (add useRef), 61-63 (wrap onDecode callback)
**Pattern source:** React useRef pattern for tracking transient state

### Modify: `next-js-demo/app/stock/out/StockOutClient.tsx`
**Changes:** Add processing flag to prevent concurrent handleScan executions
**Lines affected:** 46-47 (add state), 99-152 (add guard in handleScan)
**Pattern source:** Standard async operation guard pattern

---

## Implementation Steps

### Step 1: Add Scan Debounce in QRScanner Component
**Files:** `next-js-demo/app/components/stock/QRScanner.tsx`
**Actions:**
1. Add `useRef<string | null>(null)` to track last scanned code at line 17
2. Add `useRef<NodeJS.Timeout | null>(null)` to track debounce timer at line 18
3. Wrap onDecode callback (line 61) with debounce logic:
   - Check if decoded text matches lastScannedRef.current
   - If match, return early (skip duplicate)
   - If different, update lastScannedRef and call onScan
   - Set timeout to clear lastScannedRef after 2000ms (allows re-scan same code after delay)
4. Clear timeout in stopScanning cleanup (line 80-82)
5. Test: Scan same QR code - should trigger once, wait 2s, scan again - should trigger again

**Success criteria:** Single onScan callback fired per QR code scan event

### Step 2: Add Processing Guard in StockOutClient
**Files:** `next-js-demo/app/stock/out/StockOutClient.tsx`
**Actions:**
1. Add `const [isProcessingScan, setIsProcessingScan] = useState(false)` state at line 46
2. Add guard at start of handleScan (line 99): if isProcessingScan, return early
3. Set isProcessingScan to true before validation starts
4. Set isProcessingScan to false in finally block after all processing
5. Test: Rapid scan attempts should queue, not execute concurrently

**Success criteria:** Only one handleScan execution runs at a time, preventing race conditions

### Step 3: Reset Debounce State on Scanner Stop
**Files:** `next-js-demo/app/components/stock/QRScanner.tsx`
**Actions:**
1. In stopScanning function (line 77), clear debounce timer before stopping camera
2. Reset lastScannedRef.current to null
3. Ensures clean state when scanner restarts
4. Test: Stop scanner, start scanner, scan code - should work correctly

**Success criteria:** No stale state after stopping/starting scanner

### Step 4: Adjust Scan FPS to Reduce Callback Frequency
**Files:** `next-js-demo/app/components/stock/QRScanner.tsx`
**Actions:**
1. Reduce fps from 10 to 5 in config (line 58)
2. This reduces decode attempts per second, lowering callback fire rate
3. Balances scan responsiveness with duplicate prevention
4. Test: Scan should still be responsive but fire fewer callbacks

**Success criteria:** Scan still responsive (< 1s delay) but fewer duplicate callbacks

### Step 5: Integration Test Full Scan Workflow
**Files:** All modified files
**Actions:**
1. Start scanner, scan QR code → verify 1 item added
2. Scan same code immediately → verify error "already scanned"
3. Scan different code → verify 2nd item added
4. Stop scanner, start scanner, scan first code → verify error "already scanned" (still in session)
5. Clear session, scan first code → verify new item added

**Success criteria:** All test cases pass, no duplicate items in scannedItems array

---

## Data Flow

```
QR Code → Html5Qrcode (5 fps) → onDecode callback → Debounce Check (useRef) → onScan prop
  → handleScan (guard check) → Parse JSON → validateScan → checkDuplicateScan (state check)
  → Add to scannedItems state → UI Update
```

**Key throttle points:**
1. **Debounce layer** (QRScanner): Blocks identical strings within 2s window
2. **Processing guard** (StockOutClient): Prevents concurrent executions
3. **Duplicate validation** (client-scan-validation): Checks scannedItems state

---

## Testing Plan

**Per-step tests:**
- Step 1: Console.log in onScan callback, verify fires once per scan
- Step 2: Console.log processing flag, verify no concurrent executions
- Step 3: Stop/start scanner multiple times, verify no errors
- Step 4: Time from QR presentation to success beep, should be < 1s
- Step 5: Full workflow test (see Step 5 actions)

**Integration test:**
- Run: Navigate to /stock/out, select order, start scanner
- Expected: Scan 5 different QR codes, see exactly 5 items in table
- Compare: scannedItems.length === 5, no duplicates in uniqueIdentifiers

**Edge cases to test:**
- Scan same code twice rapidly (< 100ms apart) → should add only 1 item
- Scan same code after 3 seconds → should show "already scanned" error
- Scan while validation is running → should queue, not add duplicate

---

## Rollback Plan

If implementation causes issues:
1. Revert Step 4 (fps change) if scanning becomes too slow
2. Revert Step 1 (debounce) if re-scanning same item doesn't work
3. Keep Step 2 (processing guard) as it's defensive and low-risk
4. Alternative: Increase debounce timeout from 2s to 3s if too aggressive

---

## Success Criteria

- [x] Planning document created
- [ ] Step 1 completed: Debounce added to QRScanner
- [ ] Step 2 completed: Processing guard added to StockOutClient
- [ ] Step 3 completed: Cleanup logic updated
- [ ] Step 4 completed: FPS adjusted
- [ ] Step 5 completed: Integration tests pass
- [ ] No duplicate items on first scan
- [ ] Duplicate detection still works on second scan
- [ ] Scanning remains responsive (< 1s)
- [ ] No regressions in existing scan workflow