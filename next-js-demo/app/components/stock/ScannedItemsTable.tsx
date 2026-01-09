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

  const handleViewJSON = (item: AggregatedItem) => {
    // Placeholder for modal - to be implemented later
    console.log("View JSON for item:", item);
  };

  if (items.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-sm text-gray-600">No items scanned yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Scanned Items
        </h3>
        <button
          onClick={onClear}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-xs"
        >
          Clear All
        </button>
      </div>

      {/* Compact Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">SKU</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Lot</th>
              <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Qty</th>
              <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">JSON</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item, index) => (
              <tr key={`${item.design}-${item.lot}-${index}`} className="hover:bg-gray-50">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{item.design}</td>
                <td className="px-2 py-1.5 text-xs text-gray-700">{item.lot}</td>
                <td className="px-2 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 bg-green-100 text-green-700 font-bold text-xs rounded">
                    {item.quantity}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => handleViewJSON(item)}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-1">
        <p className="text-sm font-bold text-gray-900">
          Total: {totalQuantity} items
        </p>
      </div>
    </div>
  );
}
