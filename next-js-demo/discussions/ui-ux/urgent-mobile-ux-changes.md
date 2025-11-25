# Urgent Mobile UX Changes - Stock Out Flow

**Date:** 2025-11-25
**Priority:** HIGH - Address Immediately
**Status:** Requirements Documented - Ready for Implementation

---

## User Requirements Summary

### Confirmed Workflow:
1. **Inventory personnel choose order first OR use custom order** - Primary way to access stock out screen
2. **No access to order forms or order summary pages** - Stock out is their primary interface
3. **Flow: Order Selection → Scanning → Image Capture → Submit** (4 screens)
4. **Scanner screen needs order summary visible** - For quick reference during scanning
5. **Image capture is MANDATORY** - Cannot skip, final summary photo required for every stock entry

### Key Directives:
- ✅ Remove emojis everywhere
- ✅ Remove horizontal progress bar
- ✅ Remove ALL helper text
- ✅ Increase ALL font sizes
- ✅ Change containers from desktop-first to mobile-first
- ✅ Focus on major component per screen (make it prominent)

---

## Screen Flow

```
Screen 1: ORDER SELECTION
   ↓ (Select order OR custom order)
Screen 2: SCANNING
   ↓ (Scan items)
Screen 3: IMAGE CAPTURE (MANDATORY)
   ↓ (Take photo)
Screen 4: SUBMIT
```

---

## SCREEN 1: Order Selection

### Major Component: Order List/Table Summary

### File: `app/stock/out/StockOutClient.tsx`

**REMOVE:**
- Lines 258-264: Title "Stock Out" and description text → REMOVE helper text
- Lines 267-317: Progress indicator with emojis and horizontal bar → DELETE ENTIRELY
- Line 257: Container `max-w-6xl` → Change to mobile-first

**CHANGES:**
```
Line 257: Change container class
FROM: <div className="max-w-6xl mx-auto">
TO:   <div className="w-full px-4">  (mobile-first, no max-width constraint)

Lines 258-264: Simplify header
FROM: Large title + description
TO:   Just "Select Order" in larger text (text-4xl or bigger)

Lines 267-317: DELETE ENTIRE PROGRESS SECTION
```

### File: `app/components/stock/OrderCardSelector.tsx`

**MAJOR CHANGES - Order Display:**

**REMOVE:**
- Line 91: Description text "Choose an order to scan items, or continue with custom order"
- Lines 164-168: Line items count "X line item(s)"

**KEEP:**
- Lines 174-186: "Continue without Order (Custom)" button → REQUIRED feature, but make more prominent

**INCREASE FONT SIZES:**
- Line 131: Order number `text-lg` → `text-2xl` (make it very prominent)
- Line 135: Customer name `text-sm` → `text-base`
- Line 148: Metrics labels and values `text-sm` → `text-base` or `text-lg`

**RESTRUCTURE TABLE SUMMARY:**

Current cards show:
- Order #
- Customer name
- Total Items
- Fulfilled
- Remaining
- Line items count

**NEW STRUCTURE (Simplified for mobile):**
```
Order Cards should show:
├── Order # (VERY LARGE - text-2xl or text-3xl)
├── Customer Name (Large - text-lg)
├── Remaining Items: X (Large badge - text-xl)
└── (REMOVE: Total, Fulfilled, Line items count)
```

**SPECIFIC CHANGES:**
```
Line 87: Increase heading size
FROM: <h3 className="text-lg font-semibold...">
TO:   <h3 className="text-3xl font-bold...">

Line 107: Already single column - GOOD
KEEP: grid-cols-1 (already mobile-optimized)

Lines 123-128: Increase card padding for touch
FROM: p-4
TO:   p-6 (larger touch targets)

Line 131: Make order number HUGE
FROM: <h4 className="font-bold text-lg...">
TO:   <h4 className="font-bold text-3xl...">

Line 135: Increase customer name size
FROM: <p className="text-sm...">
TO:   <p className="text-lg...">

Lines 145-167: Simplify metrics section
KEEP only "Remaining" count
DELETE: "Total Items" and "Fulfilled" rows (lines 146-154)

Line 158: Increase remaining count size
FROM: <span className="font-medium text-orange-600">
TO:   <span className="font-bold text-2xl text-orange-600">

Lines 164-168: DELETE line items count display

Lines 174-186: KEEP "Continue without Order" button but make more prominent
FROM: border-2 border-gray-300 (secondary appearance)
TO:   Large button with better visibility, text-xl font
      Position: Below order cards as equal option (not de-emphasized)
```

---

## SCREEN 2: Scanning

### Major Component: QR Scanner (must be prominent)
### Secondary Requirement: Order summary visible for quick reference

### File: `app/stock/out/StockOutClient.tsx`

**CHANGES IN SCAN STEP (Lines 354-400):**

**KEEP but MODIFY:**
- Lines 356-365: Order info banner → Keep but make more compact
- Lines 367-371: QRScanner component → Make this MUCH LARGER
- Lines 379-382: ScannedItemsTable → Keep but simplify significantly

**SPECIFIC CHANGES:**
```
Lines 356-365: Simplify order info banner
FROM: p-4 bg-blue-50 border with two lines (order # + customer)
TO:   Compact sticky header with: "Order #123 - Customer Name" (single line, text-lg)

Line 367-371: Scanner section - increase prominence
ADD: More vertical space for scanner (should take 50-60% of screen)

Lines 373-377: Scan error section - INCREASE font size
FROM: text-red-700 (default size)
TO:   text-red-700 text-lg font-medium

Lines 384-398: Navigation buttons - simplify
FROM: Two buttons side by side
TO:   Single prominent "Continue" button (full width, large)
      Back button as small text link
```

### File: `app/components/stock/QRScanner.tsx`

**REMOVE:**
- Lines 143-156: Help tips section → DELETE ENTIRELY per user requirement
- Lines 101-114: Camera selector dropdown → Hide by default (only show if error)

**INCREASE:**
- Line 140: Scanner viewport height → Increase significantly
- Lines 119-126: Button sizes → Make much larger

**SPECIFIC CHANGES:**
```
Lines 101-114: Camera selector
FROM: Always visible select dropdown
TO:   Hidden by default, only show on camera error

Lines 116-126: Scanner button - make HUGE
FROM: px-6 py-3
TO:   px-8 py-5 text-xl (very large touch target)

Line 140: Increase scanner viewport
FROM: style={{ minHeight: "300px" }}
TO:   style={{ minHeight: "60vh" }} (takes majority of screen)

Lines 55-60: Increase QR box size
FROM: qrbox: { width: 250, height: 250 }
TO:   qrbox: { width: 320, height: 320 } (larger for easier alignment)

Lines 143-156: DELETE ENTIRE help tips section (blue info box)
```

### File: `app/components/stock/ScannedItemsTable.tsx`

**THIS IS NOT THE MAJOR COMPONENT ON SCAN SCREEN**
**But needs to be visible for quick reference**

**CHANGES:**
- Keep table BUT simplify drastically
- Must be compact, not dominating screen
- Scanner is the major component, this is supporting info

**SPECIFIC CHANGES:**
```
Lines 34-49: Header section - make compact
FROM: text-lg heading with description
TO:   text-base heading only, no description

Lines 43-48: "Clear All" button
FROM: px-4 py-2
TO:   px-3 py-2 text-sm (smaller, less prominent)

Lines 53-107: Table structure
ISSUE: Table still problematic on mobile
SOLUTION: Keep table BUT show only essential columns

NEW TABLE COLUMNS (mobile view):
├── Design (text-base, bold)
└── Qty (text-xl, bold, green badge)

REMOVE from table view:
- Lot Number column (line 60-61)
- Unique IDs column (line 65-67)
- All expandable details (lines 90-101)

Lines 111-127: Summary card
FROM: Large blue card with two-column layout
TO:   Simple single line: "Total: X items" (text-xl, bold)
```

**ALTERNATIVE APPROACH (Better for mobile):**
Replace table with compact list:
```
Each item shows as:
┌────────────────────────────┐
│ Design Name    [Qty Badge] │
└────────────────────────────┘

Example:
┌────────────────────────────┐
│ SKU-12345           [24]   │
│ DESIGN-789          [10]   │
│ PART-XYZ            [5]    │
└────────────────────────────┘
Total: 39 items
```

---

## SCREEN 3: Image Capture (MANDATORY)

### Major Component: Image Capture Interface

**KEY REQUIREMENT:** This screen CANNOT be skipped. Image capture is mandatory for all stock entries.

### File: `app/stock/out/StockOutClient.tsx`

**CHANGES IN IMAGE CAPTURE STEP (Lines 402-425):**

**KEEP:**
- Image capture as separate dedicated screen
- Full ImageCapture component

**MODIFY:**
- Make it clear this step is required (not optional)
- Remove "optional" messaging
- Increase prominence of capture controls

**SPECIFIC CHANGES:**
```
Lines 402-425: Image capture step structure
KEEP: Dedicated screen for image capture
CHANGE: Make heading show it's required: "Capture Shipment Photo (Required)"

Line 418: Continue button
FROM: "Continue to Submit"
TO:   "Continue" (simpler)
ADD: Disable button if no image captured (enforce mandatory requirement)

Line 412: Back button
KEEP: Allow going back to rescan if needed
```

### File: `app/components/stock/ImageCapture.tsx`

**CHANGES TO MAKE IMAGE MANDATORY:**

**REMOVE:**
- Lines 170-176: Yellow warning "Image is optional but recommended" → DELETE
- Any messaging suggesting image is optional

**ADD:**
- Clear indication that photo is required
- Prevent continuing without image

**SPECIFIC CHANGES:**
```
Lines 84-90: Header section
FROM: <h3 className="text-lg...">Capture Proof of Shipment</h3>
      <p className="text-sm...">Take a photo or upload an image...</p>
TO:   <h3 className="text-3xl font-bold...">Shipment Photo</h3>
      <p className="text-lg font-medium text-red-600">Required</p>

Lines 137-163: Camera/Upload options - INCREASE sizes
FROM: Grid with emoji icons and text
TO:   Larger buttons with text-xl fonts, bigger touch targets
      Camera button: py-8 (very large)
      Upload button: py-8 (very large)

Lines 113-135: Camera mode - INCREASE viewport
FROM: Standard video preview
TO:   Larger video element (min-height: 50vh)
      Larger "Capture Photo" button (text-2xl, py-5)

Lines 170-176: DELETE "optional but recommended" warning entirely

ADD NEW: If user tries to continue without image, show error:
"Photo is required. Please capture or upload an image."
```

**IMAGE CAPTURE OPTIONS (Simplified):**
```
Two equal options:
┌─────────────────────────────────┐
│   📷 Take Photo                 │
│   (Large button, text-xl)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   📁 Upload from Gallery        │
│   (Large button, text-xl)       │
└─────────────────────────────────┘
```

---

## SCREEN 4: Submit

### Major Component: Submit form (invoice input + final confirmation)

### File: `app/stock/out/StockOutClient.tsx`

**CHANGES IN SUBMIT STEP (Lines 428-508):**

**REMOVE:**
- Line 431: "Review and Submit" heading → Change to just "Submit"
- Lines 437-453: Order info card → Make more compact (already saw this on scan screen)

**INCREASE FONT SIZES:**
- Invoice input needs larger text for mobile typing
- Submit button must be very prominent

**SPECIFIC CHANGES:**
```
Line 431: Simplify heading
FROM: <h3 className="text-lg font-semibold...">Review and Submit</h3>
TO:   <h3 className="text-3xl font-bold...">Submit</h3>

Lines 437-453: Order info - make compact
FROM: p-4 bg-blue-50 with heading + customer name
TO:   Single line: "Order #123 - Customer Name" (text-lg)

Lines 457-468: Invoice input - INCREASE SIZE
FROM: px-4 py-2 (standard input)
TO:   px-6 py-4 text-xl (large input, easy to type)

Line 457: Invoice label - increase size
FROM: text-sm
TO:   text-lg font-medium

Line 465: Placeholder text - make clearer
FROM: "Enter invoice number"
TO:   "Invoice Number" (shorter, clearer)

Lines 471-474: Scanned items table
ISSUE: Full table repeated - redundant
SOLUTION: Show only COUNT, not full table
NEW: "X items scanned across Y designs" (text-xl)

Lines 477-488: Image preview
KEEP: Image preview visible (proof that photo was taken)
FROM: Full width image (max-w-md)
TO:   Medium size (max-w-sm) - show proof but don't dominate screen

Lines 500-505: Submit button - make HUGE
FROM: px-6 py-3 text-lg
TO:   px-8 py-6 text-2xl (very large, prominent green button)

Lines 492-497: Back button
FROM: Equal size to submit
TO:   Small text link: "← Back to scanning"
```

---

## Global Container Changes

### File: `app/stock/out/StockOutClient.tsx`

**CURRENT ISSUE:**
Line 256: `<div className="min-h-screen bg-gray-50 py-8 px-4">`
Line 257: `<div className="max-w-6xl mx-auto">`

This is desktop-first (max-w-6xl limits to 72rem = 1152px)

**MOBILE-FIRST SOLUTION:**
```
Line 256: Keep as is (min-h-screen bg-gray-50 is good)
        Change: py-8 → py-4 (less vertical padding on mobile)
        Change: px-4 → px-3 (slightly less horizontal padding)

Line 257: REMOVE max-width constraint
FROM: <div className="max-w-6xl mx-auto">
TO:   <div className="w-full"> (full width, no centering for desktop)
```

---

## Font Size Changes Summary

### Current → New

**Headings:**
- Main page title: `text-3xl` → `text-4xl` or `text-5xl`
- Section headings: `text-lg` → `text-3xl`
- Subsection headings: `text-base` → `text-xl`

**Body Text:**
- Regular text: `text-sm` → `text-base` or `text-lg`
- Important info: `text-base` → `text-xl`
- Critical info (counts, numbers): `text-lg` → `text-2xl` or `text-3xl`

**Buttons:**
- Button text: Default → `text-xl`
- Primary button text: `text-lg` → `text-2xl`

**Form Inputs:**
- Input text: Default (16px) → `text-xl` (prevents zoom on iOS)
- Labels: `text-sm` → `text-lg`

---

## Priority Order for Implementation

### PHASE 1: Critical Visual Changes (Do First)
1. ✅ Remove progress bar with emojis (Lines 267-317 in StockOutClient)
2. ✅ Remove all helper text across all components
3. ✅ Change container from `max-w-6xl` to `w-full`
4. ✅ Increase all font sizes (global change)

### PHASE 2: Order Selection Screen
1. ✅ Keep "Continue without Order (Custom)" button but make more prominent
2. ✅ Simplify order cards (remove Total/Fulfilled, keep only Remaining)
3. ✅ Increase order number font to text-3xl
4. ✅ Increase card padding for better touch targets

### PHASE 3: Scanning Screen
1. ✅ Remove help tips from QRScanner
2. ✅ Increase scanner viewport to 60vh
3. ✅ Simplify scanned items table (show only Design + Qty)
4. ✅ Make order info banner compact at top
5. ✅ Increase scanner button size

### PHASE 4: Image Capture Screen (NEW)
1. ✅ Make image capture mandatory (enforce in UI)
2. ✅ Remove "optional" messaging
3. ✅ Increase camera/upload button sizes
4. ✅ Make heading show "Required"
5. ✅ Increase camera viewport size

### PHASE 5: Submit Screen
1. ✅ Remove full table repeat, show only count
2. ✅ Increase invoice input size to text-xl
3. ✅ Make submit button huge (text-2xl, py-6)
4. ✅ Keep image preview at medium size (proof of capture)
5. ✅ Simplify order info display

---

## File Change Summary

### Files to Modify:
1. **`app/stock/out/StockOutClient.tsx`** - Main orchestrator (remove progress bar, change containers, keep 4 screens)
2. **`app/components/stock/OrderCardSelector.tsx`** - Simplify cards, increase fonts, keep custom order option
3. **`app/components/stock/QRScanner.tsx`** - Remove help text, increase scanner size
4. **`app/components/stock/ScannedItemsTable.tsx`** - Simplify table or replace with compact list
5. **`app/components/stock/ImageCapture.tsx`** - Make mandatory, remove optional messaging, increase sizes

### Total Lines to Change: ~180 lines (focused changes, not massive rewrite)

---

## Key Differences from Original Report

### User Corrections Applied:

1. **Screen Flow:** 4 screens (not 2 or 3)
   - Screen 1: Order Selection (with custom order option)
   - Screen 2: Scanning
   - Screen 3: Image Capture (MANDATORY)
   - Screen 4: Submit

2. **Order Selection:** Can be regular order OR custom order
   - Original report suggested removing custom order
   - User clarified custom order feature is REQUIRED
   - Both options need to be prominent

3. **Image Capture:** MANDATORY, cannot be skipped
   - Original report suggested making it optional/integrated
   - User clarified photo is required for every stock entry
   - Must remain as dedicated screen with mandatory enforcement

4. **Helper Text:** Remove ALL (not just simplify)
   - Original report suggested reducing
   - User wants complete removal

5. **Table on Scan Screen:** Keep visible (not just count badge)
   - Original report suggested hiding table during scan
   - User wants quick reference table visible during scanning

6. **Major Component Focus:** Each screen has ONE major component
   - Screen 1: Order selection list (with custom order option)
   - Screen 2: QR Scanner (with supporting order summary + items table)
   - Screen 3: Image Capture (mandatory photo)
   - Screen 4: Submit form

---

## Implementation Notes

- **DO NOT** write code yet - this is documentation only
- **DO NOT** remove functionality - only simplify UI
- **KEEP** all validation and error handling logic
- **KEEP** all API calls and state management
- **FOCUS** on visual/layout changes only

---

## Success Criteria

After implementation, the interface should:
- ✅ Have no emojis anywhere
- ✅ Have no horizontal progress bar
- ✅ Have no helper text or tips
- ✅ Have larger, more readable fonts throughout
- ✅ Use full width on mobile (no desktop max-width)
- ✅ Have one prominent component per screen
- ✅ Keep order summary visible during scanning
- ✅ Allow custom order option (not just order selection)
- ✅ Enforce mandatory image capture (cannot skip)
- ✅ Be fast and touch-friendly for warehouse use

---

**Ready for implementation when approved.**
