"use client";

import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QRScanner from "@/app/components/stock/QRScanner";
import ScannedItemsTable from "@/app/components/stock/ScannedItemsTable";
import BottomSheet from "@/app/components/ui/BottomSheet";
import DebugScanModal from "@/app/components/stock/DebugScanModal";
import DownloadLogsButton from "@/app/components/stock/DownloadLogsButton";
import {
  type QRCodeData,
  type ScannedItem,
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

interface ScanItemsStepProps {
  selectedOrder: Order | null;
  isScanning: boolean;
  setIsScanning: (isScanning: boolean) => void;
  handleScan: (qrCodeData: string, scanner: Html5Qrcode) => Promise<void>;
  scanError: string;
  aggregatedItems: AggregatedItem[];
  scannedItems: ScannedItem[];
  onClear: () => void;
  onDownloadLogs: () => void;
  onProceedToImage: () => void;
  onBack: () => void;
  debugData: {
    qrData: QRCodeData | null;
    validation: { valid: boolean; error?: string };
  };
}

export default function ScanItemsStep({
  selectedOrder,
  isScanning,
  setIsScanning,
  handleScan,
  scanError,
  aggregatedItems,
  scannedItems,
  onClear,
  onDownloadLogs,
  onProceedToImage,
  onBack,
  debugData,
}: ScanItemsStepProps) {
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [debugModalOpen, setDebugModalOpen] = useState(false);

  return (
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

      <ScannedItemsTable items={aggregatedItems} onClear={onClear} />

      <div className="flex flex-col gap-3">
        <DownloadLogsButton onClick={onDownloadLogs} />
        <button
          onClick={onProceedToImage}
          disabled={scannedItems.length === 0}
          className="w-full px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xl"
        >
          Continue
        </button>
        <button
          onClick={onBack}
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
  );
}