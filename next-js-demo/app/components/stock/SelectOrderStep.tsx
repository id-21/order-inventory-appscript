"use client";

import OrderCardSelector from "@/app/components/stock/OrderCardSelector";

interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  created_at: string;
  order_items: any[];
}

interface SelectOrderStepProps {
  onOrderSelect: (order: Order | null) => void;
  selectedOrderId: string | null;
  onStartScanning: () => void;
}

export default function SelectOrderStep({
  onOrderSelect,
  selectedOrderId,
  onStartScanning,
}: SelectOrderStepProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Select Order</h1>

      <OrderCardSelector
        onOrderSelect={onOrderSelect}
        selectedOrderId={selectedOrderId}
        onStartScanning={onStartScanning}
      />
    </div>
  );
}