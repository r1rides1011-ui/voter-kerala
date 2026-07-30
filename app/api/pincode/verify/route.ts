import { NextRequest, NextResponse } from "next/server"
import { connectDb } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { district_name, lb_name, ward_number, is_verified, is_flagged } = body

    if (!district_name || !lb_name) {
      return NextResponse.json(
        { success: false, error: "District name and Local Body name are required" },
        { status: 400 }
      )
    }

    const { db } = await connectDb()
    const pincodesCol = db.collection("pincodes")

    const query: Record<string, any> = {
      district_name: district_name.toUpperCase(),
      lb_name,
    }
    if (ward_number) query.ward_number = ward_number

    const updateDoc: Record<string, any> = {
      verified_at: is_verified ? new Date() : null,
      is_verified: !!is_verified,
      is_flagged: !!is_flagged,
    }

    if (is_verified) {
      updateDoc.source = "manual_verified"
      updateDoc.is_flagged = false
    }

    await pincodesCol.updateOne(
      query,
      { $set: updateDoc },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: is_verified
        ? `Location marked as Verified ✅`
        : is_flagged
        ? `Location marked for Re-verification ⚠️`
        : `Verification status updated`,
    })
  } catch (error) {
    console.error("Verification update error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update verification status" },
      { status: 500 }
    )
  }
}
