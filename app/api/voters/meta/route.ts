import { NextRequest, NextResponse } from "next/server"
import { connectDb, getVotersCollection } from "@/lib/db"

// Memory TTL Cache for high frequency metadata lookups
const metaCache = new Map<string, { data: any[]; timestamp: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type")
    const district = req.nextUrl.searchParams.get("district")
    const lb = req.nextUrl.searchParams.get("lb")
    const ward = req.nextUrl.searchParams.get("ward")

    if (!type)
      return NextResponse.json({ success: false, error: "Missing type parameter" })

    const cacheKey = `${type}|${district || ""}|${lb || ""}|${ward || ""}`
    const cached = metaCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data })
    }

    const { db } = await connectDb()
    const voters = await getVotersCollection()

    // 1️⃣ DISTRICTS
    if (type === "districts") {
      const districtsCol = db.collection("districts")
      let data = await districtsCol
        .find({})
        .project({ _id: 0, code: "$district_code", name: "$district_name" })
        .sort({ name: 1 })
        .toArray()

      if (data.length === 0) {
        data = await voters.aggregate([
          { $group: { _id: { code: "$district_code", name: "$district_name" } } },
          { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
          { $sort: { name: 1 } }
        ]).toArray()
      }

      metaCache.set(cacheKey, { data, timestamp: Date.now() })
      return NextResponse.json({ success: true, data })
    }

    // 2️⃣ LOCAL BODIES
    if (type === "lbs") {
      const lbCol = db.collection("local_bodies")
      const query: Record<string, any> = {}
      if (district) query.district_code = district

      let data = await lbCol
        .find(query)
        .project({ _id: 0, code: "$lb_code", name: "$lb_name" })
        .sort({ name: 1 })
        .toArray()

      if (data.length === 0) {
        const match: any = {}
        if (district) match.district_code = district

        data = await voters.aggregate([
          ...(district ? [{ $match: match }] : []),
          { $group: { _id: { code: "$lb_code", name: "$lb_name" } } },
          { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
          { $sort: { name: 1 } }
        ]).toArray()
      }

      metaCache.set(cacheKey, { data, timestamp: Date.now() })
      return NextResponse.json({ success: true, data })
    }

    // 3️⃣ WARDS
    if (type === "wards") {
      if (!district)
        return NextResponse.json({ success: false, error: "district required" })

      const match: any = { district_code: district }
      if (lb) match.lb_code = lb

      const data = await voters.aggregate([
        { $match: match },
        { $group: { _id: { code: "$ward_number", name: "$ward_name" } } },
        { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
        { $sort: { code: 1 } }
      ]).toArray()

      metaCache.set(cacheKey, { data, timestamp: Date.now() })
      return NextResponse.json({ success: true, data })
    }

    // 4️⃣ BOOTHS
    if (type === "booths") {
      const match: any = {}
      if (district) match.district_code = district
      if (lb) match.lb_code = lb
      if (ward) match.ward_number = ward

      if (Object.keys(match).length === 0) {
        return NextResponse.json({
          success: false,
          error: "At least one location filter (district, lb, or ward) must be provided"
        })
      }

      const data = await voters.aggregate([
        { $match: match },
        { $group: { _id: { code: "$booth_number", name: "$booth_name" } } },
        { $project: { _id: 0, code: "$_id.code", name: "$_id.name" } },
        { $sort: { code: 1 } }
      ]).toArray()

      metaCache.set(cacheKey, { data, timestamp: Date.now() })
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: false, error: "Invalid type" })

  } catch (error) {
    console.error("META API ERROR:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch meta data" },
      { status: 500 }
    )
  }
}
