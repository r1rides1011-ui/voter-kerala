"use client"

import { useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Voter } from "@/lib/types"

export default function AddVoterPage() {
  const router = useRouter()
  const [voter, setVoter] = useState<Partial<Voter>>({
    gender: "M",
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)

    try {
      await axios.post("/api/voters/add", voter)
      router.push("/search")
    } catch (error) {
      console.error("Failed to add voter:", error)
      alert("Failed to add voter")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Add New Voter</h1>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={voter.name || ""}
                  onChange={(e) => setVoter({ ...voter, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sec ID *</label>
                <Input
                  value={voter.sec_id || ""}
                  onChange={(e) => setVoter({ ...voter, sec_id: e.target.value })}
                  placeholder="Enter Sec ID"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Age *</label>
                <Input
                  type="number"
                  value={voter.age || ""}
                  onChange={(e) => setVoter({ ...voter, age: e.target.value ? Number.parseInt(e.target.value) : 0 })}
                  placeholder="Enter age"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender *</label>
                <select
                  value={voter.gender || "M"}
                  onChange={(e) => setVoter({ ...voter, gender: e.target.value as "M" | "F" | "Other" })}
                  className="w-full px-3 py-2 border border-border rounded-md"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Guardian Name *</label>
                <Input
                  value={voter.guardian_name || ""}
                  onChange={(e) => setVoter({ ...voter, guardian_name: e.target.value })}
                  placeholder="Enter guardian name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">House No *</label>
                <Input
                  value={voter.house_no || ""}
                  onChange={(e) => setVoter({ ...voter, house_no: e.target.value })}
                  placeholder="Enter house number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">House Name</label>
                <Input
                  value={voter.house_name || ""}
                  onChange={(e) => setVoter({ ...voter, house_name: e.target.value })}
                  placeholder="Enter house name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ward Number *</label>
                <Input
                  type="number"
                  value={voter.ward_number || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, ward_number: e.target.value ? Number.parseInt(e.target.value) : 0 })
                  }
                  placeholder="Enter ward number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Booth Number *</label>
                <Input
                  type="number"
                  value={voter.booth_number || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, booth_number: e.target.value ? Number.parseInt(e.target.value) : 0 })
                  }
                  placeholder="Enter booth number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={voter.phone || ""}
                  onChange={(e) => setVoter({ ...voter, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Alternate Phone</label>
                <Input
                  value={voter.alternate_phone || ""}
                  onChange={(e) => setVoter({ ...voter, alternate_phone: e.target.value })}
                  placeholder="Enter alternate phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Latitude</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={voter.latitude || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, latitude: e.target.value ? Number.parseFloat(e.target.value) : undefined })
                  }
                  placeholder="Enter latitude"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={voter.longitude || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, longitude: e.target.value ? Number.parseFloat(e.target.value) : undefined })
                  }
                  placeholder="Enter longitude"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Adding..." : "Add Voter"}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
