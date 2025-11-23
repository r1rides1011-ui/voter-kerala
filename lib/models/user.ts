import { ObjectId } from "mongodb";
import { connectDb } from "@/lib/db";

export interface User {
  _id?: ObjectId;
  username: string;
  password: string;
  role: "admin" | "user";
  favorites?: string[]; // ❤️ Store SEC IDs
  createdAt?: Date;
}

export async function getUsersCollection() {
  const { db } = await connectDb();
  return db.collection<User>("users");
}

// 🔍 Find user by username
export async function getUser(username: string): Promise<User | null> {
  const users = await getUsersCollection();
  return users.findOne({ username });
}

// 🆕 Create a new user (initialize favorites)
export async function createUser(data: {
  username: string;
  password: string;
  role?: "admin" | "user";
}): Promise<User> {
  const users = await getUsersCollection();

  const newUser: User = {
    username: data.username,
    password: data.password, // already hashed
    role: data.role || "user",
    favorites: [],           // ❤️ NEW FIELD
    createdAt: new Date(),
  };

  const result = await users.insertOne(newUser as any);

  return {
    _id: result.insertedId,
    ...newUser,
  };
}

// 🔄 Update user (password or role)
export async function updateUser(
  id: string,
  data: Partial<Omit<User, "_id">>
) {
  const users = await getUsersCollection();

  return users.updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );
}

//
// ❤️❤️❤️ FAVORITES SYSTEM ❤️❤️❤️
//

// ➕➖ Toggle favorite for a specific voter
export async function toggleFavorite(username: string, sec_id: string) {
  const users = await getUsersCollection();

  const user = await users.findOne({ username });

  if (!user) throw new Error("User not found");

  const isFav = user.favorites?.includes(sec_id);

  if (isFav) {
    // Remove
    await users.updateOne(
      { username },
      { $pull: { favorites: sec_id } }
    );
  } else {
    // Add
    await users.updateOne(
      { username },
      { $addToSet: { favorites: sec_id } }
    );
  }

  return { nowFavorite: !isFav };
}

// ✔ Check if voter is favorited
export async function isFavorite(username: string, sec_id: string) {
  const users = await getUsersCollection();
  const user = await users.findOne({ username });

  return user?.favorites?.includes(sec_id) ?? false;
}

// 🔍 Fetch all favorites for logged user
export async function getFavorites(username: string) {
  const users = await getUsersCollection();
  const user = await users.findOne({ username });

  return user?.favorites ?? [];
}
