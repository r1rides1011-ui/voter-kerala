import { connectDb, ensureIndexes } from "../lib/db";

async function main() {
  console.log("🚀 Initializing index creation on MongoDB for 3 Crore Records...");
  const { db } = await connectDb();
  await ensureIndexes(db);
  console.log("✅ All database indexes created successfully in background!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Index setup failed:", err);
  process.exit(1);
});
