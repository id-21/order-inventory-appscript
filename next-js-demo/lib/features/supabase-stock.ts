import { supabaseAdmin } from "../supabase-admin";
import { Database } from "../supabase";
import { getOrderById, updateOrderStatus, updateOrderItemStatus } from "./supabase-orders";

type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
type StockMovementInsert = Database["public"]["Tables"]["stock_movements"]["Insert"];
type ScannedItem = Database["public"]["Tables"]["scanned_items"]["Row"];
type ScannedItemInsert = Database["public"]["Tables"]["scanned_items"]["Insert"];

export interface QRCodeData {
  Design: string;
  Lot: string;
  "Unique Identifier": string;
}

export interface AggregatedStockItem {
  design: string;
  lot: string;
  quantity: number;
  uniqueIdentifiers: string[];
}

export interface ScanSessionData {
  sessionId: string;
  userId: string;
  orderId: string | null;
  orderNumber: number | null;
}

/**
 * Start a new scan session
 */
export async function startScanSession(
  userId: string,
  orderId: string | null,
  sessionId: string
): Promise<void> {
  // Clear any existing incomplete sessions for this user
  await clearUserIncompleteSessions(userId);
}

/**
 * Clear incomplete sessions for a user
 */
async function clearUserIncompleteSessions(userId: string): Promise<void> {
  await supabaseAdmin
    .from("scanned_items")
    .delete()
    .eq("user_id", userId)
    .eq("is_processed", false);
}

/**
 * Add a scanned item to the session
 */
export async function addScannedItem(
  sessionId: string,
  userId: string,
  qrData: QRCodeData,
  orderId: string | null
): Promise<ScannedItem> {
  const itemData: ScannedItemInsert = {
    session_id: sessionId,
    user_id: userId,
    order_id: orderId,
    design: qrData.Design,
    lot_number: qrData.Lot,
    unique_identifier: qrData["Unique Identifier"],
    is_processed: false,
  };

  const { data, error } = await supabaseAdmin
    .from("scanned_items")
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error("Error adding scanned item:", error);
    throw new Error("Failed to add scanned item");
  }

  return data;
}

/**
 * Get all scanned items for a session (aggregated by Design + Lot)
 */
export async function getScannedItems(sessionId: string): Promise<AggregatedStockItem[]> {
  const { data, error } = await supabaseAdmin
    .from("scanned_items")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_processed", false);

  if (error) {
    console.error("Error fetching scanned items:", error);
    throw new Error("Failed to fetch scanned items");
  }

  // Aggregate by Design + Lot
  const aggregated = new Map<string, AggregatedStockItem>();

  data.forEach((item) => {
    const key = `${item.design}|||${item.lot_number}`;
    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.quantity++;
      existing.uniqueIdentifiers.push(item.unique_identifier);
    } else {
      aggregated.set(key, {
        design: item.design,
        lot: item.lot_number,
        quantity: 1,
        uniqueIdentifiers: [item.unique_identifier],
      });
    }
  });

  return Array.from(aggregated.values());
}

/**
 * Clear scan session
 */
export async function clearScanSession(sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("scanned_items")
    .delete()
    .eq("session_id", sessionId)
    .eq("is_processed", false);

  if (error) {
    console.error("Error clearing scan session:", error);
    throw new Error("Failed to clear scan session");
  }
}

/**
 * Validate QR code against order
 */
export async function validateQRCode(
  qrData: QRCodeData,
  orderId: string | null
): Promise<{ valid: boolean; message?: string }> {
  // Basic validation
  if (!qrData.Design || !qrData.Lot || !qrData["Unique Identifier"]) {
    return {
      valid: false,
      message: "Invalid QR code format. Missing required fields.",
    };
  }

  // If order is specified, validate against order items
  if (orderId) {
    const order = await getOrderById(orderId);
    if (!order) {
      return {
        valid: false,
        message: "Order not found",
      };
    }

    // Check if Design + Lot combination exists in order
    const matchingItem = order.order_items.find(
      (item) => item.design === qrData.Design && item.lot_number === qrData.Lot
    );

    if (!matchingItem) {
      return {
        valid: false,
        message: `Item ${qrData.Design} (Lot: ${qrData.Lot}) is not in this order`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check for duplicate scan in session
 */
export async function checkDuplicateScan(
  sessionId: string,
  uniqueId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("scanned_items")
    .select("id")
    .eq("session_id", sessionId)
    .eq("unique_identifier", uniqueId)
    .eq("is_processed", false)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking duplicate:", error);
    return false;
  }

  return !!data;
}

/**
 * Check quantity limit for order
 */
export async function checkQuantityLimit(
  orderId: string,
  design: string,
  lot: string,
  sessionId: string
): Promise<{ withinLimit: boolean; message?: string; current: number; max: number }> {
  const order = await getOrderById(orderId);
  if (!order) {
    return {
      withinLimit: false,
      message: "Order not found",
      current: 0,
      max: 0,
    };
  }

  const matchingItem = order.order_items.find(
    (item) => item.design === design && item.lot_number === lot
  );

  if (!matchingItem) {
    return {
      withinLimit: false,
      message: `Item not found in order`,
      current: 0,
      max: 0,
    };
  }

  // Count scanned items for this Design + Lot in session
  const { data, error } = await supabaseAdmin
    .from("scanned_items")
    .select("id")
    .eq("session_id", sessionId)
    .eq("design", design)
    .eq("lot_number", lot)
    .eq("is_processed", false);

  if (error) {
    console.error("Error checking quantity:", error);
    return {
      withinLimit: false,
      message: "Error checking quantity",
      current: 0,
      max: matchingItem.quantity,
    };
  }

  const currentCount = data.length;
  const maxQuantity = matchingItem.quantity - matchingItem.fulfilled_quantity;

  if (currentCount >= maxQuantity) {
    return {
      withinLimit: false,
      message: `Quantity limit reached for ${design}. Max: ${maxQuantity}, Current: ${currentCount}`,
      current: currentCount,
      max: maxQuantity,
    };
  }

  return {
    withinLimit: true,
    current: currentCount,
    max: maxQuantity,
  };
}

/**
 * Create stock movement from scan session
 */
export async function createStockMovement(
  sessionId: string,
  userId: string,
  orderId: string | null,
  invoiceNumber: string,
  imageUrl: string | null,
  movementType: "OUT" | "IN" | "ADJUSTMENT" | "CUSTOM" = "OUT"
): Promise<StockMovement[]> {
  // Get aggregated items
  const aggregatedItems = await getScannedItems(sessionId);

  if (aggregatedItems.length === 0) {
    throw new Error("No items scanned");
  }

  // Get all scanned items for session JSON
  const { data: sessionItems } = await supabaseAdmin
    .from("scanned_items")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_processed", false);

  const sessionJson = {
    sessionId,
    scannedAt: new Date().toISOString(),
    items: sessionItems,
  };

  // Create stock movements for each aggregated item
  const movements: StockMovementInsert[] = aggregatedItems.map((item) => ({
    order_id: orderId,
    invoice_number: invoiceNumber,
    design: item.design,
    quantity: item.quantity,
    lot_number: item.lot,
    unique_identifiers: item.uniqueIdentifiers,
    image_url: imageUrl,
    movement_type: movementType,
    status: "COMPLETED",
    session_json: sessionJson,
    created_by: userId,
  }));

  const { data, error } = await supabaseAdmin
    .from("stock_movements")
    .insert(movements)
    .select();

  if (error) {
    console.error("Error creating stock movements:", error);
    throw new Error("Failed to create stock movements");
  }

  // Mark scanned items as processed
  await supabaseAdmin
    .from("scanned_items")
    .update({ is_processed: true })
    .eq("session_id", sessionId)
    .eq("is_processed", false);

  // Update order if applicable
  if (orderId) {
    await updateOrderAfterStock(orderId);
  }

  return data;
}

/**
 * Update order status and item fulfillment after stock movement
 */
async function updateOrderAfterStock(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) return;

  // Get all stock movements for this order
  const { data: movements } = await supabaseAdmin
    .from("stock_movements")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "COMPLETED");

  if (!movements) return;

  // Update each order item's fulfilled quantity
  for (const item of order.order_items) {
    const itemMovements = movements.filter(
      (m) => m.design === item.design && m.lot_number === item.lot_number
    );

    const totalFulfilled = itemMovements.reduce((sum, m) => sum + m.quantity, 0);

    let itemStatus: "PENDING" | "PARTIALLY_FULFILLED" | "FULFILLED" = "PENDING";
    if (totalFulfilled >= item.quantity) {
      itemStatus = "FULFILLED";
    } else if (totalFulfilled > 0) {
      itemStatus = "PARTIALLY_FULFILLED";
    }

    await updateOrderItemStatus(item.id, itemStatus, totalFulfilled);
  }

  // Check if all items are fulfilled
  const updatedOrder = await getOrderById(orderId);
  if (updatedOrder) {
    const allFulfilled = updatedOrder.order_items.every(
      (item) => item.status === "FULFILLED"
    );

    if (allFulfilled) {
      await updateOrderStatus(orderId, "COMPLETED");
    }
  }
}

/**
 * Get stock movements with filters
 */
export async function getStockMovements(filters?: {
  userId?: string;
  orderId?: string;
  status?: "COMPLETED" | "CANCELLED";
  limit?: number;
  offset?: number;
}): Promise<StockMovement[]> {
  let query = supabaseAdmin
    .from("stock_movements")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.userId) {
    query = query.eq("created_by", filters.userId);
  }

  if (filters?.orderId) {
    query = query.eq("order_id", filters.orderId);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching stock movements:", error);
    throw new Error("Failed to fetch stock movements");
  }

  return data;
}

/**
 * Get stock movement by ID
 */
export async function getStockMovementById(movementId: string): Promise<StockMovement | null> {
  const { data, error } = await supabaseAdmin
    .from("stock_movements")
    .select("*")
    .eq("id", movementId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching stock movement:", error);
    throw new Error("Failed to fetch stock movement");
  }

  return data;
}
