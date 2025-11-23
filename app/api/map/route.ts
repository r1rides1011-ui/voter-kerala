import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse, Voter } from "@/lib/types"
import { getVotersCollection } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const voters = await getVotersCollection()
    const data = await voters
      .find({
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null },
      })
      .toArray()

    const response: ApiResponse<Voter[]> = {
      success: true,
      data: data as Voter[],
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Map data error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch map data",
      },
      { status: 500 },
    )
  }
}
