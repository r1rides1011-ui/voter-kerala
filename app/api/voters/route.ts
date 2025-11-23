import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse, Voter } from "@/lib/types"
import { getVotersCollection } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const skip = Number(searchParams.get("skip") || 0)
    const limit = Number(searchParams.get("limit") || 100)

    // -----------------------------
    // Basic required filters
    // -----------------------------
    const district_code = searchParams.get("district_code")
    const lb_code = searchParams.get("lb_code")

    // -----------------------------
    // Optional filters
    // -----------------------------
    const ward_number = searchParams.get("ward_number")
    const house_no = searchParams.get("house_no")
    const sec_id = searchParams.get("sec_id")
    const booth_number = searchParams.get("booth_number")
    const phone = searchParams.get("phone")
    const name = searchParams.get("name")
    const guardian_name = searchParams.get("guardian_name")

    // -----------------------------
    // Build Query — SIMPLE &
    // CORRECT ORDER
    // -----------------------------
    const query: any = {}

    // Step 1: District must match
    if (district_code) query.district_code = district_code

    // Step 2: Local body must match
    if (lb_code) query.lb_code = lb_code

    // Step 3: Ward (optional)
    if (ward_number) query.ward_number = ward_number

    // Step 4: House (optional)
     if (house_no) {
  const baseHouse = house_no.replace(/[A-Za-z]+$/, "").trim()

  query.house_no = {
    $regex: `^${baseHouse}(?:[A-Za-z]+)?$`,
    $options: "i",
  }
}

    // Step 5: Exact filters
    if (sec_id) query.sec_id = sec_id
    if (booth_number) query.booth_number = booth_number
    if (phone) query.phone = phone

    // Step 6: Search filters
    if (name) query.name = { $regex: `^${name}`, $options: "i" }
    if (guardian_name)
      query.guardian_name = { $regex: guardian_name, $options: "i" }

    const voters = await getVotersCollection()

    const data = await voters
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: data as Voter[],
    })
  } catch (error) {
    console.error("[voters] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch voters" },
      { status: 500 }
    )
  }
}
