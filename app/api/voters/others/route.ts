import { NextRequest, NextResponse } from "next/server"
import { getVotersCollection } from "@/lib/db"
import type { Filter } from "mongodb"
import type { Voter } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10))
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)))

    const voters = await getVotersCollection()

    const query: Filter<Voter> = {
      $or: [
        { gender: { $exists: false } },
        { gender: null as any },
        { gender: "" as any },
        { gender: "-" as any },
        { gender: { $nin: ["M", "F"] } },
      ],
    }

    const [others, totalCount] = await Promise.all([
      voters
        .find(query, {
          projection: {
            _id: 0,
            name: 1,
            guardian_name: 1,
            ward_number: 1,
            booth_number: 1,
            age: 1,
            gender: 1,
            sec_id: 1,
          },
        })
        .skip(skip)
        .limit(limit)
        .toArray(),
      voters.countDocuments(query, { maxTimeMS: 5000 }).catch(() => 0),
    ])

    return NextResponse.json({ success: true, count: totalCount, data: others })
  } catch (e) {
    console.error("ERROR /others:", e)
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 })
  }
}
