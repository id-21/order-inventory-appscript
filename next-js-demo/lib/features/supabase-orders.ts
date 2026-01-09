import { supabaseAdmin } from "../supabase-admin";
import { Database } from "../supabase";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"];

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface CreateOrderData {
  customerName: string;
  orderDetails: {
    Design: string;
    Qty: number;
    Lot: string;
  }[];
}

/**
 * Get the next available order number
 */
export async function getNextOrderNumber(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("order_number")
    .order("order_number", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (first order)
    console.error("Error fetching next order number:", error);
    throw new Error("Failed to get next order number");
  }

  return data ? data.order_number + 1 : 1;
}

/**
 * Create a new order with line items
 */
export async function createOrder(
  orderData: CreateOrderData,
  userId: string
): Promise<OrderWithItems> {
  // Get next order number
  const orderNumber = await getNextOrderNumber();

  // Prepare order JSON
  const orderJson = {
    express: orderNumber,
    customerName: orderData.customerName,
    orderDetails: orderData.orderDetails,
  };

  // Insert order
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_name: orderData.customerName,
      status: "PENDING",
      order_json: orderJson,
      created_by: userId,
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    throw new Error("Failed to create order");
  }

  // Insert order items
  const orderItems: OrderItemInsert[] = orderData.orderDetails.map((item) => ({
    order_id: order.id,
    design: item.Design,
    quantity: item.Qty,
    lot_number: item.Lot,
    status: "PENDING",
    fulfilled_quantity: 0,
  }));

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .insert(orderItems)
    .select();

  if (itemsError) {
    // Rollback order creation if items fail
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    console.error("Error creating order items:", itemsError);
    throw new Error("Failed to create order items");
  }

  return {
    ...order,
    order_items: items,
  };
}

/**
 * Get all orders with optional filters
 */
export async function getOrders(filters?: {
  userId?: string;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
  customerName?: string;
  limit?: number;
  offset?: number;
}): Promise<OrderWithItems[]> {
  let query = supabaseAdmin
    .from("orders")
    .select(
      `
      *,
      order_items (*)
    `
    )
    .order("created_at", { ascending: false });


  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.customerName) {
    query = query.ilike("customer_name", `%${filters.customerName}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching orders:", error);
    throw new Error("Failed to fetch orders");
  }

  return data as OrderWithItems[];
}

/**
 * Get a single order by ID
 */
export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      *,
      order_items (*)
    `
    )
    .eq("id", orderId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching order:", error);
    throw new Error("Failed to fetch order");
  }

  return data as OrderWithItems;
}

/**
 * Get a single order by order number
 */
export async function getOrderByNumber(orderNumber: number): Promise<OrderWithItems | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      *,
      order_items (*)
    `
    )
    .eq("order_number", orderNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching order:", error);
    throw new Error("Failed to fetch order");
  }

  return data as OrderWithItems;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: "PENDING" | "COMPLETED" | "CANCELLED"
): Promise<Order> {
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
    throw new Error("Failed to update order status");
  }

  return data;
}

/**
 * Delete/Cancel an order
 */
export async function deleteOrder(orderId: string): Promise<void> {
  // Instead of deleting, we'll mark as cancelled
  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      status: "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("Error cancelling order:", error);
    throw new Error("Failed to cancel order");
  }
}

/**
 * Get order items for a specific order
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (error) {
    console.error("Error fetching order items:", error);
    throw new Error("Failed to fetch order items");
  }

  return data;
}

/**
 * Update order item status and fulfilled quantity
 */
export async function updateOrderItemStatus(
  itemId: string,
  status: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED",
  fulfilledQty: number
): Promise<OrderItem> {
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .update({
      status,
      fulfilled_quantity: fulfilledQty,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    console.error("Error updating order item:", error);
    throw new Error("Failed to update order item");
  }

  return data;
}

/**
 * Get pending orders (for stock out selection)
 */
export async function getPendingOrders(): Promise<OrderWithItems[]> {
  return getOrders({ status: "PENDING" });
}
