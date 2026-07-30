import { MongoClient } from "mongodb"
import fs from "fs"
import path from "path"

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

  console.log("Connecting to MongoDB...")
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  // 1. Update pincodes collection for Mala Ward 010
  const pRes = await db.collection("pincodes").updateOne(
    { district_name: "THRISSUR", lb_name: "Mala", ward_number: "010" },
    {
      $set: {
        district_name: "THRISSUR",
        lb_name: "Mala",
        ward_number: "010",
        ward_name: "CHAKKAMPARAMBU",
        pincode: "680732",
        resolved_at: new Date(),
        source: "manual_verified",
        is_verified: true,
        is_flagged: false,
      },
    },
    { upsert: true }
  )

  // 2. Update voters collection for Mala Ward 010
  const vRes = await db.collection("voters").updateMany(
    { district_name: { $regex: /^THRISSUR$/i }, lb_name: "Mala", ward_number: "010" },
    { $set: { pincode: "680732" } }
  )

  console.log("✅ Pincodes collection entry updated:", pRes.modifiedCount || pRes.upsertedCount || 1)
  console.log(`✅ Voters collection updated: ${vRes.modifiedCount} voter documents in Mala Ward 010 set to 680732`)

  // 3. Update resolved_pincodes.json
  const jsonPath = path.join(process.cwd(), "resolved_pincodes.json")
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    let count = 0
    for (const item of data) {
      if (item.district_name === "THRISSUR" && item.lb_name === "Mala" && item.ward_number === "010") {
        item.resolved_pincode = "680732"
        count++
      }
    }
    if (count > 0) {
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2))
      console.log("✅ Updated resolved_pincodes.json for Mala Ward 010")
    }
  }

  await client.close()
}

main().catch(console.error)
