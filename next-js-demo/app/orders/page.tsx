"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchCustomer, setSearchCustomer] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = "/api/orders";
      const params = new URLSearchParams();

      if (filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch orders");

      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (searchCustomer) {
      return order.customer_name
        .toLowerCase()
        .includes(searchCustomer.toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">
              Manage and track customer orders
            </p>
          </div>
          <Link
            href="/orders/new"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-center"
          >
            + New Order
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Orders</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Customer
              </label>
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                placeholder="Enter customer name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No orders found</p>
            <Link
              href="/orders/new"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Create Your First Order
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Order #{order.order_number}
                    </h2>
                    <p className="text-gray-600">{order.customer_name}</p>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Order Items ({order.order_items.length})
                  </h3>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">
                            {item.design}
                          </span>
                          <span className="text-gray-500 ml-2">
                            (Lot: {item.lot_number})
                          </span>
                        </div>
                        <div className="mt-1 md:mt-0 flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Qty: {item.quantity}
                          </span>
                          {item.fulfilled_quantity > 0 && (
                            <span className="text-green-600">
                              Fulfilled: {item.fulfilled_quantity}
                            </span>
                          )}
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              item.status === "FULFILLED"
                                ? "bg-green-100 text-green-800"
                                : item.status === "PARTIALLY_FULFILLED"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Actions */}
                <div className="mt-4 pt-4 border-t flex gap-3">
                  <Link
                    href={`/stock/out?order=${order.order_number}`}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    Process Stock Out
                  </Link>
                  <button
                    onClick={() => fetchOrders()}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && filteredOrders.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">
              Showing {filteredOrders.length} order(s)
              {searchCustomer && ` matching "${searchCustomer}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
