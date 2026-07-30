import { NextRequest, NextResponse } from "next/server"
import { connectDb, getVotersCollection } from "@/lib/db"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const jsonPath = path.join(process.cwd(), "resolved_pincodes.json")
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json(
        { success: false, error: "resolved_pincodes.json file not found on server" },
        { status: 404 }
      )
    }

    const fileData = fs.readFileSync(jsonPath, "utf-8")
    const records = JSON.parse(fileData)

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON format in resolved_pincodes.json" },
        { status: 400 }
      )
    }

    const { db } = await connectDb()
    const voters = await getVotersCollection()
    const pincodesCol = db.collection("pincodes")

    let syncedCount = 0
    let votersUpdatedTotal = 0

    for (const record of records) {
      const { district_name, lb_name, ward_number, ward_name, resolved_pincode } = record
      if (!resolved_pincode || !district_name || !lb_name || !ward_number) continue

      const pincode = String(resolved_pincode).trim()
      if (!/^\d{6}$/.test(pincode)) continue

      // Upsert into pincodes cache
      await pincodesCol.updateOne(
        {
          district_name: district_name.toUpperCase(),
          lb_name,
          ward_number,
        },
        {
          $set: {
            district_name: district_name.toUpperCase(),
            lb_name,
            ward_name: ward_name || null,
            ward_number,
            pincode,
            resolved_at: new Date(),
            source: "json_import",
          },
        },
        { upsert: true }
      )

      // Update voter records using compound index
      const updateRes = await voters.updateMany(
        {
          district_name: { $in: [district_name, district_name.toUpperCase()] },
          lb_name,
          ward_number,
        },
        { $set: { pincode } }
      )

      syncedCount++
      votersUpdatedTotal += updateRes.modifiedCount
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${syncedCount} pincode mappings from JSON. Updated ${votersUpdatedTotal} voter documents.`,
      summary: {
        totalInJson: records.length,
        syncedCount,
        votersUpdatedTotal,
      },
    })
  } catch (error) {
    console.error("Import JSON pincodes error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to import pincodes from JSON" },
      { status: 500 }
    )
  }
}
