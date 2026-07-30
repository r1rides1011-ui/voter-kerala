import { NextRequest, NextResponse } from "next/server"
import { connectDb, getVotersCollection } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { district_name, lb_name, ward_number, ward_name, pincode } = body

    if (!district_name || !lb_name) {
      return NextResponse.json(
        { success: false, error: "District name and Local Body name are required" },
        { status: 400 }
      )
    }

    const cleanPincode = pincode?.trim() || null
    if (cleanPincode && !/^\d{6}$/.test(cleanPincode)) {
      return NextResponse.json(
        { success: false, error: "Invalid pincode format. Must be a 6-digit number." },
        { status: 400 }
      )
    }

    const { db } = await connectDb()
    const voters = await getVotersCollection()
    const pincodesCol = db.collection("pincodes")

    const query: Record<string, any> = {
      district_name: district_name.toUpperCase(),
      lb_name,
    }
    if (ward_number) query.ward_number = ward_number

    // 1. Update/Upsert pincodes cache collection
    await pincodesCol.updateOne(
      query,
      {
        $set: {
          district_name: district_name.toUpperCase(),
          lb_name,
          ward_name: ward_name || null,
          ward_number: ward_number || null,
          pincode: cleanPincode,
          resolved_at: new Date(),
          source: "manual",
        },
      },
      { upsert: true }
    )

    // 2. Update voter records matching this location criteria using compound index
    const voterQuery: Record<string, any> = {
      district_name: { $in: [district_name, district_name.toUpperCase()] },
      lb_name,
    }
    if (ward_number) voterQuery.ward_number = ward_number

    const updateResult = await voters.updateMany(voterQuery, {
      $set: { pincode: cleanPincode || undefined, updated_at: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: cleanPincode
        ? `Updated pincode ${cleanPincode} for ${lb_name}${ward_number ? ` (Ward ${ward_number})` : ""}`
        : `Cleared pincode for ${lb_name}${ward_number ? ` (Ward ${ward_number})` : ""}`,
      votersUpdated: updateResult.modifiedCount,
    })
  } catch (error) {
    console.error("Update pincode error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update pincode" },
      { status: 500 }
    )
  }
}
