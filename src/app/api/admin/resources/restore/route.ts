import { NextRequest, NextResponse } from "next/server";
import { restoreListing } from "@/actions/admin/listings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: "Missing listing ID" },
        { status: 400 }
      );
    }

    const result = await restoreListing(listingId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
