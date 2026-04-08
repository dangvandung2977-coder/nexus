import { NextRequest, NextResponse } from "next/server";
import { updateUserStatus } from "@/actions/admin/users";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, status, reason, expiresAt } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await updateUserStatus(userId, status, {
      reason,
      expiresAt,
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("User status update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
