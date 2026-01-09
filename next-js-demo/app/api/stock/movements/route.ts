import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getStockMovements } from "@/lib/features/supabase-stock";

/**
 * GET /api/stock/movements
 * Get stock movements for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const status = searchParams.get("status") as "COMPLETED" | "CANCELLED" | null;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const movements = await getStockMovements({
      orderId: orderId || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ movements });
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
