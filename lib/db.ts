import { MongoClient, Db, Collection } from "mongodb";
import type { Voter } from "@/lib/types";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.DB_NAME || "kerala_voters";
const collectionName = process.env.COLLECTION_NAME || "voters";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb() {
  if (client && db) {
    return { client, db };
  }

  if (!uri) {
    throw new Error("❌ MONGODB_URI is missing in .env");
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);

  console.log("✅ MongoDB connected to:", dbName);
  return { client, db };
}

export async function getVotersCollection(): Promise<Collection<Voter>> {
  const { db } = await connectDb();
  return db.collection<Voter>(collectionName);
}

export function getMongoDbUrl() {
  return uri;
}
