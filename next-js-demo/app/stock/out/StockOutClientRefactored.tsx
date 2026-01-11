"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStockOutSession } from "@/lib/hooks/useStockOutSession";
import { useScanHandler } from "@/lib/hooks/useScanHandler";
import SelectOrderStep from "@/app/components/stock/SelectOrderStep";
import ScanItemsStep from "@/app/components/stock/ScanItemsStep";
import CaptureImageStep from "@/app/components/stock/CaptureImageStep";
import SubmitStep from "@/app/components/stock/SubmitStep";

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  created_at: string;
  order_items: any[];
}

type StepType = "select_order" | "scan_items" | "capture_image" | "submit";

export default function StockOutClientRefactored() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");

  // Use custom hooks for session and scan management
  const {
    sessionId,
    scannedItems,
    scannedItemsRef,
    aggregatedItems,
    addLog,
    addScannedItem,
    clearSession,
    downloadLogs,
    resetSession,
  } = useStockOutSession();

  const [currentStep, setCurrentStep] = useState<StepType>("select_order");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Use scan handler hook
  const { handleScan, scanError, setScanError, debugData } = useScanHandler({
    selectedOrder,
    scannedItemsRef,
    addLog,
    addScannedItem,
  });

  const handleOrderSelect = async (order: Order | null) => {
    setSelectedOrder(order);
    if (order) {
      addLog(`Order selected: #${order.order_number} - ${order.customer_name}`);
      setInvoiceNumber(order.order_number.toString());
    } else {
      addLog("Custom order mode selected (no order)");
      setInvoiceNumber("");
    }
  };

  const handleStartScanning = async () => {
    try {
      setError("");
      addLog("Starting scan session");
      setCurrentStep("scan_items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleProceedToImage = async () => {
    if (scannedItems.length === 0) {
      setError("Please scan at least one item");
      return;
    }

    addLog(`Proceeding to image capture with ${scannedItems.length} scanned items`);

    // Stop scanning to release camera by setting isScanning to false
    if (isScanning) {
      addLog("Stopping scanner...");
      setIsScanning(false);
    }

    // Wait for camera to be fully released before transitioning
    addLog("Waiting 1000ms for camera release...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addLog("Transitioning to image capture step");
    setCurrentStep("capture_image");
  };

  const handleProceedToSubmit = () => {
    addLog("Proceeding to submit step");
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

    addLog(`Submitting stock movement - Invoice: ${invoiceNumber}, Items: ${scannedItems.length}`);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Save scanned items to database in a single batch
      addLog("Sending batch request to save scanned items...");
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
        addLog(`Batch request failed: ${batchData.error}`);
        throw new Error(batchData.error || "Failed to save scanned items");
      }
      addLog("Batch request successful");

      // Step 2: Submit the stock movement
      addLog("Sending submit request...");
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
        addLog(`Submit request failed: ${submitData.error}`);
        throw new Error(submitData.error || "Failed to submit");
      }

      addLog("Submit successful! Stock movement created.");
      setSuccess(submitData.message);

      // Reset and redirect after success
      setTimeout(() => {
        router.push("/orders");
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit";
      addLog(`Submit error: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOrders = () => {
    setCurrentStep("select_order");
    setSelectedOrder(null);
    setCapturedImage("");
    setInvoiceNumber("");
    resetSession();
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
          {currentStep === "select_order" && (
            <SelectOrderStep
              onOrderSelect={handleOrderSelect}
              selectedOrderId={selectedOrder?.id || null}
              onStartScanning={handleStartScanning}
            />
          )}

          {currentStep === "scan_items" && (
            <ScanItemsStep
              selectedOrder={selectedOrder}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
              handleScan={handleScan}
              scanError={scanError}
              aggregatedItems={aggregatedItems}
              scannedItems={scannedItems}
              onClear={clearSession}
              onDownloadLogs={downloadLogs}
              onProceedToImage={handleProceedToImage}
              onBack={handleBackToOrders}
              debugData={debugData}
            />
          )}

          {currentStep === "capture_image" && (
            <CaptureImageStep
              capturedImage={capturedImage}
              setCapturedImage={setCapturedImage}
              onDownloadLogs={downloadLogs}
              onProceedToSubmit={handleProceedToSubmit}
              onBack={() => setCurrentStep("scan_items")}
            />
          )}

          {currentStep === "submit" && (
            <SubmitStep
              selectedOrder={selectedOrder}
              invoiceNumber={invoiceNumber}
              setInvoiceNumber={setInvoiceNumber}
              aggregatedItems={aggregatedItems}
              capturedImage={capturedImage}
              onClear={clearSession}
              onDownloadLogs={downloadLogs}
              onSubmit={handleSubmit}
              onBack={() => setCurrentStep("capture_image")}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}