import { type NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Voter } from "@/lib/types";
import { getVotersCollection } from "@/lib/db";

export async function GET(req: NextRequest, context: { params: { sec_id: string } | Promise<{ sec_id: string }> }) {
  try {
    // Await params if it's a promise
    const resolvedParams = await context.params;
    const rawSecId = resolvedParams.sec_id;
    const sec_id = rawSecId?.trim();

    console.log("[DEBUG] Requested sec_id:", rawSecId);
    console.log("[DEBUG] Trimmed sec_id:", sec_id);

    if (!sec_id) {
      return NextResponse.json(
        { success: false, error: "Missing sec_id" },
        { status: 400 }
      );
    }

    const voters = await getVotersCollection();
    if (!voters) {
      return NextResponse.json(
        { success: false, error: "Voters collection not found" },
        { status: 500 }
      );
    }

    let data = await voters.findOne({ sec_id });
    console.log("[DEBUG] Exact match result:", data);

    if (!data) {
      console.log("[DEBUG] Trying regex case-insensitive match...");
      data = await voters.findOne({
        sec_id: { $regex: `^${sec_id}$`, $options: "i" },
      });
      console.log("[DEBUG] Regex match result:", data);
    }

    if (!data) {
      console.warn("[DEBUG] Voter not found for sec_id:", sec_id);
      return NextResponse.json(
        { success: false, error: "Voter not found" },
        { status: 404 }
      );
    }

    const response: ApiResponse<Voter> = { success: true, data };
    console.log("[DEBUG] Returning voter data:", data.sec_id);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[v0] Fetch voter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch voter" },
      { status: 500 }
    );
  }
}
