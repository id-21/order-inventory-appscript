"use client";

import { QRCodeData, ScannedItem } from "@/lib/features/client-scan-validation";

interface DebugScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: QRCodeData | null;
  order: any | null;
  validationResult: {
    valid: boolean;
    error?: string;
  };
  scannedItems: ScannedItem[];
}

export default function DebugScanModal({
  isOpen,
  onClose,
  qrData,
  order,
  validationResult,
  scannedItems,
}: DebugScanModalProps) {
  if (!isOpen || !qrData) return null;

  const getType = (value: any) => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    return typeof value;
  };

  // Calculate how many items have been scanned in this session for a specific design+lot
  const getScannedCount = (design: string, lot: string) => {
    return scannedItems.filter(
      (item) => String(item.design) === String(design) && String(item.lot) === String(lot)
    ).length;
  };

  const findClosestMatch = () => {
    if (!order || !order.order_items) return null;

    for (const item of order.order_items) {
      const designMatch = String(item.design) === String(qrData.Design);
      const lotMatch = String(item.lot_number) === String(qrData.Lot);

      if (designMatch && lotMatch) {
        return { item, designMatch: true, lotMatch: true };
      }
    }

    // Find partial matches
    for (const item of order.order_items) {
      const designMatch = String(item.design) === String(qrData.Design);
      if (designMatch) {
        return { item, designMatch: true, lotMatch: false };
      }
    }

    return { item: order.order_items[0], designMatch: false, lotMatch: false };
  };

  const closest = order ? findClosestMatch() : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Debug Scan Data
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Validation Result */}
          <div
            className={`p-4 rounded-lg ${
              validationResult.valid
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p
              className={`font-bold ${
                validationResult.valid ? "text-green-700" : "text-red-700"
              }`}
            >
              {validationResult.valid ? "✓ Valid" : "✗ Invalid"}
            </p>
            {validationResult.error && (
              <p className="text-red-600 mt-1">{validationResult.error}</p>
            )}
          </div>

          {/* Raw QR Code Data */}
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">Scanned QR Code Data</h3>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-gray-600">Raw JSON:</span>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(qrData, null, 2)}
                </pre>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="font-bold text-gray-700">Field</div>
                <div className="font-bold text-gray-700">Value</div>
                <div className="font-bold text-gray-700">Type</div>

                <div>Design:</div>
                <div className="break-all">{String(qrData.Design)}</div>
                <div className="text-blue-600">{getType(qrData.Design)}</div>

                <div>Lot:</div>
                <div className="break-all">{String(qrData.Lot)}</div>
                <div className="text-blue-600">{getType(qrData.Lot)}</div>

                <div>Unique ID:</div>
                <div className="break-all">
                  {String(qrData["Unique Identifier"])}
                </div>
                <div className="text-blue-600">
                  {getType(qrData["Unique Identifier"])}
                </div>
              </div>
            </div>
          </div>

          {/* Order Comparison */}
          {order && closest && (
            <div className="border border-gray-300 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">
                Order Comparison (Order #{order.order_number})
              </h3>

              {/* Comparison Table */}
              <div className="mb-4">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2">Field</th>
                      <th className="text-left py-2">Scanned (Type)</th>
                      <th className="text-left py-2">Order (Type)</th>
                      <th className="text-center py-2">Match?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 font-bold">Design</td>
                      <td className="py-2">
                        {String(qrData.Design)}
                        <span className="text-blue-600 ml-2">
                          ({getType(qrData.Design)})
                        </span>
                      </td>
                      <td className="py-2">
                        {String(closest.item.design)}
                        <span className="text-blue-600 ml-2">
                          ({getType(closest.item.design)})
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        {closest.designMatch ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-red-600 font-bold">✗</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 font-bold">Lot</td>
                      <td className="py-2">
                        {String(qrData.Lot)}
                        <span className="text-blue-600 ml-2">
                          ({getType(qrData.Lot)})
                        </span>
                      </td>
                      <td className="py-2">
                        {String(closest.item.lot_number)}
                        <span className="text-blue-600 ml-2">
                          ({getType(closest.item.lot_number)})
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        {closest.lotMatch ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-red-600 font-bold">✗</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Type Coercion Tests */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h4 className="font-bold mb-2">Type Coercion Tests:</h4>
                <div className="space-y-1 text-sm font-mono">
                  <div>
                    String comparison (Design):{" "}
                    <span
                      className={
                        String(qrData.Design) === String(closest.item.design)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {String(qrData.Design) === String(closest.item.design)
                        ? "✓ Match"
                        : "✗ No match"}
                    </span>
                  </div>
                  <div>
                    String comparison (Lot):{" "}
                    <span
                      className={
                        String(qrData.Lot) === String(closest.item.lot_number)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {String(qrData.Lot) === String(closest.item.lot_number)
                        ? "✓ Match"
                        : "✗ No match"}
                    </span>
                  </div>
                  <div>
                    Strict equality (Design):{" "}
                    <span
                      className={
                        qrData.Design === closest.item.design
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {qrData.Design === closest.item.design
                        ? "✓ Match"
                        : "✗ No match"}
                    </span>
                  </div>
                  <div>
                    Strict equality (Lot):{" "}
                    <span
                      className={
                        qrData.Lot === closest.item.lot_number
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {qrData.Lot === closest.item.lot_number
                        ? "✓ Match"
                        : "✗ No match"}
                    </span>
                  </div>
                </div>
              </div>

              {/* All Order Items */}
              <div className="mt-4">
                <h4 className="font-bold mb-2">All Order Items:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {order.order_items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 rounded text-sm font-mono"
                    >
                      <div>
                        Design: {String(item.design)} ({getType(item.design)})
                      </div>
                      <div>
                        Lot: {String(item.lot_number)} (
                        {getType(item.lot_number)})
                      </div>
                      <div>
                        Quantity: {item.quantity} / Fulfilled:{" "}
                        {item.fulfilled_quantity} / Scanned this session:{" "}
                        <span className="font-bold text-blue-600">
                          {getScannedCount(item.design, item.lot_number)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!order && (
            <div className="border border-gray-300 rounded-lg p-4">
              <p className="text-gray-600">
                No order selected - scanning in custom mode
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
