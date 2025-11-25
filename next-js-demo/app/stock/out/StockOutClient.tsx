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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Stock Out</h1>
          <p className="text-gray-600 mt-1">
            Scan QR codes to track inventory outflow
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            {[
              { step: "select_order", label: "Select Order", icon: "📋" },
              { step: "scan_items", label: "Scan Items", icon: "📱" },
              { step: "capture_image", label: "Capture Image", icon: "📷" },
              { step: "submit", label: "Submit", icon: "✓" },
            ].map((item, index) => {
              const isActive = currentStep === item.step;
              const isPast =
                ["select_order", "scan_items", "capture_image", "submit"].indexOf(
                  currentStep
                ) >
                ["select_order", "scan_items", "capture_image", "submit"].indexOf(
                  item.step as StepType
                );

              return (
                <div key={item.step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        isActive
                          ? "bg-blue-500 text-white"
                          : isPast
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <p
                      className={`text-xs mt-2 ${
                        isActive ? "font-semibold" : ""
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-1 flex-1 ${
                        isPast ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
              <OrderCardSelector
                onOrderSelect={handleOrderSelect}
                selectedOrderId={selectedOrder?.id || null}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleStartScanning}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Continue to Scanning →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Scan Items */}
          {currentStep === "scan_items" && (
            <div className="space-y-6">
              {selectedOrder && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900">
                    Scanning for Order #{selectedOrder.order_number}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Customer: {selectedOrder.customer_name}
                  </p>
                </div>
              )}

              <QRScanner
                onScan={handleScan}
                isScanning={isScanning}
                onScanningChange={setIsScanning}
              />

              {scanError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {scanError}
                </div>
              )}

              <ScannedItemsTable
                items={scannedItems}
                onClear={handleClearSession}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleBackToOrders}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={handleProceedToImage}
                  disabled={scannedItems.length === 0}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Continue to Image →
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

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep("scan_items")}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={handleProceedToSubmit}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Continue to Submit →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Submit */}
          {currentStep === "submit" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Review and Submit
                </h3>
              </div>

              {/* Order Info */}
              {selectedOrder ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900">
                    Order #{selectedOrder.order_number}
                  </h4>
                  <p className="text-sm text-blue-700">
                    Customer: {selectedOrder.customer_name}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900">Custom Order</h4>
                  <p className="text-sm text-yellow-700">
                    No order associated with this stock movement
                  </p>
                </div>
              )}

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter invoice number"
                  disabled={loading}
                />
              </div>

              {/* Scanned Items Summary */}
              <ScannedItemsTable
                items={scannedItems}
                onClear={handleClearSession}
              />

              {/* Image Preview */}
              {capturedImage && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Captured Image:
                  </h4>
                  <img
                    src={capturedImage}
                    alt="Proof of shipment"
                    className="w-full max-w-md rounded-lg border-2 border-gray-300"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep("capture_image")}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !invoiceNumber.trim()}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {loading ? "Submitting..." : "Submit Stock Movement"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
