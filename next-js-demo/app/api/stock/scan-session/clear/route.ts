import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { clearScanSession } from "@/lib/features/supabase-stock";

/**
 * DELETE /api/stock/scan-session/clear
 * Clear scan session data
 */
export async function DELETE(request: NextRequest) {
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

    await clearScanSession(sessionId);

    return NextResponse.json({
      success: true,
      message: "Session cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
