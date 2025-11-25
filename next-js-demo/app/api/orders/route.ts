import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createOrder, getOrders } from "@/lib/features/supabase-orders";

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as "PENDING" | "COMPLETED" | "CANCELLED" | null;
    const customerName = searchParams.get("customerName");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const orders = await getOrders({
      userId,
      status: status || undefined,
      customerName: customerName || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerName, orderDetails } = body;

    // Validation
    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!orderDetails || !Array.isArray(orderDetails) || orderDetails.length === 0) {
      return NextResponse.json(
        { error: "At least one order item is required" },
        { status: 400 }
      );
    }

    // Validate each order item
    for (const item of orderDetails) {
      if (!item.Design || !item.Design.trim()) {
        return NextResponse.json(
          { error: "Design is required for all items" },
          { status: 400 }
        );
      }
      if (!item.Qty || item.Qty <= 0) {
        return NextResponse.json(
          { error: "Quantity must be greater than 0" },
          { status: 400 }
        );
      }
      if (!item.Lot || !item.Lot.trim()) {
        return NextResponse.json(
          { error: "Lot number is required for all items" },
          { status: 400 }
        );
      }
    }

    const order = await createOrder(
      {
        customerName,
        orderDetails,
      },
      userId
    );

    return NextResponse.json(
      {
        success: true,
        order,
        message: `Order #${order.order_number} created successfully`
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
