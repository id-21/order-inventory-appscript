import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getScannedItems } from "@/lib/features/supabase-stock";

/**
 * GET /api/stock/scan-session/items
 * Get aggregated scanned items for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const items = await getScannedItems(sessionId);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching scanned items:", error);
    return NextResponse.json(
      { error: "Failed to fetch scanned items" },
      { status: 500 }
    );
  }
}
