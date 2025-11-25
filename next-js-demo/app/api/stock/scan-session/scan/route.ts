import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  addScannedItem,
  validateQRCode,
  checkDuplicateScan,
  checkQuantityLimit,
  QRCodeData,
} from "@/lib/features/supabase-stock";

/**
 * POST /api/stock/scan-session/scan
 * Process a QR code scan
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, qrData, orderId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!qrData) {
      return NextResponse.json(
        { error: "QR code data is required" },
        { status: 400 }
      );
    }

    // Parse QR data if it's a string
    let parsedQRData: QRCodeData;
    try {
      parsedQRData = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid QR code format" },
        { status: 400 }
      );
    }

    // Validate QR code format and against order
    const validation = await validateQRCode(parsedQRData, orderId || null);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message, valid: false },
        { status: 400 }
      );
    }

    // Check for duplicate scan
    const isDuplicate = await checkDuplicateScan(
      sessionId,
      parsedQRData["Unique Identifier"]
    );
    if (isDuplicate) {
      return NextResponse.json(
        {
          error: `Item ${parsedQRData["Unique Identifier"]} has already been scanned`,
          valid: false,
          duplicate: true,
        },
        { status: 400 }
      );
    }

    // Check quantity limit if order is specified
    if (orderId) {
      const quantityCheck = await checkQuantityLimit(
        orderId,
        parsedQRData.Design,
        parsedQRData.Lot,
        sessionId
      );

      if (!quantityCheck.withinLimit) {
        return NextResponse.json(
          {
            error: quantityCheck.message,
            valid: false,
            quantityExceeded: true,
            current: quantityCheck.current,
            max: quantityCheck.max,
          },
          { status: 400 }
        );
      }
    }

    // Add scanned item
    const scannedItem = await addScannedItem(
      sessionId,
      userId,
      parsedQRData,
      orderId || null
    );

    return NextResponse.json({
      success: true,
      valid: true,
      message: "Item scanned successfully",
      item: scannedItem,
    });
  } catch (error) {
    console.error("Error processing scan:", error);
    return NextResponse.json(
      { error: "Failed to process scan", valid: false },
      { status: 500 }
    );
  }
}
