"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { ProfileCard } from "@/components/profile-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Voter } from "@/lib/types"
import { LoadingSkeleton } from "@/components/loading-skeleton"

import {
  Edit,
  MapPin,
  Users,
  Map,
  User,
  Briefcase,
  Hash,
  Phone,
  Heart,
} from "lucide-react"

// -----------------------------------------
// SMALL DETAIL DISPLAY COMPONENT
// -----------------------------------------
const DetailItem = ({
  label,
  value,
  icon: Icon,
  isLink = false,
}: {
  label: string
  value: string | number | null | undefined
  icon?: React.ElementType
  isLink?: boolean
}) => (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center text-xs font-medium text-muted-foreground">
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {label}
    </div>

    {isLink && value ? (
      <a
        href={`tel:+91${value}`}
        className="font-semibold text-sm hover:underline flex items-center gap-1"
      >
        {value}
      </a>
    ) : (
      <p className="font-semibold text-sm">{value || "-"}</p>
    )}
  </div>
)

export default function VoterProfilePage() {
  const params = useParams()
  const sec_id = params.sec_id as string

  const [voter, setVoter] = useState<Voter | null>(null)
  const [household, setHousehold] = useState<Voter[]>([])
  const [loading, setLoading] = useState(true)

  // ❤️ Favorite state
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  // -----------------------------------------
  // FETCH VOTER BY SEC ID
  // -----------------------------------------
  useEffect(() => {
    const fetchVoter = async () => {
      try {
        const res = await axios.get(`/api/voters/${sec_id}`)
        setVoter(res.data.data)
      } catch (err) {
        console.error("Failed to fetch voter:", err)
        setVoter(null)
      } finally {
        setLoading(false)
      }
    }

    if (sec_id) fetchVoter()
  }, [sec_id])

  // -----------------------------------------
  // LOAD FAVORITE STATUS
  // -----------------------------------------
  useEffect(() => {
    if (!voter) return

    const loadFav = async () => {
      try {
        const res = await axios.get("/api/favorites/list")
        const list: Voter[] = res.data.data || []
        setIsFavorite(list.some((v) => v.sec_id === voter.sec_id))
      } catch (err) {
        console.error("Failed to load favorites:", err)
      }
    }

    loadFav()
  }, [voter])

  // -----------------------------------------
  // TOGGLE FAVORITE
  // -----------------------------------------
  const toggleFavorite = async () => {
    if (!voter) return

    setFavLoading(true)
    try {
      const res = await axios.post("/api/favorites/toggle", {
        sec_id: voter.sec_id,
      })
      setIsFavorite(res.data.favorite)
    } catch (err) {
      console.error("Favorite toggle failed:", err)
    } finally {
      setFavLoading(false)
    }
  }

  // -----------------------------------------
  // FETCH HOUSEHOLD MEMBERS
  // -----------------------------------------
  useEffect(() => {
    if (
      !voter ||
      !voter.house_no ||
      !voter.ward_number ||
      !voter.district_code ||
      !voter.lb_code
    )
      return

    const fetchHousehold = async () => {
      try {
        const res = await axios.get("/api/voters", {
          params: {
            house_no: voter.house_no,
            ward_number: voter.ward_number,
            district_code: voter.district_code,
            lb_code: voter.lb_code,
          },
        })

        const clean = (res.data.data || []).filter(
          (h: Voter) => h.sec_id !== voter.sec_id
        )

        setHousehold(clean)
      } catch (err) {
        console.error("Failed to fetch household:", err)
      }
    }

    fetchHousehold()
  }, [voter])

  // -----------------------------------------
  // LOADING + NOT FOUND CHECKS
  // -----------------------------------------
  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    )

  if (!voter)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-xl font-semibold text-red-500">Voter not found.</p>
          <p className="text-muted-foreground mt-2">
            Unable to fetch profile for SEC ID: <b>{sec_id}</b>
          </p>
        </main>
      </div>
    )

  // -----------------------------------------
  // GOOGLE MAPS LINK
  // -----------------------------------------
  const googleMapsUrl =
    voter.latitude && voter.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${voter.latitude},${voter.longitude}`
      : null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b pb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold text-primary truncate">
              {voter.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold">
                <Hash className="w-3 h-3" /> {voter.sec_id}
              </span>

              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {voter.gender || "Gender N/A"}
              </span>

              <span className="px-3 py-1 bg-muted rounded-full text-xs font-medium">
                {voter.age ?? "-"} yrs
              </span>

              <span className="px-3 py-1 bg-muted rounded-full text-xs font-medium">
                Booth: {voter.booth_number || "-"}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 mt-4 sm:mt-0 sm:ml-6">
            {/* ❤️ Favorite */}
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`p-2 rounded-full transition ${
                isFavorite ? "text-red-500" : "text-muted-foreground"
              } hover:bg-muted`}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500" : ""}`} />
            </button>

            {/* Edit */}
            <Button asChild>
              <Link
                href={`/voter/${voter.sec_id}/edit`}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" /> Edit Profile
              </Link>
            </Button>
          </div>
        </div>

        {/* GRID: LEFT + RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERSONAL DETAILS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <User className="w-5 h-5 text-primary" /> Personal Details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <ProfileCard voter={voter} />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mt-8">
                  <DetailItem label="Guardian Name" value={voter.guardian_name} />
                  <DetailItem label="Phone Number" value={voter.phone} icon={Phone} isLink />
                  <DetailItem label="House Number" value={voter.house_no} />
                  <DetailItem label="House Name" value={voter.house_name} />
                </div>
              </CardContent>
            </Card>

            {/* ADMIN + ADDRESS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Briefcase className="w-5 h-5 text-primary" /> Administrative & Address Details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <DetailItem label="State" value={voter.state} />
                  <DetailItem
                    label="District"
                    value={`${voter.district_name} (${voter.district_code})`}
                  />
                  <DetailItem
                    label="Local Body"
                    value={`${voter.lb_name} (${voter.lb_code})`}
                  />
                  <DetailItem
                    label="Ward"
                    value={`${voter.ward_number} - ${voter.ward_name}`}
                  />
                </div>

                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Geographic Coordinates
                  </h3>

                  <div className="flex flex-wrap gap-8">
                    <DetailItem label="Latitude" value={voter.latitude} />
                    <DetailItem label="Longitude" value={voter.longitude} />

                    {googleMapsUrl ? (
                      <div className="self-end">
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          <Map className="w-4 h-4" /> Open in Google Maps
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-600 self-center">
                        Location coordinates not available.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE — HOUSEHOLD MEMBERS */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Users className="w-5 h-5 text-primary" /> Household Members
                </CardTitle>
              </CardHeader>

              <CardContent>
                {household.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No other registered voters found in house <b>{voter.house_no}</b>.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {household.map((h) => (
                      <li
                        key={h._id}
                        className="p-3 border rounded-lg hover:bg-muted/10 transition group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/voter/${h.sec_id}`} className="block">
                              <p className="font-semibold text-base group-hover:text-primary">
                                {h.name}
                              </p>

                              <p className="text-xs text-muted-foreground mt-0.5">
                                {h.guardian_name || "Guardian"} • {h.age ?? "-"} yrs •{" "}
                                {h.gender || "N/A"}
                              </p>
                            </Link>
                          </div>

                          {h.phone ? (
                            <a
                              href={`tel:+91${h.phone}`}
                              className="p-2 rounded-full hover:bg-primary/10 text-primary"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
