import { NextRequest, NextResponse } from "next/server";
import { adjustCredits } from "@/actions/admin/credits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, note, type } = body;

    if (!userId || typeof amount !== "number" || !note) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await adjustCredits(userId, amount, note, type || "admin_adjust");

    if (result.success) {
      return NextResponse.json({ success: true, newBalance: result.newBalance });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Credit adjustment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
