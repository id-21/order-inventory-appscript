import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client (Service Role)
 * Bypasses Row Level Security for administrative operations
 * IMPORTANT: Only use on server-side (never expose service role key to client)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Database types based on new schema
 */
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  order_json: {
    express: number;
    customerName: string;
    orderDetails: Array<{
      Design: string;
      Qty: number;
      Lot: string;
    }>;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  design: string;
  quantity: number;
  lot_number: string;
  fulfilled_quantity: number;
  status: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED";
  created_at: string;
}

export interface StockMovement {
  id: string;
  order_id: string | null;
  invoice_number: string;
  design: string;
  quantity: number;
  lot_number: string;
  unique_identifiers: string[];
  image_url: string | null;
  movement_type: "OUT" | "IN" | "ADJUSTMENT" | "CUSTOM";
  status: "COMPLETED" | "CANCELLED";
  session_json: any;
  created_by: string;
  created_at: string;
}

export interface ScannedItem {
  id: string;
  session_id: string;
  user_id: string;
  order_id: string | null;
  design: string;
  lot_number: string;
  unique_identifier: string;
  is_processed: boolean;
  scanned_at: string;
}

// =====================================================
// USER MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Create a new user in the database
 * Called after Clerk signup to sync user data
 * Uses service role client to bypass RLS (prevents infinite recursion)
 */
export async function createUser(
  clerkUserId: string,
  email: string,
  fullName?: string
) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: clerkUserId,
      email,
      full_name: fullName || null,
      role: "user", // Default role
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  return data as User;
}

/**
 * Get user by Clerk ID
 * Cached to prevent multiple database queries within same request
 * Uses service role client to bypass RLS (prevents infinite recursion)
 */
export const getUserById = cache(async (clerkUserId: string) => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", clerkUserId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data as User;
});

/**
 * Check if user is an admin
 * Cached to prevent multiple database queries within same request
 */
export const isUserAdmin = cache(async (clerkUserId: string): Promise<boolean> => {
  const user = await getUserById(clerkUserId);
  return user?.role === "admin" && user?.is_active === true;
});

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  return data as User[];
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: "user" | "admin") {
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user role:", error);
    throw error;
  }

  return data as User;
}

/**
 * Update user active status
 */
export async function updateUserStatus(userId: string, isActive: boolean) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user status:", error);
    throw error;
  }

  return data as User;
}

// =====================================================
// ORDER MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get all orders (admin only)
 */
export async function getAllOrders() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      users:created_by (
        email,
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }

  return data;
}

/**
 * Get orders by status (admin only)
 */
export async function getOrdersByStatus(status: "PENDING" | "COMPLETED" | "CANCELLED") {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      users:created_by (
        email,
        full_name
      )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders by status:", error);
    throw error;
  }

  return data;
}

/**
 * Get order by ID with items (admin only)
 */
export async function getOrderById(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items (*),
      users:created_by (
        email,
        full_name
      )
    `)
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching order:", error);
    throw error;
  }

  return data;
}

/**
 * Update order status (admin only)
 */
export async function updateOrderStatus(
  orderId: string,
  status: "PENDING" | "COMPLETED" | "CANCELLED"
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "COMPLETED") {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }

  return data;
}

// =====================================================
// STOCK MOVEMENT FUNCTIONS
// =====================================================

/**
 * Get all stock movements (admin only)
 */
export async function getAllStockMovements() {
  const { data, error } = await supabaseAdmin
    .from("stock_movements")
    .select(`
      *,
      users:created_by (
        email,
        full_name
      ),
      orders:order_id (
        order_number,
        customer_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock movements:", error);
    throw error;
  }

  return data;
}

/**
 * Get stock movements by order ID (admin only)
 */
export async function getStockMovementsByOrderId(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("stock_movements")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock movements:", error);
    throw error;
  }

  return data;
}

/**
 * Get stock movements by date range (admin only)
 */
export async function getStockMovementsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabaseAdmin
    .from("stock_movements")
    .select(`
      *,
      users:created_by (
        email,
        full_name
      ),
      orders:order_id (
        order_number,
        customer_name
      )
    `)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock movements:", error);
    throw error;
  }

  return data;
}

// =====================================================
// DASHBOARD STATISTICS FUNCTIONS
// =====================================================

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  // Get user count
  const { count: userCount, error: userError } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  // Get order counts by status
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("status");

  // Get stock movement stats
  const { data: stockMovements, error: stockError } = await supabaseAdmin
    .from("stock_movements")
    .select("movement_type, quantity");

  if (userError || ordersError || stockError) {
    console.error("Error fetching stats:", {
      userError,
      ordersError,
      stockError,
    });
    throw userError || ordersError || stockError;
  }

  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "PENDING").length || 0;
  const completedOrders = orders?.filter((o) => o.status === "COMPLETED").length || 0;
  const cancelledOrders = orders?.filter((o) => o.status === "CANCELLED").length || 0;

  const totalStockMovements = stockMovements?.length || 0;
  const stockOutCount = stockMovements?.filter((s) => s.movement_type === "OUT").length || 0;
  const totalQuantityOut = stockMovements
    ?.filter((s) => s.movement_type === "OUT")
    .reduce((sum, s) => sum + s.quantity, 0) || 0;

  return {
    userCount: userCount || 0,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalStockMovements,
    stockOutCount,
    totalQuantityOut,
    completionRate: totalOrders > 0
      ? ((completedOrders / totalOrders) * 100).toFixed(1)
      : "0",
  };
}

/**
 * Get order statistics by user
 */
export async function getOrderStatsByUser(userId: string) {
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("status, created_at")
    .eq("created_by", userId);

  if (error) {
    console.error("Error fetching user order stats:", error);
    throw error;
  }

  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "PENDING").length || 0;
  const completedOrders = orders?.filter((o) => o.status === "COMPLETED").length || 0;

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
  };
}

/**
 * Get inventory summary by design and lot
 */
export async function getInventorySummary() {
  const { data, error } = await supabaseAdmin
    .from("stock_movements")
    .select("design, lot_number, quantity, movement_type");

  if (error) {
    console.error("Error fetching inventory summary:", error);
    throw error;
  }

  // Aggregate by design and lot
  const summary = new Map<string, { design: string; lot: string; totalOut: number; totalIn: number }>();

  data?.forEach((movement) => {
    const key = `${movement.design}:${movement.lot_number}`;
    if (!summary.has(key)) {
      summary.set(key, {
        design: movement.design,
        lot: movement.lot_number,
        totalOut: 0,
        totalIn: 0,
      });
    }

    const item = summary.get(key)!;
    if (movement.movement_type === "OUT") {
      item.totalOut += movement.quantity;
    } else if (movement.movement_type === "IN") {
      item.totalIn += movement.quantity;
    }
  });

  return Array.from(summary.values());
}
