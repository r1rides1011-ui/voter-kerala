import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toggleFavorite } from "@/lib/models/user"; // ⭐ YOUR MODEL

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.username) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const username = session.user.username;

    const body = await req.json();
    const { sec_id } = body;

    if (!sec_id) {
      return NextResponse.json(
        { success: false, message: "SEC ID required" },
        { status: 400 }
      );
    }

    // Call your DB function
    const result = await toggleFavorite(username, sec_id);

    return NextResponse.json({
      success: true,
      sec_id,
      favorite: result.nowFavorite,
    });
  } catch (error) {
    console.error("Favorite toggle API Error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
