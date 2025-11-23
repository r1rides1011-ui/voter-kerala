import { NextRequest, NextResponse } from "next/server"
import { getVotersCollection } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const voters = await getVotersCollection()

    const type = req.nextUrl.searchParams.get("type")
    const district = req.nextUrl.searchParams.get("district")
    const lb = req.nextUrl.searchParams.get("lb")
    const ward = req.nextUrl.searchParams.get("ward")

    if (!type)
      return NextResponse.json({ success: false, error: "Missing type parameter" })

    // =====================================================================================
    // 1️⃣ DISTRICTS
    // =====================================================================================
    if (type === "districts") {
      const data = await voters.aggregate([
        {
          $group: {
            _id: { code: "$district_code", name: "$district_name" }
          }
        },
        { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
        { $sort: { name: 1 } }
      ]).toArray()

      return NextResponse.json({ success: true, data })
    }

    // =====================================================================================
    // 2️⃣ LOCAL BODIES
    // =====================================================================================
    if (type === "lbs") {
      const data = await voters.aggregate([
        {
          $group: {
            _id: { code: "$lb_code", name: "$lb_name" }
          }
        },
        { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
        { $sort: { name: 1 } }
      ]).toArray()

      return NextResponse.json({ success: true, data })
    }

    // =====================================================================================
    // 3️⃣ WARDS (filtered by district)
    // =====================================================================================
    if (type === "wards") {
      if (!district)
        return NextResponse.json({ success: false, error: "district required" })

      const data = await voters.aggregate([
        { $match: { district_code: district } },
        {
          $group: {
            _id: { code: "$ward_number", name: "$ward_name" }
          }
        },
        { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
        { $sort: { code: 1 } }
      ]).toArray()

      return NextResponse.json({ success: true, data })
    }

    // =====================================================================================
    // 4️⃣ BOOTHS — FIXED (WARD FIRST, LB SECOND)
    // =====================================================================================
    if (type === "booths") {
      if (!ward && !lb)
        return NextResponse.json({
          success: false,
          error: "ward or lb must be provided"
        })

      const match: any = {}
      if (ward) match.ward_number = ward
      else if (lb) match.lb_code = lb

      const data = await voters.aggregate([
        { $match: match },
        {
          $group: {
            _id: { code: "$booth_number", name: "$booth_name" }
          }
        },
        { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
        { $sort: { code: 1 } }
      ]).toArray()

      return NextResponse.json({ success: true, data })
    }

    // =====================================================================================
    // INVALID
    // =====================================================================================
    return NextResponse.json({
      success: false,
      error: "Invalid type"
    })

  } catch (error) {
    console.error("META API ERROR:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch meta data" },
      { status: 500 }
    )
  }
}
