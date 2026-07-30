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
    const voters = await getVotersCollection()
    const pincodesCol = db.collection("pincodes")

    // Get all stored pincode mappings from cache collection
    const storedPincodes = await pincodesCol.find({}).toArray()
    const pincodeMap = new Map<string, any>()
    for (const p of storedPincodes) {
      const key = `${p.district_name?.toUpperCase()}|${p.lb_name}|${p.ward_number}`
      pincodeMap.set(key, p)
    }

    // Pipeline to aggregate distinct location combos from voters with sample/count stats
    const pipeline: any[] = [
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
      {
        $project: {
          _id: 0,
          district_name: "$_id.district_name",
          lb_name: "$_id.lb_name",
          ward_number: "$_id.ward_number",
          ward_name: "$_id.ward_name",
          voter_count: 1,
          voter_pincode: "$existing_pincode",
        },
      },
    ]

    const allCombos = (await voters.aggregate(pipeline).toArray()) as unknown as ComboItem[]

    // Enrich with cached pincodes & verification flags
    let enriched: EnrichedItem[] = allCombos.map((item) => {
      const key = `${item.district_name?.toUpperCase()}|${item.lb_name}|${item.ward_number}`
      const cached = pincodeMap.get(key)
      const pincode = cached?.pincode || item.voter_pincode || null
      const source = cached?.source || (item.voter_pincode ? "voter_record" : "unresolved")
      const resolved_at = cached?.resolved_at || null
      const is_verified = Boolean(cached?.is_verified || cached?.source === "manual" || cached?.source === "manual_verified")
      const is_flagged = Boolean(cached?.is_flagged)

      return {
        ...item,
        pincode,
        status: pincode ? "resolved" : "unresolved",
        source,
        resolved_at,
        is_verified,
        is_flagged,
      }
    })

    // Get distinct districts & LBs for dropdown filters
    const districts = Array.from(new Set(enriched.map((i) => i.district_name).filter(Boolean))).sort()
    const localBodies = Array.from(new Set(enriched.map((i) => i.lb_name).filter(Boolean))).sort()

    // Global stats before filtering
    const totalLocations = enriched.length
    const totalResolved = enriched.filter((i) => i.pincode).length
    const totalUnresolved = totalLocations - totalResolved
    const totalVerified = enriched.filter((i) => i.is_verified).length
    const totalFlagged = enriched.filter((i) => i.is_flagged).length
    const totalVotersUpdated = enriched.reduce(
      (sum, i) => (i.pincode ? sum + (i.voter_count || 0) : sum),
      0
    )

    // Apply filtering
    if (district_name) {
      enriched = enriched.filter(
        (i) => i.district_name?.toUpperCase() === district_name.toUpperCase()
      )
    }
    if (lb_name) {
      enriched = enriched.filter((i) => i.lb_name === lb_name)
    }
    if (status === "resolved") {
      enriched = enriched.filter((i) => !!i.pincode)
    } else if (status === "unresolved") {
      enriched = enriched.filter((i) => !i.pincode)
    }

    if (verification === "verified") {
      enriched = enriched.filter((i) => i.is_verified)
    } else if (verification === "unverified") {
      enriched = enriched.filter((i) => !i.is_verified && i.pincode)
    } else if (verification === "flagged") {
      enriched = enriched.filter((i) => i.is_flagged)
    }

    if (search) {
      const q = search.toLowerCase()
      enriched = enriched.filter(
        (i) =>
          i.ward_name?.toLowerCase().includes(q) ||
          i.ward_number?.toLowerCase().includes(q) ||
          i.lb_name?.toLowerCase().includes(q) ||
          i.district_name?.toLowerCase().includes(q) ||
          i.pincode?.toLowerCase().includes(q)
      )
    }

    const filteredTotal = enriched.length
    const totalPages = Math.ceil(filteredTotal / limit) || 1
    const startIndex = (page - 1) * limit
    const paginatedItems = enriched.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      success: true,
      data: paginatedItems,
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
