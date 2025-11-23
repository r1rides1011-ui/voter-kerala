import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse, Voter } from "@/lib/types"
import { getVotersCollection } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const voterData = await req.json()

    const voters = await getVotersCollection()
    const result = await voters.insertOne({
      ...voterData,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const newVoter = await voters.findOne({ _id: result.insertedId })

    const response: ApiResponse<Voter> = {
      success: true,
      data: newVoter as Voter | undefined,
      message: "Voter added successfully",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("[v0] Add voter error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add voter",
      },
      { status: 500 },
    )
  }
}
