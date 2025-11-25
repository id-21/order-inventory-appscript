import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { QRCodeData } from "@/lib/features/supabase-stock";

/**
 * Convert a date to IST (Indian Standard Time, UTC+5:30)
 * Takes any date/time and converts it to IST timezone
 */
function toIST(date: Date | string): string {
  const d = new Date(date);

  // Convert to IST using toLocaleString to get proper IST time
  const istString = d.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Parse the formatted string and convert to ISO format for PostgreSQL
  const [datePart, timePart] = istString.split(", ");
  const [month, day, year] = datePart.split("/");
  const formattedIST = `${year}-${month}-${day}T${timePart}+05:30`;

  return formattedIST;
}

/**
 * POST /api/stock/scan-session/batch
 * Submit a batch of scanned items at once (after client-side validation)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, orderId, scannedItems } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!scannedItems || !Array.isArray(scannedItems) || scannedItems.length === 0) {
      return NextResponse.json(
        { error: "Scanned items are required" },
        { status: 400 }
      );
    }

    // Clear any existing items for this session (in case of retry)
    await supabaseAdmin
      .from("scanned_items")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("is_processed", false);

    // Prepare batch insert data
    const itemsToInsert = scannedItems.map((item: any) => ({
      session_id: sessionId,
      user_id: userId,
      order_id: orderId || null,
      design: item.design,
      lot_number: item.lot,
      unique_identifier: item.uniqueIdentifier,
      is_processed: false,
      scanned_at: toIST(item.scannedAt),
    }));

    // Batch insert all items
    const { data, error } = await supabaseAdmin
      .from("scanned_items")
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error("Error batch inserting scanned items:", error);
      return NextResponse.json(
        { error: "Failed to save scanned items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${data.length} items`,
      count: data.length,
    });
  } catch (error) {
    console.error("Error processing batch scan:", error);
    return NextResponse.json(
      { error: "Failed to process batch scan" },
      { status: 500 }
    );
  }
}
