"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  onScanningChange: (scanning: boolean) => void;
}

export default function QRScanner({
  onScan,
  isScanning,
  onScanningChange,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");

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

    return () => {
      stopScanning();
    };
  }, []);

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
          qrbox: { width: 320, height: 320 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (these happen constantly while scanning)
        }
      );

      onScanningChange(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("Failed to start camera. Please check permissions.");
      onScanningChange(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        onScanningChange(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const handleToggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  return (
    <div className="space-y-4">
      {error && cameras.length > 1 && (
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          disabled={isScanning}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.label || `Camera ${camera.id}`}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleToggleScanning}
        disabled={!selectedCamera}
        className={`w-full px-8 py-5 rounded-lg font-medium text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isScanning
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {isScanning ? "Stop Scanner" : "Start Scanner"}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-lg font-medium">
          {error}
        </div>
      )}

      <div
        id="qr-reader"
        className={`w-full rounded-lg overflow-hidden border-2 ${
          isScanning ? "border-green-500" : "border-gray-300"
        }`}
        style={{ minHeight: "60vh" }}
      />
    </div>
  );
}
