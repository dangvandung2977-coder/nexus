import { NextRequest, NextResponse } from "next/server";
import { updateModerationStatus, updateListingStatus } from "@/actions/admin/listings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, action, reason } = body;

    if (!listingId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case "hide":
        result = await updateModerationStatus(listingId, "hidden", reason);
        break;
      case "unhide":
        result = await updateModerationStatus(listingId, "approved", reason);
        break;
      case "remove":
        result = await updateModerationStatus(listingId, "removed", reason);
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Moderation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
