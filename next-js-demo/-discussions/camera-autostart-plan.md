# Camera Autostart Implementation Plan

## Required Reading
- Research: [camera-autostart-research.md](camera-autostart-research.md)
- Patterns: [app/components/CLAUDE.md](../app/components/CLAUDE.md#L26-L31) (Camera Handling Pattern)
- Reference: [QRScanner.tsx](../app/components/stock/QRScanner.tsx)

## Files to Modify
- `app/components/stock/QRScanner.tsx` - Add autostart detection and conditional UI

## Implementation Steps

### Step 1: Add Autostart Detection State
**File:** [QRScanner.tsx:20](../app/components/stock/QRScanner.tsx#L20)
**Actions:**
1. Add state: `const [shouldAutostart, setShouldAutostart] = useState(false)`
2. Add after existing `selectedCamera` state
3. Test: State initializes to false on mount

**Success:** New state variable added without breaking existing functionality

---

### Step 2: Detect Autostart Condition After Camera Enumeration
**File:** [QRScanner.tsx:22-38](../app/components/stock/QRScanner.tsx#L22-L38)
**Actions:**
1. Inside `.then((devices) => {...})` block, after `setSelectedCamera()`
2. Filter back cameras: `devices.filter(d => d.label.toLowerCase().includes("back"))`
3. Calculate: `const autostart = devices.length === 1 || backCameras.length === 1`
4. Call: `setShouldAutostart(autostart)`
5. Test: Log autostart value for 1-camera, 2-camera (1 back), 2-camera (2 back) scenarios

**Success:** Autostart correctly detected for single camera or single back camera devices

---

### Step 3: Trigger Automatic Scanner Start
**File:** [QRScanner.tsx](../app/components/stock/QRScanner.tsx) (new useEffect after line 54)
**Actions:**
1. Add useEffect with deps: `[shouldAutostart, selectedCamera]`
2. Guard: Only run if `shouldAutostart && selectedCamera && !isScanning`
3. Call: `startScanning()`
4. Test: Scanner starts automatically on mount for single-camera devices
5. Test: Scanner does NOT start for multi-camera devices

**Success:** Scanner auto-starts only when conditions met, manual start still works otherwise

---

### Step 4: Hide Start/Stop Button in Autostart Mode
**File:** [QRScanner.tsx:148-158](../app/components/stock/QRScanner.tsx#L148-L158)
**Actions:**
1. Wrap button in conditional: `{!shouldAutostart && (<button>...</button>)}`
2. Test: Button hidden when `shouldAutostart === true`
3. Test: Button visible when `shouldAutostart === false`

**Success:** Start/Stop button only visible on multi-camera devices

---

### Step 5: Update Camera Button Visibility Logic
**File:** [QRScanner.tsx:124](../app/components/stock/QRScanner.tsx#L124)
**Actions:**
1. Change condition from `cameras.length > 1` to `!shouldAutostart`
2. This handles edge case where device has 2 cameras but only 1 back camera
3. Test: Buttons hidden when shouldAutostart is true (even if cameras.length > 1)
4. Test: Buttons shown when shouldAutostart is false

**Success:** Camera buttons correctly hidden based on autostart logic, not just camera count

## Data Flow

```
Device Cameras → Html5Qrcode.getCameras()
    ↓
Filter back cameras → Calculate autostart (total=1 OR back=1)
    ↓
setShouldAutostart(true) → useEffect triggers → startScanning()
    ↓
UI: Hide buttons, Scanner auto-starts
```

## Testing Plan

### Per-Step Testing
- Step 1: Verify state initializes without errors
- Step 2: Test with different camera configurations (simulated)
- Step 3: Verify auto-start only fires once on mount
- Step 4: Check button visibility toggling
- Step 5: Verify button logic with various camera configurations

### Integration Testing
**Test Case 1: Single Camera Device**
- Cameras: 1 back camera
- Expected: No camera buttons, no start/stop button, scanner auto-starts

**Test Case 2: Single Back Camera with Front Camera**
- Cameras: 1 back, 1 front
- Expected: No camera buttons, no start/stop button, scanner auto-starts with back camera

**Test Case 3: Multiple Back Cameras**
- Cameras: 2 back cameras
- Expected: Camera selection buttons visible, start/stop button visible, manual start required

**Test Case 4: No Back Camera Labeled**
- Cameras: 1 camera without "back" in label
- Expected: Autostart triggers (total cameras = 1), scanner starts

## Success Criteria

- [ ] Autostart detected correctly for 1 total camera
- [ ] Autostart detected correctly for 1 back camera (+ any front cameras)
- [ ] Autostart does NOT trigger for 2+ back cameras
- [ ] Scanner auto-starts on mount in autostart mode
- [ ] Start/Stop button hidden in autostart mode
- [ ] Camera selection buttons hidden in autostart mode
- [ ] Manual scanning still works for multi-camera devices
- [ ] No breaking changes to existing functionality
- [ ] Error handling preserved (camera permissions, device in use)