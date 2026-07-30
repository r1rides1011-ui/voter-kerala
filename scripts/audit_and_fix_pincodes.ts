import { MongoClient } from "mongodb"
import fs from "fs"
import path from "path"

// Standard known local body pincode mappings for Kerala regions
const LOCAL_BODY_DEFAULT_PINCODES: Record<string, { defaultPin: string; prefix: string }> = {
  ALUVA: { defaultPin: "683101", prefix: "683" },
  KOTTUVALLY: { defaultPin: "683519", prefix: "683" },
  MALA: { defaultPin: "680732", prefix: "680" },
  ANNAMANADA: { defaultPin: "680741", prefix: "680" },
}

// Specific Ward Name overrides
const WARD_SPECIFIC_PINCODES: Record<string, string> = {
  // Mala Wards
  "MALA|008": "680732", // Koonamparambu / Mala
  "MALA|007": "680733", // Ambazhakkad
  "MALA|019": "680736", // Vadama
  // Annamanada Wards
  "ANNAMANADA|005": "680741", // Annamanada Town
  "ANNAMANADA|003": "680731", // Vennoor
  // Kottuvally Wards
  "KOTTUVALLY|012": "683518", // Koonammavu
  "KOTTUVALLY|010": "683519", // Valluvally
}

async function main() {
  let uri = "mongodb://localhost:27017"
  let dbName = "kerala_voters"

  const envPath = path.join(process.cwd(), ".env.local")
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf8").split("\n")
    for (const line of envLines) {
      if (line.startsWith("MONGODB_URI=")) uri = line.replace("MONGODB_URI=", "").trim()
      if (line.startsWith("DB_NAME=")) dbName = line.replace("DB_NAME=", "").trim()
    }
  }

  console.log("🔍 Auditing pincode accuracy in MongoDB...")
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  const pincodesCol = db.collection("pincodes")
  const votersCol = db.collection("voters")

  const allPincodes = await pincodesCol.find({}).toArray()
  let fixedCount = 0
  let totalVotersFixed = 0

  for (const p of allPincodes) {
    const lbUpper = p.lb_name?.toUpperCase()?.trim() || ""
    const wardKey = `${lbUpper}|${p.ward_number}`
    const lbConfig = LOCAL_BODY_DEFAULT_PINCODES[lbUpper]

    let correctPin: string | null = null

    // 1. Check specific ward override
    if (WARD_SPECIFIC_PINCODES[wardKey]) {
      correctPin = WARD_SPECIFIC_PINCODES[wardKey]
    }
    // 2. Check invalid prefix or wrong district pincode (e.g. 700001 Kolkata or 688xxx Alappuzha for Aluva)
    else if (p.pincode && lbConfig) {
      if (!p.pincode.startsWith(lbConfig.prefix)) {
        console.log(`⚠️ Invalid pincode detected for ${p.district_name} -> ${p.lb_name} Ward ${p.ward_number} (${p.ward_name}): current=${p.pincode}, setting to ${lbConfig.defaultPin}`)
        correctPin = lbConfig.defaultPin
      }
    }

    if (correctPin && correctPin !== p.pincode) {
      // Fix in pincodes collection
      await pincodesCol.updateOne(
        { _id: p._id },
        {
          $set: {
            pincode: correctPin,
            resolved_at: new Date(),
            source: "audited_fix",
            is_verified: true,
            is_flagged: false,
          },
        }
      )

      // Fix in voters collection
      const vRes = await votersCol.updateMany(
        {
          district_name: { $regex: new RegExp(`^${p.district_name}$`, "i") },
          lb_name: p.lb_name,
          ward_number: p.ward_number,
        },
        { $set: { pincode: correctPin } }
      )

      fixedCount++
      totalVotersFixed += vRes.modifiedCount
    }
  }

  // Also scan voters directly for any lingering invalid pincodes starting with non-683/680
  const invalidAluvaVoters = await votersCol.updateMany(
    { lb_name: "Aluva", pincode: { $not: /^683/ } },
    { $set: { pincode: "683101" } }
  )
  if (invalidAluvaVoters.modifiedCount > 0) {
    console.log(`✅ Fixed ${invalidAluvaVoters.modifiedCount} Aluva voters with out-of-district pincodes to 683101`)
    totalVotersFixed += invalidAluvaVoters.modifiedCount
  }

  console.log(`\n🎉 Audit Complete!`)
  console.log(`- Fixed ${fixedCount} location pincode errors`)
  console.log(`- Updated ${totalVotersFixed} voter records with accurate pincodes`)

  // Update resolved_pincodes.json
  const jsonPath = path.join(process.cwd(), "resolved_pincodes.json")
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    let jsonUpdated = 0
    for (const item of data) {
      const lb = item.lb_name?.toUpperCase()?.trim()
      const wKey = `${lb}|${item.ward_number}`
      if (WARD_SPECIFIC_PINCODES[wKey]) {
        item.resolved_pincode = WARD_SPECIFIC_PINCODES[wKey]
        jsonUpdated++
      } else if (item.resolved_pincode && LOCAL_BODY_DEFAULT_PINCODES[lb]) {
        const prefix = LOCAL_BODY_DEFAULT_PINCODES[lb].prefix
        if (!item.resolved_pincode.startsWith(prefix)) {
          item.resolved_pincode = LOCAL_BODY_DEFAULT_PINCODES[lb].defaultPin
          jsonUpdated++
        }
      }
    }
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2))
    console.log(`✅ Updated ${jsonUpdated} entries in resolved_pincodes.json`)
  }

  await client.close()
}

main().catch(console.error)
