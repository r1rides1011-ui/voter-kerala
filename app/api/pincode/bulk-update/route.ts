import { NextRequest, NextResponse } from "next/server"
import { connectDb, getVotersCollection } from "@/lib/db"

const INDIA_POST_API = "https://api.postalpincode.in/postoffice"

async function fetchPincodeFromApi(query: string, district: string): Promise<string | null> {
  try {
    const res = await fetch(`${INDIA_POST_API}/${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data[0]?.Status !== "Success") return null
    const offices: any[] = data[0]?.PostOffice || []
    const matched = offices.find(
      (o) =>
        o.District?.toUpperCase() === district.toUpperCase() &&
        (o.State?.toUpperCase() === "KERALA" || !o.State)
    )
    if (matched?.Pincode) return matched.Pincode
    return null
  } catch {
    return null
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// POST /api/pincode/bulk-update
// Finds all unique (district, lb, ward) combos, resolves pincodes,
// caches them, and writes pincode back onto all matching voter docs.
export async function POST(req: NextRequest) {
  try {
    const { db } = await connectDb()
    const voters = await getVotersCollection()
    const pincodesCol = db.collection("pincodes")

    // 1. Fetch cached pincodes into memory map
    const existingPincodes = await pincodesCol.find({}).toArray()
    const pincodeMap = new Map<string, any>()
    for (const p of existingPincodes) {
      const key = `${p.district_name?.toUpperCase()}|${p.lb_name}|${p.ward_number}`
      pincodeMap.set(key, p)
    }

    // 2. Get distinct location combos from pincodes collection or voters fallback
    let combos: any[] = existingPincodes
    if (combos.length === 0) {
      combos = await voters.aggregate([
        {
          $group: {
            _id: {
              district_name: "$district_name",
              district_code: "$district_code",
              lb_name: "$lb_name",
              lb_code: "$lb_code",
              ward_name: "$ward_name",
              ward_number: "$ward_number",
            },
          },
        },
      ]).toArray()
    }

    const total = combos.length
    let resolved = 0
    let failed = 0
    let cached = 0

    for (const item of combos) {
      const district_name = item.district_name || item._id?.district_name || ""
      const lb_name = item.lb_name || item._id?.lb_name || ""
      const ward_name = item.ward_name || item._id?.ward_name || ""
      const ward_number = item.ward_number || item._id?.ward_number || ""

      const key = `${district_name.toUpperCase()}|${lb_name}|${ward_number}`
      const existing = pincodeMap.get(key)
      let pincode: string | null = existing?.pincode || null

      if (!pincode) {
        // Try ward_name, then lb_name via India Post API
        pincode = ward_name ? await fetchPincodeFromApi(ward_name, district_name) : null
        if (!pincode) pincode = await fetchPincodeFromApi(lb_name, district_name)

        // Save to cache
        await pincodesCol.updateOne(
          { district_name: district_name.toUpperCase(), lb_name, ward_number },
          {
            $set: {
              district_name: district_name.toUpperCase(),
              lb_name,
              ward_name,
              ward_number,
              pincode: pincode || null,
              resolved_at: new Date(),
              source: pincode ? "india_post_api" : "unresolved",
            },
          },
          { upsert: true }
        )

        pincodeMap.set(key, { pincode })
        await sleep(1200) // Rate limit protection
      } else {
        cached++
      }

      if (pincode) {
        // Write pincode to all voters matching this location using compound index fields
        await voters.updateMany(
          { district_name: { $in: [district_name, district_name.toUpperCase()] }, lb_name, ward_number },
          { $set: { pincode } }
        )
        resolved++
      } else {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      summary: { total, resolved, failed, cached },
      message: `Processed ${total} locations. ${resolved} pincode(s) applied to voter records.`,
    })
  } catch (error) {
    console.error("Bulk pincode update error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
