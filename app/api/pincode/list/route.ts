import { NextRequest, NextResponse } from "next/server"
import { connectDb, getVotersCollection } from "@/lib/db"

interface ComboItem {
  district_name: string
  lb_name: string
  ward_number: string
  ward_name: string
  voter_count: number
  voter_pincode?: string | null
}

interface EnrichedItem extends ComboItem {
  pincode: string | null
  status: "resolved" | "unresolved"
  source: string
  resolved_at: any
  is_verified: boolean
  is_flagged: boolean
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const district_name = searchParams.get("district_name")?.trim()
    const lb_name = searchParams.get("lb_name")?.trim()
    const status = searchParams.get("status")?.trim() // "resolved" | "unresolved" | "all"
    const verification = searchParams.get("verification")?.trim() // "verified" | "unverified" | "flagged"
    const search = searchParams.get("search")?.trim()
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)))

    const { db } = await connectDb()
    const pincodesCol = db.collection("pincodes")
    const voters = await getVotersCollection()

    // 1. Ensure pincodes collection has documents. If empty, seed from voters location combos once.
    const countPincodes = await pincodesCol.estimatedDocumentCount()
    if (countPincodes === 0) {
      const combos = await voters
        .aggregate([
          {
            $group: {
              _id: {
                district_name: "$district_name",
                lb_name: "$lb_name",
                ward_number: "$ward_number",
                ward_name: "$ward_name",
              },
              voter_count: { $sum: 1 },
              existing_pincode: { $first: "$pincode" },
            },
          },
        ])
        .toArray()

      if (combos.length > 0) {
        const docs = combos.map((c) => ({
          district_name: (c._id.district_name || "").toUpperCase(),
          lb_name: c._id.lb_name || "",
          ward_number: c._id.ward_number || "",
          ward_name: c._id.ward_name || "",
          voter_count: c.voter_count || 0,
          pincode: c.existing_pincode || null,
          resolved_at: c.existing_pincode ? new Date() : null,
          source: c.existing_pincode ? "voter_record" : "unresolved",
          is_verified: false,
          is_flagged: false,
        }))
        await pincodesCol.insertMany(docs, { ordered: false }).catch(() => {})
      }
    }

    // 2. Build MongoDB filter for pincodes collection
    const query: Record<string, any> = {}

    if (district_name) {
      query.district_name = district_name.toUpperCase()
    }
    if (lb_name) {
      query.lb_name = lb_name
    }
    if (status === "resolved") {
      query.pincode = { $ne: null, $exists: true }
    } else if (status === "unresolved") {
      query.$or = [{ pincode: null }, { pincode: { $exists: false } }]
    }

    if (verification === "verified") {
      query.is_verified = true
    } else if (verification === "unverified") {
      query.is_verified = false
      query.pincode = { $ne: null, $exists: true }
    } else if (verification === "flagged") {
      query.is_flagged = true
    }

    if (search) {
      const qRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      query.$or = [
        { ward_name: qRegex },
        { ward_number: qRegex },
        { lb_name: qRegex },
        { district_name: qRegex },
        { pincode: qRegex },
      ]
    }

    // 3. Fast parallel query execution
    const [storedPincodes, filteredTotal, allDocs] = await Promise.all([
      pincodesCol
        .find(query)
        .sort({ district_name: 1, lb_name: 1, ward_number: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      pincodesCol.countDocuments(query),
      pincodesCol.find({}).project({ district_name: 1, lb_name: 1, pincode: 1, is_verified: 1, is_flagged: 1, voter_count: 1 }).toArray(),
    ])

    const enriched: EnrichedItem[] = storedPincodes.map((p: any) => ({
      district_name: p.district_name,
      lb_name: p.lb_name,
      ward_number: p.ward_number,
      ward_name: p.ward_name,
      voter_count: p.voter_count || 0,
      voter_pincode: p.pincode,
      pincode: p.pincode || null,
      status: p.pincode ? "resolved" : "unresolved",
      source: p.source || (p.pincode ? "voter_record" : "unresolved"),
      resolved_at: p.resolved_at || null,
      is_verified: Boolean(p.is_verified || p.source === "manual" || p.source === "manual_verified"),
      is_flagged: Boolean(p.is_flagged),
    }))

    // Global dropdown filters and stats from all metadata documents
    const districts = Array.from(new Set(allDocs.map((i: any) => i.district_name).filter(Boolean))).sort()
    const localBodies = Array.from(new Set(allDocs.map((i: any) => i.lb_name).filter(Boolean))).sort()

    const totalLocations = allDocs.length
    const totalResolved = allDocs.filter((i: any) => i.pincode).length
    const totalUnresolved = totalLocations - totalResolved
    const totalVerified = allDocs.filter((i: any) => i.is_verified).length
    const totalFlagged = allDocs.filter((i: any) => i.is_flagged).length
    const totalVotersUpdated = allDocs.reduce(
      (sum: number, i: any) => (i.pincode ? sum + (i.voter_count || 0) : sum),
      0
    )

    const totalPages = Math.ceil(filteredTotal / limit) || 1

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        totalItems: filteredTotal,
        totalPages,
      },
      stats: {
        totalLocations,
        totalResolved,
        totalUnresolved,
        totalVerified,
        totalFlagged,
        totalVotersUpdated,
      },
      filters: {
        districts,
        localBodies,
      },
    })
  } catch (error) {
    console.error("List pincodes error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch pincodes list" },
      { status: 500 }
    )
  }
}
