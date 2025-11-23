"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Voter } from "@/lib/types"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { Locate } from "lucide-react"

import dynamic from "next/dynamic"

// React Leaflet dynamic imports
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false })
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-markercluster"),
  { ssr: false }
)

export default function MapPage() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [loading, setLoading] = useState(true)
  const [mapRef, setMapRef] = useState<any>(null)
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null)

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        const response = await axios.get("/api/map")
        setVoters(response.data.data || [])
      } catch (error) {
        console.error("Failed to fetch voters:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVoters()
  }, [])

  // Center map on selected voter
  useEffect(() => {
    if (selectedVoter && mapRef) {
      mapRef.setView([selectedVoter.latitude, selectedVoter.longitude], 18, {
        animate: true,
      })
    }
  }, [selectedVoter, mapRef])

  // Locate Me
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef) return

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      mapRef.setView([latitude, longitude], 16, { animate: true })
    })
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    )

  const votersWithLocation = voters.filter(
    (v) => v.latitude && v.longitude
  )

  // Group voters by identical lat/lng
  const groups = votersWithLocation.reduce((acc, v) => {
    const key = `${v.latitude}_${v.longitude}`
    if (!acc[key]) acc[key] = []
    acc[key].push(v)
    return acc
  }, {} as Record<string, Voter[]>)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Voter Map</h1>

          <Button
            onClick={handleLocateMe}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <Locate className="w-4 h-4" />
            Locate Me
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* MAP CONTAINER */}
          <div className="lg:col-span-3 h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[10.1, 76.3]} // Default map center
              zoom={12}
              scrollWheelZoom={true}
              className="h-full w-full z-0"
              whenCreated={setMapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <MarkerClusterGroup chunkedLoading>
                {Object.keys(groups).map((key) => {
                  const group = groups[key]
                  const first = group[0]
                  const position = [
                    first.latitude,
                    first.longitude,
                  ] as [number, number]

                  return (
                    <Marker key={key} position={position}>
                      <Popup>
                        <div className="space-y-3 w-56">

                          {/* Header */}
                          <div className="pb-2 border-b">
                            <p className="text-sm font-semibold">
                              Household Members
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {group.length} person(s) at this location
                            </p>
                          </div>

                          {/* Member List */}
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {group.map((voter) => (
                              <div
                                key={voter._id}
                                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                              >
                                <p className="text-sm font-medium">
                                  {voter.name}
                                </p>

                                <span className="text-[10px] text-white bg-blue-600 px-2 py-0.5 rounded-full w-fit mt-1 inline-block">
                                  {voter.sec_id}
                                </span>

                                <Link
                                  href={`/voter/${voter.sec_id}`}
                                  className="text-xs text-blue-600 underline mt-1 inline-block"
                                >
                                  View Profile
                                </Link>
                              </div>
                            ))}
                          </div>

                          {/* Footer actions */}
                          <div className="pt-2 border-t flex items-center justify-between">
                            <a
                              href={`https://www.google.com/maps?q=${first.latitude},${first.longitude}`}
                              target="_blank"
                              className="text-xs bg-gray-900 text-white px-2 py-1 rounded-md hover:bg-black transition"
                            >
                              Open in Maps
                            </a>

                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="px-2 py-1 text-xs rounded-md"
                            >
                              <Link href={`/voter/${first.sec_id}`}>
                                Main Profile
                              </Link>
                            </Button>
                          </div>

                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MarkerClusterGroup>
            </MapContainer>
          </div>

          {/* SIDEBAR LIST */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-4">
              Voters with Locations ({votersWithLocation.length})
            </h3>

            {votersWithLocation.map((voter) => (
              <Card
                key={voter._id}
                className="p-3 cursor-pointer hover:bg-accent transition"
                onClick={() => setSelectedVoter(voter)}
              >
                <p className="font-medium text-sm">{voter.name}</p>
                <p className="text-xs text-muted-foreground">
                  {voter.sec_id}
                </p>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 bg-transparent"
                >
                  <Link href={`/voter/${voter.sec_id}`}>View</Link>
                </Button>
              </Card>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
