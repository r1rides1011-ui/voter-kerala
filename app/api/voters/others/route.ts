import { NextRequest, NextResponse } from "next/server"
import { getVotersCollection } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const voters = await getVotersCollection()

    const others = await voters.find(
      {
        $or: [
          { gender: { $exists: false } },
          { gender: null },
          { gender: "" },
          { gender: "-" },
          { gender: { $nin: ["M", "F"] } }
        ]
      },
      {
        projection: {
          _id: 0,
          name: 1,
          guardian_name: 1,
          ward_number: 1,
          booth_number: 1,
          age: 1,
          gender: 1,
          sec_id: 1
        }
      }
    ).toArray()

    return NextResponse.json({ success: true, count: others.length, data: others })
  } catch (e) {
    console.error("ERROR /others:", e)
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 })
  }
}
