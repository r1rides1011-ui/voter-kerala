import "dotenv/config";
import bcryptjs from "bcryptjs"; // IMPORTANT: use bcryptjs
import { connectDb } from "../lib/db"; // IMPORTANT: no alias paths!

async function main() {
  const { db } = await connectDb();

  const username = "admin";
  const password = "admin123";
  const hashed = await bcryptjs.hash(password, 10);

  await db.collection("users").insertOne({
    username,
    password: hashed,
    role: "admin",
    createdAt: new Date(),
  });

  console.log("✅ Admin created");
  console.log("username:", username);
  console.log("password:", password);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
