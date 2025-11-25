"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StockMovement {
  id: string;
  order_id: string | null;
  invoice_number: string;
  design: string;
  quantity: number;
  lot_number: string;
  unique_identifiers: string[];
  image_url: string | null;
  movement_type: string;
  status: string;
  created_at: string;
}

export default function StockHistoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stock/movements");
      if (!response.ok) throw new Error("Failed to fetch movements");

      const data = await response.json();
      setMovements(data.movements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load movements");
    } finally {
      setLoading(false);
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

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "OUT":
        return "bg-red-100 text-red-800 border-red-300";
      case "IN":
        return "bg-green-100 text-green-800 border-green-300";
      case "CUSTOM":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "ADJUSTMENT":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Group movements by invoice number
  const groupedMovements = movements.reduce((acc, movement) => {
    if (!acc[movement.invoice_number]) {
      acc[movement.invoice_number] = [];
    }
    acc[movement.invoice_number].push(movement);
    return acc;
  }, {} as Record<string, StockMovement[]>);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Stock Movement History
            </h1>
            <p className="text-gray-600 mt-1">
              View all stock out transactions and movements
            </p>
          </div>
          <Link
            href="/stock/out"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-center"
          >
            + New Stock Out
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Movements List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading movements...</p>
          </div>
        ) : Object.keys(groupedMovements).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No movements found</p>
            <Link
              href="/stock/out"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Create Your First Stock Movement
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMovements).map(
              ([invoiceNumber, invoiceMovements]) => {
                const firstMovement = invoiceMovements[0];
                const totalQuantity = invoiceMovements.reduce(
                  (sum, m) => sum + m.quantity,
                  0
                );

                return (
                  <div
                    key={invoiceNumber}
                    className="bg-white rounded-lg shadow-md p-6"
                  >
                    {/* Movement Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 pb-4 border-b">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Invoice #{invoiceNumber}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {formatDate(firstMovement.created_at)}
                        </p>
                      </div>
                      <div className="mt-2 md:mt-0 flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${getMovementTypeColor(
                            firstMovement.movement_type
                          )}`}
                        >
                          {firstMovement.movement_type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {invoiceMovements.length} item type(s)
                        </span>
                      </div>
                    </div>

                    {/* Movement Items */}
                    <div className="space-y-3">
                      {invoiceMovements.map((movement) => (
                        <div
                          key={movement.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-4 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {movement.design}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Lot: {movement.lot_number}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              Quantity: {movement.quantity} unit(s)
                            </div>
                          </div>

                          <div className="mt-2 md:mt-0 flex items-center gap-3">
                            {movement.unique_identifiers &&
                              movement.unique_identifiers.length > 0 && (
                                <details className="cursor-pointer">
                                  <summary className="text-sm text-blue-600 hover:text-blue-800">
                                    View UIDs ({movement.unique_identifiers.length})
                                  </summary>
                                  <div className="mt-2 p-2 bg-white rounded text-xs space-y-1 max-h-40 overflow-y-auto">
                                    {movement.unique_identifiers.map((uid) => (
                                      <div key={uid} className="text-gray-700">
                                        {uid}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}

                            {movement.image_url && (
                              <button
                                onClick={() => setSelectedImage(movement.image_url)}
                                className="text-sm text-green-600 hover:text-green-800 font-medium"
                              >
                                📷 View Image
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Total: <span className="font-semibold">{totalQuantity}</span> units
                        across {invoiceMovements.length} design(s)
                      </div>
                      {firstMovement.order_id && (
                        <Link
                          href="/orders"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Related Order →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && movements.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">Total Movements</div>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(groupedMovements).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-2xl font-bold text-gray-900">
                {movements.length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">Total Quantity</div>
              <div className="text-2xl font-bold text-gray-900">
                {movements.reduce((sum, m) => sum + m.quantity, 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl w-full">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Proof of Shipment</h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
              <img
                src={selectedImage}
                alt="Proof of shipment"
                className="w-full rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
