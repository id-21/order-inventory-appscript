# Camera Autostart Research

## Current Camera Setup

### QRScanner Component ([QRScanner.tsx](../app/components/stock/QRScanner.tsx))

**Camera Detection** ([QRScanner.tsx:22-38](../app/components/stock/QRScanner.tsx#L22-L38))
```typescript
useEffect(() => {
  // Get available cameras
  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        setCameras(devices);
        // Try to select back camera by default
        const backCamera = devices.find((device) =>
          device.label.toLowerCase().includes("back")
        );
        setSelectedCamera(backCamera?.id || devices[0].id);
      }
    })
    .catch((err) => {
      console.error("Error getting cameras:", err);
      setError("Unable to access camera");
    });
}, []);
```

**Camera Selection Buttons** ([QRScanner.tsx:124-145](../app/components/stock/QRScanner.tsx#L124-L145))
```typescript
{cameras.length > 1 && (
  <div className="flex gap-2">
    {cameras.map((camera) => (
      <button
        key={camera.id}
        onClick={() => setSelectedCamera(camera.id)}
        disabled={isScanning}
        className={...}
      >
        {camera.label?.toLowerCase().includes("back")
          ? "📷 Back"
          : camera.label?.toLowerCase().includes("front")
          ? "🤳 Front"
          : `Camera ${cameras.indexOf(camera) + 1}`}
      </button>
    ))}
  </div>
)}
```
- Only shows when `cameras.length > 1`
- Already hidden for single camera devices

**Start/Stop Scanning Button** ([QRScanner.tsx:148-158](../app/components/stock/QRScanner.tsx#L148-L158))
```typescript
<button
  onClick={handleToggleScanning}
  disabled={!selectedCamera}
  className={...}
>
  {isScanning ? "Stop Scanner" : "Start Scanner"}
</button>
```
- Always visible
- User must manually click to start scanning

**Scanner Start Logic** ([QRScanner.tsx:56-93](../app/components/stock/QRScanner.tsx#L56-L93))
```typescript
const startScanning = async () => {
  if (!selectedCamera) {
    setError("No camera selected");
    return;
  }

  try {
    setError("");
    scannerRef.current = new Html5Qrcode("qr-reader");

    await scannerRef.current.start(
      selectedCamera,
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
      },
      (decodedText) => {
        onScan(decodedText, scannerRef.current);
      },
      ...
    );

    onScanningChange(true);
  } catch (err) {
    console.error("Error starting scanner:", err);
    setError("Failed to start camera. Please check permissions.");
    onScanningChange(false);
  }
};
```

## Requirements

### Autostart Conditions
Device should autostart camera if:
1. Only 1 total camera available, OR
2. Only 1 back camera available (may have front camera too)

### UI Changes for Autostart Mode
1. Hide camera selection buttons (already done via `cameras.length > 1`)
2. Hide "Start Scanner" / "Stop Scanner" button
3. Automatically start scanning on component mount

## Key Observations

- Camera buttons already conditionally hidden when `cameras.length > 1`
- Start/Stop button is always visible currently
- Back camera auto-selected by default but scanner doesn't start automatically
- Scanner has proper error handling for permission denial and camera access issues
