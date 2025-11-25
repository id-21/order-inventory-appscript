"use client";

import { useState, useEffect } from "react";
import BottomSheet from "@/app/components/ui/BottomSheet";

interface OrderItem {
  id: string;
  design: string;
  quantity: number;
  lot_number: string;
  fulfilled_quantity: number;
  status: string;
}

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderCardSelectorProps {
  onOrderSelect: (order: Order | null) => void;
  selectedOrderId: string | null;
  onStartScanning?: () => void;
}

export default function OrderCardSelector({
  onOrderSelect,
  selectedOrderId,
  onStartScanning,
}: OrderCardSelectorProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orders?status=PENDING");
      if (!response.ok) throw new Error("Failed to fetch orders");

      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    // Open bottom sheet to preview order details
    setPreviewOrder(order);
    setIsBottomSheetOpen(true);
  };

  const handleSelectAndStartScanning = () => {
    if (previewOrder) {
      onOrderSelect(previewOrder);
      setIsBottomSheetOpen(false);
      // Call the callback to start scanning
      if (onStartScanning) {
        onStartScanning();
      }
    }
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
    setPreviewOrder(null);
  };

  const handleCustomOrder = () => {
    onOrderSelect(null);
    // Auto-advance to scanning step
    if (onStartScanning) {
      onStartScanning();
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>

      {orders.length === 0 ? (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600 mb-4">No pending orders available</p>
          <button
            onClick={handleCustomOrder}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Continue with Custom Order
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-6">
            {orders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              const totalItems = order.order_items.reduce(
                (sum, item) => sum + item.quantity,
                0
              );
              const fulfilledItems = order.order_items.reduce(
                (sum, item) => sum + item.fulfilled_quantity,
                0
              );
              const remainingItems = totalItems - fulfilledItems;

              return (
                <button
                  key={order.id}
                  onClick={() => handleOrderClick(order)}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-3xl text-gray-900">
                        Order #{order.order_number}
                      </h4>
                      <p className="text-lg text-gray-600 mt-1">
                        {order.customer_name}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-base rounded-full">
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 bg-orange-100 text-orange-600 font-bold text-2xl rounded-lg">
                      Remaining: {remainingItems}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCustomOrder}
              className={`w-full px-8 py-6 rounded-lg border-2 transition-colors font-medium text-xl ${
                selectedOrderId === null
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              Continue without Order (Custom)
            </button>
          </div>
        </>
      )}

      {/* Bottom Sheet for Order Details */}
      <BottomSheet isOpen={isBottomSheetOpen} onClose={handleCloseBottomSheet}>
        {previewOrder && (
          <div className="space-y-6">
            {/* Customer Name as Heading */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {previewOrder.customer_name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                #{previewOrder.order_number}
              </p>
            </div>

            {/* Item Details - Packing Slip Style */}
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {previewOrder.order_items.map((item) => {
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

            {/* Start Scanning Button */}
            <button
              onClick={handleSelectAndStartScanning}
              className="w-full px-8 py-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-bold text-2xl shadow-lg"
            >
              Start Scanning This Order
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
