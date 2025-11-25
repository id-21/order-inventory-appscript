"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OrderItem {
  Design: string;
  Qty: number;
  Lot: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { Design: "", Qty: 1, Lot: "" },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch next order number on mount
  useEffect(() => {
    fetchNextOrderNumber();
  }, []);

  const fetchNextOrderNumber = async () => {
    try {
      const response = await fetch("/api/orders/next-id");
      if (!response.ok) throw new Error("Failed to fetch order number");
      const data = await response.json();
      setNextOrderNumber(data.orderNumber);
    } catch (err) {
      console.error("Error fetching next order number:", err);
      setError("Failed to load order number");
    }
  };

  const handleAddRow = () => {
    setOrderItems([...orderItems, { Design: "", Qty: 1, Lot: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    if (orderItems.length > 1) {
      const newItems = orderItems.filter((_, i) => i !== index);
      setOrderItems(newItems);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    const newItems = [...orderItems];
    if (field === "Qty") {
      newItems[index][field] = Number(value);
    } else {
      newItems[index][field] = value as string;
    }
    setOrderItems(newItems);
  };

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      setError("Customer name is required");
      return false;
    }

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      if (!item.Design.trim()) {
        setError(`Design is required for item ${i + 1}`);
        return false;
      }
      if (!item.Qty || item.Qty <= 0) {
        setError(`Quantity must be greater than 0 for item ${i + 1}`);
        return false;
      }
      if (!item.Lot.trim()) {
        setError(`Lot number is required for item ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          orderDetails: orderItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      setSuccess(data.message);

      // Reset form
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Order</h1>
            {nextOrderNumber !== null && (
              <p className="text-lg text-gray-600 mt-1">
                Order #{nextOrderNumber}
              </p>
            )}
          </div>
          <Link
            href="/orders"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Orders
          </Link>
        </div>

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

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Customer Name */}
          <div className="mb-6">
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter customer name"
              disabled={loading}
            />
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Order Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddRow}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Design/SKU
                    </label>
                    <input
                      type="text"
                      value={item.Design}
                      onChange={(e) =>
                        handleItemChange(index, "Design", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., SKU-123"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={item.Qty}
                      onChange={(e) =>
                        handleItemChange(index, "Qty", e.target.value)
                      }
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Lot Number
                    </label>
                    <input
                      type="text"
                      value={item.Lot}
                      onChange={(e) =>
                        handleItemChange(index, "Lot", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., LOT-456"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={loading || orderItems.length === 1}
                      className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Remove item"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Total items: {orderItems.length}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {loading ? "Creating Order..." : "Create Order"}
            </button>
            <Link
              href="/orders"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-lg text-center"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Quick Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Fill in customer name and at least one order item</li>
            <li>• Click "+ Add Item" to add more line items</li>
            <li>• All fields are required</li>
            <li>• Order number is auto-generated</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
