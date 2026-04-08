import { NextRequest, NextResponse } from "next/server";
import { softDeleteListing } from "@/actions/admin/listings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, reason } = body;

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: "Missing listing ID" },
        { status: 400 }
      );
    }

    const result = await softDeleteListing(listingId, reason);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
