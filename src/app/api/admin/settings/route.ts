import { NextRequest, NextResponse } from "next/server";
import { updateMultipleSettings } from "@/actions/admin/settings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, errors: ["Invalid settings format"] },
        { status: 400 }
      );
    }

    const result = await updateMultipleSettings(settings);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
    }
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { success: false, errors: ["Internal server error"] },
      { status: 500 }
    );
  }
}
