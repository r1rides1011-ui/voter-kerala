import { NextRequest, NextResponse } from "next/server"
import { connectDb, getVotersCollection } from "@/lib/db"
import fs from "fs"
import path from "path"

// Known valid pincode prefix rules per local body (LB name uppercase)
const LB_PREFIX_RULES: Record<string, string> = {
  ALUVA: "683",
  KOTTUVALLY: "683",
  MALA: "680",
  ANNAMANADA: "680",
}

// Correct default pincodes per LB when no ward-specific pincode is stored
const LB_DEFAULTS: Record<string, string> = {
  ALUVA: "683101",
  KOTTUVALLY: "683519",
  MALA: "680732",  // Mala Grama Panchayat = 680732 (NOT 680555 which is Amalanagar)
  ANNAMANADA: "680741",
}

// Known WRONG pincodes that should never appear in these local bodies
const KNOWN_WRONG_PINCODES: Record<string, string[]> = {
  MALA: ["680555"],         // 680555 = Amalanagar, NOT Mala
  KOTTUVALLY: ["683101"],   // 683101 = Aluva, NOT Kottuvally main
  ALUVA: ["700001"],        // 700001 = Kolkata, obviously wrong
}

export async function POST(_req: NextRequest) {
  try {
    const { db } = await connectDb()
    const votersCol = await getVotersCollection()
    const pincodesCol = db.collection("pincodes")

    // ── Step 1: Load ground-truth from resolved_pincodes.json ──
    const jsonPath = path.join(process.cwd(), "resolved_pincodes.json")
    let jsonPincodes: Array<{
      district_name: string
      lb_name: string
      ward_number: string
      ward_name: string
      resolved_pincode: string | null
    }> = []

    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8")
      jsonPincodes = JSON.parse(raw)
    }

    // Build ground-truth map from JSON (only where pincode is not null)
    const groundTruth = new Map<string, string>()
    for (const item of jsonPincodes) {
      if (item.resolved_pincode) {
        const key = `${item.district_name?.toUpperCase()}|${item.lb_name}|${item.ward_number}`
        groundTruth.set(key, item.resolved_pincode)
      }
    }

    // ── Step 2: Also sync all JSON pincodes into the pincodes collection ──
    for (const item of jsonPincodes) {
      if (!item.resolved_pincode) continue
      await pincodesCol.updateOne(
        {
          district_name: item.district_name?.toUpperCase(),
          lb_name: item.lb_name,
          ward_number: item.ward_number,
        },
        {
          $set: {
            district_name: item.district_name?.toUpperCase(),
            lb_name: item.lb_name,
            ward_name: item.ward_name,
            ward_number: item.ward_number,
            pincode: item.resolved_pincode,
            resolved_at: new Date(),
            source: "json_import",
            is_flagged: false,
          },
        },
        { upsert: true }
      )
    }

    // ── Step 3: Get all distinct voter location combos ──
    const combos = await votersCol
      .aggregate([
        {
          $group: {
            _id: {
              district_name: "$district_name",
              lb_name: "$lb_name",
              ward_number: "$ward_number",
              ward_name: "$ward_name",
            },
            current_pincode: { $first: "$pincode" },
            voter_count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const fixedLocations: string[] = []
    let totalVotersUpdated = 0
    let skipped = 0

    for (const combo of combos) {
      const district_name: string = combo._id.district_name || ""
      const lb_name: string = combo._id.lb_name || ""
      const ward_number: string = combo._id.ward_number || ""
      const ward_name: string = combo._id.ward_name || ""
      const current_pincode: string | null = combo.current_pincode || null

      const lbUpper = lb_name.toUpperCase().trim()
      const districtUpper = district_name.toUpperCase().trim()
      const key = `${districtUpper}|${lb_name}|${ward_number}`

      let targetPin: string | null = null

      // ── Priority 1: Use verified ground-truth from JSON ──
      const jsonPin = groundTruth.get(key)
      if (jsonPin) {
        targetPin = jsonPin
      }

      // ── Priority 2: Check if current pincode is a KNOWN WRONG value ──
      const wrongPins = KNOWN_WRONG_PINCODES[lbUpper] || []
      if (!targetPin && current_pincode && wrongPins.includes(current_pincode)) {
        // Use LB default as the correction
        targetPin = LB_DEFAULTS[lbUpper] || null
      }

      // ── Priority 3: Prefix validation for missing or invalid pincodes ──
      if (!targetPin && LB_PREFIX_RULES[lbUpper]) {
        const prefix = LB_PREFIX_RULES[lbUpper]
        if (!current_pincode || !current_pincode.startsWith(prefix)) {
          targetPin = LB_DEFAULTS[lbUpper] || null
        }
      }

      if (!targetPin) {
        skipped++
        continue
      }

      // Only update if the pincode actually needs changing
      if (targetPin === current_pincode) {
        skipped++
        continue
      }

      // ── Update pincodes collection ──
      await pincodesCol.updateOne(
        { district_name: districtUpper, lb_name, ward_number },
        {
          $set: {
            district_name: districtUpper,
            lb_name,
            ward_name,
            ward_number,
            pincode: targetPin,
            resolved_at: new Date(),
            source: "audited_fix",
            is_flagged: false,
          },
        },
        { upsert: true }
      )

      // ── Update ALL matching voter records ──
      const vRes = await votersCol.updateMany(
        {
          district_name: { $in: [district_name, districtUpper] },
          lb_name,
          ward_number,
        },
        { $set: { pincode: targetPin, updated_at: new Date() } }
      )

      if (vRes.modifiedCount > 0) {
        fixedLocations.push(
          `${lb_name} Ward ${ward_number} (${ward_name}): ${current_pincode || "null"} → ${targetPin}`
        )
        totalVotersUpdated += vRes.modifiedCount
      }
    }

    // ── Step 4: Sweep — fix any remaining KNOWN WRONG pincodes still in voter records ──
    for (const [lbUpper, wrongPins] of Object.entries(KNOWN_WRONG_PINCODES)) {
      const defaultPin = LB_DEFAULTS[lbUpper]
      if (!defaultPin) continue

      // Find lb_name casing from combos
      const sampleCombo = combos.find(
        (c) => c._id.lb_name?.toUpperCase() === lbUpper
      )
      const lbName = sampleCombo?._id.lb_name || lbUpper

      for (const wrongPin of wrongPins) {
        const sweepRes = await votersCol.updateMany(
          { lb_name: lbName, pincode: wrongPin },
          { $set: { pincode: defaultPin, updated_at: new Date() } }
        )
        if (sweepRes.modifiedCount > 0) {
          fixedLocations.push(
            `${lbName} sweep: replaced wrong ${wrongPin} → ${defaultPin} (${sweepRes.modifiedCount} voters)`
          )
          totalVotersUpdated += sweepRes.modifiedCount
        }
      }
    }

    const fixedLocationsCount = fixedLocations.length

    return NextResponse.json({
      success: true,
      message:
        fixedLocationsCount > 0
          ? `Audit complete! Fixed ${fixedLocationsCount} location(s) and corrected ${totalVotersUpdated} voter record(s).`
          : `Audit complete! All voter pincodes are already correct. No changes needed.`,
      fixedLocationsCount,
      totalVotersUpdated,
      skipped,
      details: fixedLocations.slice(0, 50),
    })
  } catch (error) {
    console.error("Audit error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to run pincode audit. Please try again." },
      { status: 500 }
    )
  }
}
