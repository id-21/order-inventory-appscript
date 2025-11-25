"use client";

interface AggregatedItem {
  design: string;
  lot: string;
  quantity: number;
  uniqueIdentifiers: string[];
}

interface ScannedItemsTableProps {
  items: AggregatedItem[];
  onClear: () => void;
}

export default function ScannedItemsTable({
  items,
  onClear,
}: ScannedItemsTableProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-gray-600">No items scanned yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Start scanning QR codes to add items
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Scanned Items
          </h3>
          <p className="text-sm text-gray-600">
            {items.length} unique item(s), {totalQuantity} total units
          </p>
        </div>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
        >
          Clear All
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Design/SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique IDs
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr
                  key={`${item.design}-${item.lot}-${index}`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.design}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.lot}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">
                      {item.quantity}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-blue-600 hover:text-blue-800">
                        View {item.uniqueIdentifiers.length} ID(s)
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                        {item.uniqueIdentifiers.map((id) => (
                          <div key={id} className="text-gray-700">
                            {id}
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900">Summary</h4>
            <p className="text-sm text-blue-700">
              Ready to submit {totalQuantity} item(s) across {items.length}{" "}
              design(s)
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">
              {totalQuantity}
            </div>
            <div className="text-xs text-blue-700">Total Units</div>
          </div>
        </div>
      </div>
    </div>
  );
}
