"use client";

import { useState, useEffect } from "react";

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
}

export default function OrderCardSelector({
  onOrderSelect,
  selectedOrderId,
}: OrderCardSelectorProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    if (selectedOrderId === order.id) {
      onOrderSelect(null);
    } else {
      onOrderSelect(order);
    }
  };

  const handleCustomOrder = () => {
    onOrderSelect(null);
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
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Select Order
        </h3>
        <p className="text-sm text-gray-600">
          Choose an order to scan items, or continue with custom order
        </p>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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

              return (
                <button
                  key={order.id}
                  onClick={() => handleOrderClick(order)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">
                        Order #{order.order_number}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {order.customer_name}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fulfilled:</span>
                      <span className="font-medium text-green-600">
                        {fulfilledItems}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium text-orange-600">
                        {totalItems - fulfilledItems}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {order.order_items.length} line item(s)
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCustomOrder}
              className={`px-6 py-3 rounded-lg border-2 transition-colors font-medium ${
                selectedOrderId === null
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {selectedOrderId === null ? "✓ " : ""}Continue without Order
              (Custom)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
