import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFavorites } from "@/lib/models/user"
import { getVoterBySecId } from "@/lib/voters"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  // If user not logged in → return empty list safely
  if (!session?.user?.username) {
    return NextResponse.json([], { status: 200 })
  }

  const username = session.user.username

  // Fetch list of favorite SEC IDs
  const favIds: string[] = await getFavorites(username)

  if (!favIds || favIds.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  // Fetch all voters in parallel for speed
  const voters = (
    await Promise.all(
      favIds.map((sec_id) => getVoterBySecId(sec_id))
    )
  ).filter(Boolean) // Remove null results

  return NextResponse.json(voters, { status: 200 })
}
