import { MongoClient, Db, Collection } from "mongodb";
import type { Voter } from "@/lib/types";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.DB_NAME || "kerala_voters";
const collectionName = process.env.COLLECTION_NAME || "voters";

let client: MongoClient | null = null;
let db: Db | null = null;
let indexesEnsured = false;

export async function connectDb() {
  if (client && db) {
    return { client, db };
  }

  if (!uri) {
    throw new Error("❌ MONGODB_URI is missing in .env");
  }

  client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  });

  await client.connect();
  db = client.db(dbName);

  console.log("✅ MongoDB connected to:", dbName);

  // Trigger background index check asynchronously once
  if (!indexesEnsured) {
    indexesEnsured = true;
    ensureIndexes(db).catch((err) =>
      console.error("⚠️ Background index creation notice:", err.message)
    );
  }

  return { client, db };
}

export async function ensureIndexes(database: Db) {
  const votersCol = database.collection(collectionName);
  const pincodesCol = database.collection("pincodes");

  // Create critical compound & single field indexes in background
  const voterIndexes = [
    { key: { sec_id: 1 }, options: { unique: true, sparse: true, background: true } },
    { key: { district_code: 1, lb_code: 1, ward_number: 1, booth_number: 1 }, options: { background: true } },
    { key: { district_code: 1, lb_code: 1, ward_number: 1, name: 1 }, options: { background: true } },
    { key: { district_name: 1, lb_name: 1, ward_number: 1 }, options: { background: true } },
    { key: { pincode: 1 }, options: { background: true } },
    { key: { phone: 1 }, options: { background: true, sparse: true } },
    { key: { gender: 1 }, options: { background: true } },
    { key: { voter_status: 1 }, options: { background: true } },
    { key: { latitude: 1, longitude: 1 }, options: { background: true, sparse: true } },
  ];

  for (const idx of voterIndexes) {
    await votersCol.createIndex(idx.key as any, idx.options).catch(() => {});
  }

  // Pincodes collection compound index
  await pincodesCol
    .createIndex(
      { district_name: 1, lb_name: 1, ward_number: 1 },
      { unique: true, background: true }
    )
    .catch(() => {});
}

export async function getVotersCollection(): Promise<Collection<Voter>> {
  const { db } = await connectDb();
  return db.collection<Voter>(collectionName);
}

export function getMongoDbUrl() {
  return uri;
}

