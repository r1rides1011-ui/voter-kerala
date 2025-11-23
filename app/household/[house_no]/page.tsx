"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Household } from "@/lib/types"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { Users } from "lucide-react"

export default function HouseholdPage() {
  const params = useParams()
  const house_no = params.house_no as string
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHousehold = async () => {
      try {
        const response = await axios.get(`/api/household/${house_no}`)
        setHousehold(response.data.data)
      } catch (error) {
        console.error("Failed to fetch household:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHousehold()
  }, [house_no])

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    )

  if (!household)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Household not found.</p>
        </main>
      </div>
    )

  const sortedMembers = [...household.members].sort((a, b) => b.age - a.age)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Users className="w-8 h-8" />
          Household: {household.house_name || household.house_no}
        </h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Household Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">House No</p>
              <p className="font-semibold">{household.house_no}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ward</p>
              <p className="font-semibold">{household.ward_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Booth</p>
              <p className="font-semibold">{household.booth_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="font-semibold">{household.members.length}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Members (sorted by age)</h2>
          {sortedMembers.map((member) => (
            <Card key={member._id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{member.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-semibold">{member.age}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-semibold">{member.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sec ID</p>
                    <p className="font-semibold">{member.sec_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold">{member.phone || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
