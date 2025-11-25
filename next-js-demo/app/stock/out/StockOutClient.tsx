"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import OrderCardSelector from "@/app/components/stock/OrderCardSelector";
import QRScanner from "@/app/components/stock/QRScanner";
import ScannedItemsTable from "@/app/components/stock/ScannedItemsTable";
import ImageCapture from "@/app/components/stock/ImageCapture";

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  created_at: string;
  order_items: any[];
}

interface AggregatedItem {
  design: string;
  lot: string;
  quantity: number;
  uniqueIdentifiers: string[];
}

type StepType = "select_order" | "scan_items" | "capture_image" | "submit";

export default function StockOutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");

  const [currentStep, setCurrentStep] = useState<StepType>("select_order");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<AggregatedItem[]>([]);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    // Generate session ID on mount
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    // If order number is in URL, try to load that order
    if (orderParam && currentStep === "select_order") {
      // This will be handled by OrderCardSelector
    }
  }, [orderParam, currentStep]);

  const handleOrderSelect = async (order: Order | null) => {
    setSelectedOrder(order);
    if (order) {
      setInvoiceNumber(order.order_number.toString());
    } else {
      setInvoiceNumber("");
    }
  };

  const handleStartScanning = async () => {
    try {
      setError("");
      // Initialize scan session
      const response = await fetch("/api/stock/scan-session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          orderId: selectedOrder?.id || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to start session");

      setCurrentStep("scan_items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleScan = async (qrCodeData: string) => {
    try {
      setScanError("");

      // Parse and validate QR code
      let parsedData;
      try {
        parsedData = JSON.parse(qrCodeData);
      } catch (err) {
        setScanError("Invalid QR code format");
        return;
      }

      // Send to API
      const response = await fetch("/api/stock/scan-session/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          qrData: parsedData,
          orderId: selectedOrder?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setScanError(data.error || "Failed to process scan");
        // Play error sound
        playSound(false);
        return;
      }

      // Success - play success sound and refresh items
      playSound(true);
      await fetchScannedItems();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to process scan");
      playSound(false);
    }
  };

  const fetchScannedItems = async () => {
    try {
      const response = await fetch(
        `/api/stock/scan-session/items?sessionId=${sessionId}`
      );
      if (!response.ok) throw new Error("Failed to fetch items");

      const data = await response.json();
      setScannedItems(data.items || []);
    } catch (err) {
      console.error("Error fetching scanned items:", err);
    }
  };

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

  const handleClearSession = async () => {
    if (
      !confirm("Are you sure you want to clear all scanned items?")
    )
      return;

    try {
      await fetch(`/api/stock/scan-session/clear?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      setScannedItems([]);
      setScanError("");
    } catch (err) {
      setError("Failed to clear session");
    }
  };

  const handleProceedToImage = () => {
    if (scannedItems.length === 0) {
      setError("Please scan at least one item");
      return;
    }
    setCurrentStep("capture_image");
  };

  const handleProceedToSubmit = () => {
    setCurrentStep("submit");
  };

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setError("Invoice number is required");
      return;
    }

    if (scannedItems.length === 0) {
      setError("No items scanned");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/stock/scan-session/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          orderId: selectedOrder?.id || null,
          invoiceNumber,
          imageBase64: capturedImage || null,
          movementType: selectedOrder ? "OUT" : "CUSTOM",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      setSuccess(data.message);

      // Reset and redirect after success
      setTimeout(() => {
        if (selectedOrder) {
          router.push("/orders");
        } else {
          router.push("/stock/history");
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOrders = () => {
    setCurrentStep("select_order");
    setSelectedOrder(null);
    setScannedItems([]);
    setCapturedImage("");
    setInvoiceNumber("");
    setSessionId(uuidv4());
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3">
      <div className="w-full">

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Step 1: Select Order */}
          {currentStep === "select_order" && (
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Select Order</h1>

              <OrderCardSelector
                onOrderSelect={handleOrderSelect}
                selectedOrderId={selectedOrder?.id || null}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleStartScanning}
                  className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-xl"
                >
                  Continue to Scanning
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Scan Items */}
          {currentStep === "scan_items" && (
            <div className="space-y-4">
              {selectedOrder && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-lg text-blue-900">
                    Order #{selectedOrder.order_number} - {selectedOrder.customer_name}
                  </p>
                </div>
              )}

              <QRScanner
                onScan={handleScan}
                isScanning={isScanning}
                onScanningChange={setIsScanning}
              />

              {scanError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-lg font-medium">
                  {scanError}
                </div>
              )}

              <ScannedItemsTable
                items={scannedItems}
                onClear={handleClearSession}
              />

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleProceedToImage}
                  disabled={scannedItems.length === 0}
                  className="w-full px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xl"
                >
                  Continue
                </button>
                <button
                  onClick={handleBackToOrders}
                  className="text-center text-base text-gray-600 hover:text-gray-800"
                >
                  ← Back to scanning
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Capture Image */}
          {currentStep === "capture_image" && (
            <div className="space-y-6">
              <ImageCapture
                onImageCapture={setCapturedImage}
                capturedImage={capturedImage}
              />

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleProceedToSubmit}
                  disabled={!capturedImage}
                  className="w-full px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xl"
                >
                  Continue
                </button>
                {!capturedImage && (
                  <p className="text-center text-base text-red-600 font-medium">
                    Photo is required. Please capture or upload an image.
                  </p>
                )}
                <button
                  onClick={() => setCurrentStep("scan_items")}
                  className="text-center text-base text-gray-600 hover:text-gray-800"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Submit */}
          {currentStep === "submit" && (
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-gray-900">Submit</h3>

              {/* Order Info - Compact */}
              {selectedOrder ? (
                <p className="text-lg text-blue-900">
                  Order #{selectedOrder.order_number} - {selectedOrder.customer_name}
                </p>
              ) : (
                <p className="text-lg text-yellow-900">Custom Order</p>
              )}

              {/* Invoice Number */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-6 py-4 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Invoice Number"
                  disabled={loading}
                />
              </div>

              {/* Scanned Items Summary - Just count */}
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {scannedItems.reduce((sum, item) => sum + item.quantity, 0)} items scanned across {scannedItems.length} design{scannedItems.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Image Preview - Smaller */}
              {capturedImage && (
                <div>
                  <img
                    src={capturedImage}
                    alt="Proof of shipment"
                    className="w-full max-w-sm rounded-lg border-2 border-gray-300"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !invoiceNumber.trim()}
                  className="w-full px-8 py-6 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-2xl"
                >
                  {loading ? "Submitting..." : "Submit Stock Movement"}
                </button>
                <button
                  onClick={() => setCurrentStep("capture_image")}
                  disabled={loading}
                  className="text-center text-base text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  ← Back to scanning
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
