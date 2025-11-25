import { Suspense } from "react";
import StockOutClient from "./StockOutClient";

export default function StockOutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>}>
      <StockOutClient />
    </Suspense>
  );
}
