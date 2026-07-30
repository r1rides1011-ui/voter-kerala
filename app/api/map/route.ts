import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse, Voter } from "@/lib/types"
import { getVotersCollection } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const minLat = searchParams.get("minLat") ? Number(searchParams.get("minLat")) : null
    const maxLat = searchParams.get("maxLat") ? Number(searchParams.get("maxLat")) : null
    const minLng = searchParams.get("minLng") ? Number(searchParams.get("minLng")) : null
    const maxLng = searchParams.get("maxLng") ? Number(searchParams.get("maxLng")) : null

    const district_code = searchParams.get("district_code")
    const lb_code = searchParams.get("lb_code")
    const ward_number = searchParams.get("ward_number")
    const limit = Math.min(5000, Math.max(10, Number(searchParams.get("limit") || 1000)))

    const query: Record<string, any> = {
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
    }

    if (district_code) query.district_code = district_code
    if (lb_code) query.lb_code = lb_code
    if (ward_number) query.ward_number = ward_number

    if (minLat !== null && maxLat !== null && minLng !== null && maxLng !== null) {
      query.latitude = { $gte: minLat, $lte: maxLat }
      query.longitude = { $gte: minLng, $lte: maxLng }
    }

    const voters = await getVotersCollection()
    const data = await voters
      .find(query, {
        projection: {
          _id: 1,
          sec_id: 1,
          name: 1,
          house_no: 1,
          latitude: 1,
          longitude: 1,
          district_name: 1,
          lb_name: 1,
          ward_number: 1,
        },
      })
      .limit(limit)
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
