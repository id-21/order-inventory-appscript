import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getNextOrderNumber } from "@/lib/features/supabase-orders";

/**
 * GET /api/orders/next-id
 * Get the next available order number
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nextOrderNumber = await getNextOrderNumber();

    return NextResponse.json({ orderNumber: nextOrderNumber });
  } catch (error) {
    console.error("Error fetching next order number:", error);
    return NextResponse.json(
      { error: "Failed to fetch next order number" },
      { status: 500 }
    );
  }
}
