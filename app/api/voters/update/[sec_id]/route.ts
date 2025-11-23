import { NextRequest, NextResponse } from "next/server";
import { getVotersCollection } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ sec_id: string }> }
) {
  // Next.js 14: params MUST be awaited
  const { sec_id } = await context.params;

  if (!sec_id) {
    return NextResponse.json(
      { success: false, error: "Missing sec_id" },
      { status: 400 }
    );
  }

  const updateData = await req.json();
  delete updateData._id; // prevent immutable _id error

  const voters = await getVotersCollection();

  const updated = await voters.findOneAndUpdate(
    { sec_id },
    { $set: updateData },
    { returnDocument: "after" }
  );

  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Voter not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: updated,
    message: "Voter updated",
  });
}
