import { connectDb } from "@/lib/db";

export async function getVoterBySecId(sec_id: string) {
  const { db } = await connectDb();
  const voters = db.collection("voters");

  return voters.findOne({ sec_id });
}
