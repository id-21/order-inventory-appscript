import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { startScanSession } from "@/lib/features/supabase-stock";

/**
 * POST /api/stock/scan-session/start
 * Initialize a new scan session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await startScanSession(userId, orderId || null, sessionId);

    return NextResponse.json({
      success: true,
      message: "Scan session started",
      sessionId,
    });
  } catch (error) {
    console.error("Error starting scan session:", error);
    return NextResponse.json(
      { error: "Failed to start scan session" },
      { status: 500 }
    );
  }
}
