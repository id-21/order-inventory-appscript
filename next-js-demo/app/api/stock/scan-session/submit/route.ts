import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createStockMovement } from "@/lib/features/supabase-stock";
import { uploadStockImage } from "@/lib/features/supabase-storage";

/**
 * POST /api/stock/scan-session/submit
 * Finalize stock movement with image upload
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, orderId, invoiceNumber, imageBase64, movementType } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!invoiceNumber || !invoiceNumber.trim()) {
      return NextResponse.json(
        { error: "Invoice number is required" },
        { status: 400 }
      );
    }

    // Upload image if provided
    let imageUrl: string | null = null;
    if (imageBase64) {
      try {
        imageUrl = await uploadStockImage(imageBase64);
      } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    // Create stock movements
    const movements = await createStockMovement(
      sessionId,
      userId,
      orderId || null,
      invoiceNumber,
      imageUrl,
      movementType || "OUT"
    );

    return NextResponse.json({
      success: true,
      message: `Stock movement completed. ${movements.length} item(s) processed.`,
      movements,
      imageUrl,
    });
  } catch (error) {
    console.error("Error submitting stock movement:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit stock movement",
      },
      { status: 500 }
    );
  }
}
