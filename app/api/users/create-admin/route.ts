import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { getUsersCollection } from "@/lib/models/user";

// 👇 PUBLIC: Create first admin with GET
export async function GET() {
  const users = await getUsersCollection();

  const count = await users.countDocuments();

  // If admin/user exists → block
  if (count > 0) {
    return NextResponse.json(
      { error: "Users already exist. GET admin creation disabled." },
      { status: 403 }
    );
  }

  const username = "admin";
  const password = "admin123";
  const hashed = await bcryptjs.hash(password, 10);

  await users.insertOne({
    username,
    password: hashed,
    role: "admin",
    createdAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: "Initial admin created",
    username,
    password,
  });
}
