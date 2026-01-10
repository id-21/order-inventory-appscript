import { useState, useRef, MutableRefObject } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  validateScan,
  type QRCodeData,
  type ScannedItem,
  type Order as ClientOrder,
} from "@/lib/features/client-scan-validation";

interface UseScanHandlerProps {
  selectedOrder: ClientOrder | null;
  scannedItemsRef: MutableRefObject<ScannedItem[]>;
  addLog: (message: string) => void;
  addScannedItem: (item: ScannedItem) => void;
}

interface UseScanHandlerReturn {
  handleScan: (qrCodeData: string, scanner: Html5Qrcode) => Promise<void>;
  scanError: string;
  setScanError: (error: string) => void;
  debugData: {
    qrData: QRCodeData | null;
    validation: { valid: boolean; error?: string };
  };
  setDebugData: (data: {
    qrData: QRCodeData | null;
    validation: { valid: boolean; error?: string };
  }) => void;
}

export function useScanHandler({
  selectedOrder,
  scannedItemsRef,
  addLog,
  addScannedItem,
}: UseScanHandlerProps): UseScanHandlerReturn {
  const [scanError, setScanError] = useState("");
  const [debugData, setDebugData] = useState<{
    qrData: QRCodeData | null;
    validation: { valid: boolean; error?: string };
  }>({ qrData: null, validation: { valid: false } });

  // Use ref instead of state for synchronous blocking of duplicate scans
  const isProcessingScanRef = useRef(false);

  const playSound = (success: boolean) => {
    // Create a simple beep sound
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = success ? 800 : 400;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleScan = async (qrCodeData: string, scanner: Html5Qrcode) => {
    const timeMs = performance.now().toFixed(2);
    addLog(`[${timeMs}ms] Scan received`);

    // Prevent processing if already handling a scan (use ref for synchronous check)
    if (isProcessingScanRef.current) {
      addLog(`[${timeMs}ms] Already processing a scan, ignoring duplicate...`);
      return;
    }

    try {
      // Set processing flag immediately to block duplicate callbacks (synchronous!)
      isProcessingScanRef.current = true;

      // Pause scanner immediately to prevent duplicate scans
      addLog(`[${timeMs}ms] Pausing scanner to process scan...`);
      scanner.pause();

      setScanError("");

      // Parse QR code
      let parsedData: QRCodeData;
      try {
        parsedData = JSON.parse(qrCodeData);
      } catch (err) {
        addLog(`[${timeMs}ms] Invalid QR code format`);
        setScanError("Invalid QR code format");
        playSound(false);
        return;
      }

      // Validate locally (instant, no network round-trip!)
      // Use ref to get current items (avoids stale closure)
      addLog(`[${timeMs}ms] Validating scan...`);
      addLog(`[${timeMs}ms] Unique Identifier: ${parsedData["Unique Identifier"]}`);
      addLog(`[${timeMs}ms] Current scanned items count: ${scannedItemsRef.current.length}`);
      addLog(
        `[${timeMs}ms] Existing identifiers: ${scannedItemsRef.current.map((i) => i.uniqueIdentifier).join(", ")}`
      );

      const validation = validateScan(
        parsedData,
        selectedOrder as ClientOrder | null,
        scannedItemsRef.current // Use ref instead of state to avoid stale closure
      );

      addLog(
        `[${timeMs}ms] Validation result: ${validation.valid ? "PASS" : `FAIL - ${validation.error}`}`
      );

      // Set debug data after every scan
      setDebugData({
        qrData: parsedData,
        validation: {
          valid: validation.valid,
          error: validation.error,
        },
      });

      if (!validation.valid) {
        setScanError(validation.error || "Invalid QR code");
        playSound(false);
        return;
      }

      // Add to local state (convert all to strings to ensure consistency)
      const newItem: ScannedItem = {
        design: String(parsedData.Design),
        lot: String(parsedData.Lot),
        uniqueIdentifier: String(parsedData["Unique Identifier"]),
        scannedAt: Date.now(),
      };

      addScannedItem(newItem);
      addLog(
        `[${timeMs}ms] Items array updated. New count: ${scannedItemsRef.current.length + 1}`
      );

      // Success - play success sound
      addLog(
        `[${timeMs}ms] Scan successful - Design: ${parsedData.Design}, Lot: ${parsedData.Lot}`
      );
      playSound(true);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to process scan";
      addLog(`[${timeMs}ms] Error processing scan: ${errorMsg}`);
      setScanError(errorMsg);
      playSound(false);
    } finally {
      // Always resume scanning after processing, even if there was an error
      scanner.resume();
      addLog(`[${timeMs}ms] Scanner resumed`);
      // Reset processing flag to allow next scan (synchronous!)
      isProcessingScanRef.current = false;
    }
  };

  return {
    handleScan,
    scanError,
    setScanError,
    debugData,
    setDebugData,
  };
}