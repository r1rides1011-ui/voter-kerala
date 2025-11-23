"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { Hero3D } from "@/components/Hero3D"
import { GlassCard } from "@/components/GlassCard"
import { motion } from "framer-motion"

interface Stats {
  total_voters: number
  total_wards: number
  total_booths: number
  active_voters: number

  male_count: number
  female_count: number
  other_gender_count: number

  flagged_voters: number
  with_phone: number
  with_location: number
  missing_location: number

  avg_age: number | null
}

interface MetaItem {
  code: string
  name: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const [district, setDistrict] = useState("all")
  const [lb, setLb] = useState("all")
  const [ward, setWard] = useState("all")
  const [booth, setBooth] = useState("all")

  const [districts, setDistricts] = useState<MetaItem[]>([])
  const [lbs, setLbs] = useState<MetaItem[]>([])
  const [wards, setWards] = useState<MetaItem[]>([])
  const [booths, setBooths] = useState<MetaItem[]>([])

  // Load district + LB names
  useEffect(() => {
    async function loadMeta() {
      try {
        const d = await axios.get("/api/voters/meta?type=districts")
        setDistricts(d.data.data || [])

        const lbRes = await axios.get("/api/voters/meta?type=lbs")
        setLbs(lbRes.data.data || [])
      } catch (err) {
        console.error("Meta load error:", err)
      }
    }
    loadMeta()
  }, [])

  // Wards + Booths update on district/lb change
  useEffect(() => {
    async function loadChildren() {
      try {
        if (district !== "all") {
          const w = await axios.get(`/api/voters/meta?type=wards&district=${district}`)
          setWards(w.data.data || [])
        } else {
          setWards([])
        }

        if (lb !== "all") {
          const b = await axios.get(`/api/voters/meta?type=booths&lb=${lb}`)
          setBooths(b.data.data || [])
        } else {
          setBooths([])
        }
      } catch (e) {
        console.error("Child meta error", e)
      }
    }
    loadChildren()
  }, [district, lb])

  // Load statistics
  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (district !== "all") params.set("district", district)
        if (lb !== "all") params.set("lb", lb)
        if (ward !== "all") params.set("ward", ward)
        if (booth !== "all") params.set("booth", booth)

        const res = await axios.get(`/api/voters/stats?${params.toString()}`)
        setStats(res.data.data)
      } catch (err) {
        console.error("Stats Error:", err)
        setStats(null)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [district, lb, ward, booth])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="container mx-auto px-4 py-6 space-y-12">
        <Hero3D />

        {/* FILTERS */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Filter Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* District */}
            <select
              aria-label="Select district"
              className="bg-black/20 border border-white/10 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value)
                setLb("all")
                setWard("all")
                setBooth("all")
              }}
            >
              <option value="all">All Districts</option>
              {districts.map((d) => (
                <option key={`district-${d.code}-${d.name}`} value={d.code} className="bg-background">
                  {d.name || d.code}
                </option>
              ))}
            </select>

            {/* LB */}
            <select
              aria-label="Select local body"
              className="bg-black/20 border border-white/10 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={lb}
              onChange={(e) => {
                setLb(e.target.value)
                setWard("all")
                setBooth("all")
              }}
            >
              <option value="all">All Local Bodies</option>
              {lbs.map((l) => (
                <option key={`lb-${l.code}-${l.name}`} value={l.code} className="bg-background">
                  {l.name || l.code}
                </option>
              ))}
            </select>

            {/* Ward */}
            <select
              aria-label="Select ward"
              className="bg-black/20 border border-white/10 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={ward}
              onChange={(e) => {
                setWard(e.target.value)
                setBooth("all")
              }}
            >
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={`ward-${w.code}-${w.name}`} value={w.code} className="bg-background">
                  {w.code} — {w.name || "Unnamed Ward"}
                </option>
              ))}
            </select>

            {/* Booth */}
            <select
              aria-label="Select booth"
              className="bg-black/20 border border-white/10 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={booth}
              onChange={(e) => setBooth(e.target.value)}
            >
              <option value="all">All Booths</option>
              {booths.map((b) => (
                <option key={`booth-${b.code}-${b.name}`} value={b.code} className="bg-background">
                  {b.code} — {b.name || "Unnamed Booth"}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        {/* STATISTICS */}
        {loading ? (
          <LoadingSkeleton />
        ) : stats ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <GlassCard className="flex flex-col items-center justify-center text-center">
              <h2 className="text-sm text-muted-foreground uppercase tracking-wider">Total Voters</h2>
              <p className="text-4xl font-bold text-primary mt-2">{stats.total_voters?.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center text-center">
              <h2 className="text-sm text-muted-foreground uppercase tracking-wider">Wards</h2>
              <p className="text-4xl font-bold text-secondary-foreground mt-2">{stats.total_wards?.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center text-center">
              <h2 className="text-sm text-muted-foreground uppercase tracking-wider">Booths</h2>
              <p className="text-4xl font-bold text-accent-foreground mt-2">{stats.total_booths?.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center text-center">
              <h2 className="text-sm text-muted-foreground uppercase tracking-wider">Active Profiles</h2>
              <p className="text-4xl font-bold text-green-400 mt-2">{stats.active_voters?.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">Male</h2>
                <p className="text-2xl font-semibold">{stats.male_count?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">Female</h2>
                <p className="text-2xl font-semibold">{stats.female_count?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">Other</h2>
                <p className="text-2xl font-semibold">{stats.other_gender_count?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">Avg Age</h2>
                <p className="text-2xl font-semibold">{stats.avg_age ?? "-"}</p>
              </div>
            </GlassCard>

            <GlassCard className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">Flagged</h2>
                <p className="text-2xl font-semibold text-red-400">{stats.flagged_voters?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">With Phone</h2>
                <p className="text-2xl font-semibold text-blue-400">{stats.with_phone?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">GPS Marked</h2>
                <p className="text-2xl font-semibold text-green-400">{stats.with_location?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <h2 className="text-xs text-muted-foreground">GPS Missing</h2>
                <p className="text-2xl font-semibold text-yellow-400">{stats.missing_location?.toLocaleString()}</p>
              </div>
            </GlassCard>

          </motion.div>
        ) : (
          <p className="text-center text-muted-foreground mt-10">Failed to load statistics.</p>
        )}

        {/* ACTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
          <GlassCard className="group cursor-pointer flex flex-col items-center justify-center p-10 hover:bg-primary/10 border-primary/20 transition-all duration-500 hover:scale-[1.02]">
            <Link href="/search" className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <span className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">Search Voters</span>
              <p className="text-sm text-muted-foreground text-center">Find voters by ID, name, or location details.</p>
            </Link>
          </GlassCard>

          <GlassCard className="group cursor-pointer flex flex-col items-center justify-center p-10 hover:bg-secondary/10 border-secondary/20 transition-all duration-500 hover:scale-[1.02]">
            <Link href="/map" className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary-foreground"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <span className="text-2xl font-bold tracking-tight group-hover:text-secondary-foreground transition-colors">View Map</span>
              <p className="text-sm text-muted-foreground text-center">Visualize voter distribution geographically.</p>
            </Link>
          </GlassCard>

          <GlassCard className="group cursor-pointer flex flex-col items-center justify-center p-10 hover:bg-accent/10 border-accent/20 transition-all duration-500 hover:scale-[1.02]">
            <Link href="/all" className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <span className="text-2xl font-bold tracking-tight group-hover:text-accent-foreground transition-colors">All Voters</span>
              <p className="text-sm text-muted-foreground text-center">Browse the complete voter database.</p>
            </Link>
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
