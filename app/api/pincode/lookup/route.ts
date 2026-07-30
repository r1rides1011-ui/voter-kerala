import { NextRequest, NextResponse } from "next/server"
import { connectDb } from "@/lib/db"

const INDIA_POST_API = "https://api.postalpincode.in/postoffice"

async function fetchFromIndiaPost(
  query: string,
  districtName: string
): Promise<string | null> {
  try {
    const url = `${INDIA_POST_API}/${encodeURIComponent(query)}`
    const res = await fetch(url, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data[0]?.Status !== "Success") return null
    const postOffices: any[] = data[0]?.PostOffice || []

    // 1. Strict match by District & State (KERALA)
    const matched = postOffices.find(
      (po) =>
        po.District?.toUpperCase() === districtName.toUpperCase() &&
        (po.State?.toUpperCase() === "KERALA" || !po.State)
    )
    if (matched?.Pincode) return matched.Pincode

    return null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const district_name = searchParams.get("district_name")?.trim().toUpperCase()
    const lb_name = searchParams.get("lb_name")?.trim()
    const ward_name = searchParams.get("ward_name")?.trim()
    const ward_number = searchParams.get("ward_number")?.trim()

    if (!district_name || !lb_name) {
      return NextResponse.json(
        { success: false, error: "district_name and lb_name are required" },
        { status: 400 }
      )
    }

    const { db } = await connectDb()
    const pincodesCol = db.collection("pincodes")

    // 1. Check MongoDB cache
    const cacheQuery: Record<string, any> = { district_name, lb_name }
    if (ward_number) cacheQuery.ward_number = ward_number
    else if (ward_name) cacheQuery.ward_name = ward_name

    const cached = await pincodesCol.findOne(cacheQuery)
    if (cached?.pincode) {
      return NextResponse.json({ success: true, pincode: cached.pincode, source: "cache" })
    }

    // 2. Try India Post API
    let pincode: string | null = null
    if (ward_name) pincode = await fetchFromIndiaPost(ward_name, district_name)
    if (!pincode && lb_name) pincode = await fetchFromIndiaPost(lb_name, district_name)

    // 3. Save to cache and update voter documents
    const cacheDoc = {
      district_name,
      lb_name,
      ward_name: ward_name || null,
      ward_number: ward_number || null,
      pincode: pincode || null,
      resolved_at: new Date(),
      source: pincode ? "india_post_api" : "unresolved",
    }
    await pincodesCol.updateOne(cacheQuery, { $set: cacheDoc }, { upsert: true })

    let votersUpdated = 0
    if (pincode) {
      const voterQuery: Record<string, any> = {
        district_name: { $regex: new RegExp(`^${district_name}$`, "i") },
        lb_name,
      }
      if (ward_number) voterQuery.ward_number = ward_number

      const updateRes = await db.collection("voters").updateMany(voterQuery, { $set: { pincode } })
      votersUpdated = updateRes.modifiedCount
    }

    if (!pincode) {
      return NextResponse.json(
        { success: false, error: "Pincode not found for the given location" },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, pincode, source: "india_post_api", votersUpdated })
  } catch (error) {
    console.error("Pincode lookup error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
