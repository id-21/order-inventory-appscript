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
      <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-base text-gray-600">No items scanned yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Scanned Items
        </h3>
        <button
          onClick={onClear}
          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.design}-${item.lot}-${index}`}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
          >
            <span className="text-base font-medium text-gray-900">
              {item.design}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xl rounded-lg">
              {item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <p className="text-xl font-bold text-gray-900">
          Total: {totalQuantity} items
        </p>
      </div>
    </div>
  );
}
