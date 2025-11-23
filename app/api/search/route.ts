import { type NextRequest, NextResponse } from "next/server"
import type { Voter } from "@/lib/types"
import { getVotersCollection } from "@/lib/db"

// Helper to safely escape characters for Regex (prevents crashes on symbols)
function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // 1. Extract values
    const name = searchParams.get("name")?.trim()
    const sec_id = searchParams.get("sec_id")?.trim()
    const house_no = searchParams.get("house_no")?.trim()
    const house_name = searchParams.get("house_name")?.trim()
    const phone = searchParams.get("phone")?.trim()
    const ward_number = searchParams.get("ward_number")?.trim()
    const booth_number = searchParams.get("booth_number")?.trim()
    const district_code = searchParams.get("district_code")?.trim()
    const lb_code = searchParams.get("lb_code")?.trim()

    const skip = Number.parseInt(searchParams.get("skip") || "0")
    const limit = Number.parseInt(searchParams.get("limit") || "30")

    // 2. Guard Clause: If no filters, don't scan the DB (Save resources)
    const hasFilters = 
      name || sec_id || house_no || house_name || phone || 
      ward_number || booth_number || district_code || lb_code

    if (!hasFilters) {
      return NextResponse.json({ success: true, data: [], total: 0 })
    }

    // 3. Build Query
    // We use 'any' here to allow flexible Mongo operators
    const query: Record<string, any> = {}

    // --- EXACT MATCHES (Fastest - These use Indexes) ---
    
    if (district_code) query.district_code = district_code
    if (lb_code) query.lb_code = lb_code
    
    // SEC ID is unique, so it should be an exact match
    if (sec_id) query.sec_id = sec_id

    // --- SMART NUMBER MATCHING ---
    
    // Booth: Exact match usually, but handle string variances
    if (booth_number) {
      query.booth_number = booth_number
    }

    // Ward: This is the tricky one. DB might have "014", User types "14".
    // Instead of slow Regex, we check all likely variations.
    // This allows MongoDB to still use the index!
    if (ward_number) {
      const cleanWard = ward_number.replace(/^0+/, "") // remove leading zeros
      query.ward_number = { 
        $in: [
          cleanWard,                    // "5"
          cleanWard.padStart(2, "0"),   // "05"
          cleanWard.padStart(3, "0")    // "005"
        ] 
      }
    }

    // --- TEXT SEARCH (Slower - Regex) ---
    // These run faster ONLY because we filtered by District/LB/Ward above first.

    if (name) {
      // anchors (^...): strict match on start of string is faster than full scan
      // But for user flexibility, standard partial match is usually preferred:
      query.name = { $regex: escapeRegex(name), $options: "i" }
    }

    if (house_name) {
      query.house_name = { $regex: escapeRegex(house_name), $options: "i" }
    }

    // House No: often contains slashes (12/404). Escape it.
    if (house_no) {
      query.house_no = { $regex: escapeRegex(house_no), $options: "i" }
    }

    // Phone: Partial match
    if (phone) {
      query.phone = { $regex: escapeRegex(phone), $options: "i" }
    }

    // 4. Execution
    const votersCollection = await getVotersCollection()

    // Run count and find in parallel for speed
    const [data, total] = await Promise.all([
      votersCollection
        .find(query)
        .sort({ district_code: 1, lb_code: 1, ward_number: 1 }) // Sort by Location logic
        .skip(skip)
        .limit(limit)
        .toArray(),
      votersCollection.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: data as Voter[],
      total,
    })

  } catch (error) {
    console.error("Search API Error:", error)
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    )
  }
}