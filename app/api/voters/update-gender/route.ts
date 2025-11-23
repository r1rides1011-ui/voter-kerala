import { NextResponse } from "next/server";
import { getVotersCollection } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sec_id, gender } = body;

    if (!sec_id) {
      return NextResponse.json(
        { success: false, error: "Missing sec_id" },
        { status: 400 }
      );
    }

    if (!gender) {
      return NextResponse.json(
        { success: false, error: "Missing gender field" },
        { status: 400 }
      );
    }

    const voters = await getVotersCollection();

    const result = await voters.updateOne(
      { sec_id },
      { $set: { gender } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Voter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Gender updated successfully",
    });
  } catch (err) {
    console.error("UPDATE GENDER API ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
