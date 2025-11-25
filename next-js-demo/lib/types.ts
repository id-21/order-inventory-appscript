/**
 * Shared TypeScript types for Order & Inventory Management System
 * Re-export from supabase-admin for consistency
 */

import type {
  User,
  Order,
  OrderItem,
  StockMovement,
  ScannedItem,
} from "./supabase-admin";

export type {
  User,
  Order,
  OrderItem,
  StockMovement,
  ScannedItem,
};

/**
 * QR Code data structure
 * Expected format from scanned QR codes
 */
export interface QRCodeData {
  Design: string;
  Lot: string;
  "Unique Identifier": string;
}

/**
 * Order creation form data
 */
export interface OrderFormData {
  customerName: string;
  orderDetails: Array<{
    design: string;
    quantity: number;
    lot: string;
  }>;
}

/**
 * Aggregated scanned items for display
 * Groups items by Design + Lot
 */
export interface AggregatedScannedItem {
  design: string;
  lot: string;
  quantity: number;
  uniqueIdentifiers: string[];
}

/**
 * Stock movement submission data
 */
export interface StockMovementSubmission {
  orderId: string | null;
  invoiceNumber: string;
  items: AggregatedScannedItem[];
  imageBase64: string;
  sessionId: string;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  userCount: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalStockMovements: number;
  stockOutCount: number;
  totalQuantityOut: number;
  completionRate: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Order with related data (for display)
 */
export interface OrderWithDetails extends Order {
  order_items?: OrderItem[];
  users?: {
    email: string;
    full_name: string | null;
  };
}

/**
 * Stock movement with related data (for display)
 */
export interface StockMovementWithDetails extends StockMovement {
  users?: {
    email: string;
    full_name: string | null;
  };
  orders?: {
    order_number: number;
    customer_name: string;
  } | null;
}

/**
 * Filter options for orders
 */
export interface OrderFilters {
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
  customerName?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Filter options for stock movements
 */
export interface StockMovementFilters {
  movementType?: "OUT" | "IN" | "ADJUSTMENT" | "CUSTOM";
  startDate?: string;
  endDate?: string;
  orderId?: string;
}

/**
 * Scan session state
 */
export interface ScanSession {
  sessionId: string;
  orderId: string | null;
  orderNumber: number | null;
  customerName: string | null;
  isCustomOrder: boolean;
  scannedCount: number;
}
