"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Html5Qrcode } from "html5-qrcode";
import OrderCardSelector from "@/app/components/stock/OrderCardSelector";
import QRScanner from "@/app/components/stock/QRScanner";
import ScannedItemsTable from "@/app/components/stock/ScannedItemsTable";
import ImageCapture from "@/app/components/stock/ImageCapture";
import BottomSheet from "@/app/components/ui/BottomSheet";
import DebugScanModal from "@/app/components/stock/DebugScanModal";
import {
  validateScan,
  aggregateScannedItems,
  type QRCodeData,
  type ScannedItem,
  type Order as ClientOrder,
} from "@/lib/features/client-scan-validation";

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
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanError, setScanError] = useState("");
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugData, setDebugData] = useState<{
    qrData: QRCodeData | null;
    validation: { valid: boolean; error?: string };
  }>({ qrData: null, validation: { valid: false } });

  // Use ref instead of state for synchronous blocking of duplicate scans
  const isProcessingScanRef = useRef(false);
  // Use ref to track current scanned items (avoids stale closure in validation)
  const scannedItemsRef = useRef<ScannedItem[]>([]);

  useEffect(() => {
    // Generate session ID on mount
    setSessionId(uuidv4());
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    scannedItemsRef.current = scannedItems;
  }, [scannedItems]);

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

  // Update aggregated items whenever scanned items change
  useEffect(() => {
    const aggregated = aggregateScannedItems(scannedItems);
    setAggregatedItems(aggregated);
  }, [scannedItems]);

  const handleStartScanning = async () => {
    try {
      setError("");
      // No need to call API - just start scanning locally
      setCurrentStep("scan_items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleScan = async (qrCodeData: string, scanner: Html5Qrcode) => {
    const timestamp = new Date().toISOString();
    const timeMs = performance.now().toFixed(2);
    console.log(`[${timestamp}] [${timeMs}ms] Scan received`);

    // Prevent processing if already handling a scan (use ref for synchronous check)
    if (isProcessingScanRef.current) {
      console.log(`[${timestamp}] [${timeMs}ms] Already processing a scan, ignoring duplicate...`);
      return;
    }

    try {
      // Set processing flag immediately to block duplicate callbacks (synchronous!)
      isProcessingScanRef.current = true;

      // Pause scanner immediately to prevent duplicate scans
      console.log(`[${timestamp}] [${timeMs}ms] Pausing scanner to process scan...`);
      scanner.pause();

      setScanError("");

      // Parse QR code
      let parsedData: QRCodeData;
      try {
        parsedData = JSON.parse(qrCodeData);
      } catch (err) {
        setScanError("Invalid QR code format");
        playSound(false);
        return;
      }

      // Validate locally (instant, no network round-trip!)
      // Use ref to get current items (avoids stale closure)
      console.log(`[${timestamp}] [${timeMs}ms] Validating scan...`);
      console.log(`[${timestamp}] [${timeMs}ms] Unique Identifier:`, parsedData["Unique Identifier"]);
      console.log(`[${timestamp}] [${timeMs}ms] Current scanned items count:`, scannedItemsRef.current.length);
      console.log(`[${timestamp}] [${timeMs}ms] Existing identifiers:`, scannedItemsRef.current.map(i => i.uniqueIdentifier));

      const validation = validateScan(
        parsedData,
        selectedOrder as ClientOrder | null,
        scannedItemsRef.current  // Use ref instead of state to avoid stale closure
      );

      console.log(`[${timestamp}] [${timeMs}ms] Validation result:`, validation.valid ? 'PASS' : `FAIL - ${validation.error}`);

      // Open debug modal after every scan
      setDebugData({
        qrData: parsedData,
        validation: {
          valid: validation.valid,
          error: validation.error,
        },
      });
      setDebugModalOpen(true);

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

      setScannedItems((prev) => {
        const updated = [...prev, newItem];
        console.log(`[${timestamp}] [${timeMs}ms] Items array updated. New count:`, updated.length);
        return updated;
      });

      // Success - play success sound
      playSound(true);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to process scan");
      playSound(false);
    } finally {
      // Always resume scanning after processing, even if there was an error
      scanner.resume();
      // Reset processing flag to allow next scan (synchronous!)
      isProcessingScanRef.current = false;
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

  const handleClearSession = () => {
    if (!confirm("Are you sure you want to clear all scanned items?")) return;

    // Clear local state (no API call needed)
    setScannedItems([]);
    setScanError("");
  };

  const handleProceedToImage = async () => {
    if (scannedItems.length === 0) {
      setError("Please scan at least one item");
      return;
    }

    // Stop scanning to release camera
    if (isScanning) {
      setIsScanning(false);
    }

    // Wait for camera to be fully released before transitioning
    await new Promise(resolve => setTimeout(resolve, 500));

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
      // Step 1: Save scanned items to database in a single batch
      const batchResponse = await fetch("/api/stock/scan-session/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          orderId: selectedOrder?.id || null,
          scannedItems,
        }),
      });

      if (!batchResponse.ok) {
        const batchData = await batchResponse.json();
        throw new Error(batchData.error || "Failed to save scanned items");
      }

      // Step 2: Submit the stock movement
      const submitResponse = await fetch("/api/stock/scan-session/submit", {
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

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(submitData.error || "Failed to submit");
      }

      setSuccess(submitData.message);

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
    <div className="min-h-screen bg-gray-50">
      <div className="min-h-screen bg-white">
        <div className="container mx-auto max-w-2xl px-4 py-6">
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
          {/* Step 1: Select Order */}
          {currentStep === "select_order" && (
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Select Order</h1>

              <OrderCardSelector
                onOrderSelect={handleOrderSelect}
                selectedOrderId={selectedOrder?.id || null}
                onStartScanning={handleStartScanning}
              />
            </div>
          )}

          {/* Step 2: Scan Items */}
          {currentStep === "scan_items" && (
            <div className="space-y-4">
              {selectedOrder && (
                <button
                  onClick={() => setIsOrderDetailsOpen(true)}
                  className="w-full p-4 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-colors text-left"
                >
                  <p className="text-2xl font-bold text-blue-900">
                    Order #{selectedOrder.order_number} - {selectedOrder.customer_name}
                  </p>
                </button>
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
                items={aggregatedItems}
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

              {/* Bottom Sheet for Order Details in Scan Step */}
              {selectedOrder && (
                <BottomSheet
                  isOpen={isOrderDetailsOpen}
                  onClose={() => setIsOrderDetailsOpen(false)}
                >
                  <div className="space-y-6">
                    {/* Customer Name as Heading */}
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        {selectedOrder.customer_name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        #{selectedOrder.order_number}
                      </p>
                    </div>

                    {/* Item Details - Packing Slip Style */}
                    <div className="space-y-3 max-h-56 overflow-y-auto">
                      {selectedOrder.order_items.map((item: any) => {
                        const remaining = item.quantity - item.fulfilled_quantity;
                        return (
                          <div key={item.id}>
                            <p className="text-2xl font-medium text-gray-900">
                              {item.design}: {remaining} ({item.lot_number})
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setIsOrderDetailsOpen(false)}
                      className="w-full px-8 py-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold text-2xl shadow-lg"
                    >
                      Close
                    </button>
                  </div>
                </BottomSheet>
              )}

              {/* Debug Modal */}
              <DebugScanModal
                isOpen={debugModalOpen}
                onClose={() => setDebugModalOpen(false)}
                qrData={debugData.qrData}
                order={selectedOrder}
                validationResult={debugData.validation}
                scannedItems={scannedItems}
              />
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
                  {scannedItems.length} items scanned across {aggregatedItems.length} design{aggregatedItems.length !== 1 ? 's' : ''}
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
