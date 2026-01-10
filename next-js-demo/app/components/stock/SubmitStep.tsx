"use client";

import ScannedItemsTable from "@/app/components/stock/ScannedItemsTable";
import DownloadLogsButton from "@/app/components/stock/DownloadLogsButton";

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

interface SubmitStepProps {
  selectedOrder: Order | null;
  invoiceNumber: string;
  setInvoiceNumber: (value: string) => void;
  aggregatedItems: AggregatedItem[];
  capturedImage: string;
  onClear: () => void;
  onDownloadLogs: () => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export default function SubmitStep({
  selectedOrder,
  invoiceNumber,
  setInvoiceNumber,
  aggregatedItems,
  capturedImage,
  onClear,
  onDownloadLogs,
  onSubmit,
  onBack,
  loading,
}: SubmitStepProps) {
  return (
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

      {/* Order Items Table */}
      {selectedOrder && selectedOrder.order_items.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xl font-bold text-gray-900">Order Items</h4>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    SKU
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">
                    Lot
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">
                    Qty
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">
                    Fulfilled
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {selectedOrder.order_items.map((item: any) => {
                  // Check if this exact design+lot was scanned with matching quantity
                  const scannedMatch = aggregatedItems.find(
                    (scanned) =>
                      String(scanned.design) === String(item.design) &&
                      String(scanned.lot) === String(item.lot_number)
                  );
                  const isFulfilled =
                    scannedMatch && scannedMatch.quantity === item.quantity;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-xs font-medium text-gray-900">
                        {item.design}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-700">
                        {item.lot_number}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-green-100 text-green-700 font-bold text-xs rounded">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {isFulfilled ? (
                          <span className="text-xl text-green-600">✓</span>
                        ) : (
                          <span className="text-xl text-red-600">✗</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scanned Items Table */}
      <div className="space-y-2">
        <h4 className="text-xl font-bold text-gray-900">Scanned Items</h4>
        <ScannedItemsTable items={aggregatedItems} onClear={onClear} />
      </div>

      {/* Image Preview - Smaller */}
      {capturedImage && (
        <div>
          <h4 className="text-xl font-bold text-gray-900 mb-2">
            Proof of Shipment
          </h4>
          <img
            src={capturedImage}
            alt="Proof of shipment"
            className="w-full max-w-sm rounded-lg border-2 border-gray-300"
          />
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex flex-col gap-3">
        <DownloadLogsButton onClick={onDownloadLogs} disabled={loading} />
        <button
          onClick={onSubmit}
          disabled={loading || !invoiceNumber.trim()}
          className="w-full px-8 py-6 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-2xl"
        >
          {loading ? "Submitting..." : "Submit Stock Movement"}
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          className="text-center text-base text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          ← Back to scanning
        </button>
      </div>
    </div>
  );
}