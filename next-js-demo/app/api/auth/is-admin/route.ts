import { auth } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ isAdmin: false });
  }

  const isAdmin = await isUserAdmin(userId);
  return NextResponse.json({ isAdmin });
}
