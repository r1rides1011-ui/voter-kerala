"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import useSWR from "swr"
import axios from "axios"
import { useDebounce } from "@/hooks/use-debounce"
import { Navbar } from "@/components/navbar"
import { GlassCard } from "@/components/GlassCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VoterTable } from "@/components/voter-table"
import { Pagination } from "@/components/pagination"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import {
  RotateCcw,
  MapPin,
  User,
  Fingerprint,
  Home,
  Loader2,
  Search as SearchIcon,
  AlertCircle,
  ArrowLeft,
  Hash,
} from "lucide-react"

import type { Voter, SearchFilters } from "@/lib/types"

interface MetaItem {
  code: string
  name: string
}

const ITEMS_PER_PAGE = 30
const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({})
  const [currentPage, setCurrentPage] = useState(1)

  const [districts, setDistricts] = useState<MetaItem[]>([])
  const [lbs, setLbs] = useState<MetaItem[]>([])
  const [wards, setWards] = useState<MetaItem[]>([])
  const [booths, setBooths] = useState<MetaItem[]>([])

  const [lbSearch, setLbSearch] = useState("")
  const [wardSearch, setWardSearch] = useState("")
  const [boothSearch, setBoothSearch] = useState("")

  // Load all districts and lbs on mount
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

  // Update dependent dropdowns (lbs, wards, booths) when filter selections change
  useEffect(() => {
    async function updateLbsAndWards() {
      try {
        const distCode = filters.district_code || ""
        const lbCode = filters.lb_code || ""
        const wardNum = filters.ward_number || ""

        // If district is selected, filter LBs by district
        if (distCode) {
          const lbRes = await axios.get(`/api/voters/meta?type=lbs&district=${distCode}`)
          setLbs(lbRes.data.data || [])
        } else {
          // If no district is selected, fetch all LBs
          const lbRes = await axios.get("/api/voters/meta?type=lbs")
          setLbs(lbRes.data.data || [])
        }

        // Fetch Wards if district is selected
        if (distCode) {
          const wardRes = await axios.get(
            `/api/voters/meta?type=wards&district=${distCode}${lbCode ? `&lb=${lbCode}` : ""}`
          )
          setWards(wardRes.data.data || [])
        } else {
          setWards([])
        }

        // Fetch Booths if any parent location is selected
        if (distCode || lbCode || wardNum) {
          const boothParams = new URLSearchParams({ type: "booths" })
          if (distCode) boothParams.append("district", distCode)
          if (lbCode) boothParams.append("lb", lbCode)
          if (wardNum) boothParams.append("ward", wardNum.toString())

          const boothRes = await axios.get(`/api/voters/meta?${boothParams.toString()}`)
          setBooths(boothRes.data.data || [])
        } else {
          setBooths([])
        }
      } catch (err) {
        console.error("Error updating dependent filters:", err)
      }
    }
    updateLbsAndWards()
  }, [filters.district_code, filters.lb_code, filters.ward_number])

  const handleDistrictChange = (distCode: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (distCode) {
        next.district_code = distCode
      } else {
        delete next.district_code
      }
      delete next.lb_code
      delete next.ward_number
      delete next.booth_number
      return next
    })
    setLbSearch("")
    setWardSearch("")
    setBoothSearch("")
    setCurrentPage(1)
  }

  const handleLbChange = (lbCode: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (lbCode) {
        next.lb_code = lbCode
      } else {
        delete next.lb_code
      }
      delete next.ward_number
      delete next.booth_number
      return next
    })
    setWardSearch("")
    setBoothSearch("")
    setCurrentPage(1)
  }

  const handleWardChange = (wardNum: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (wardNum) {
        next.ward_number = wardNum
      } else {
        delete next.ward_number
      }
      delete next.booth_number
      return next
    })
    setBoothSearch("")
    setCurrentPage(1)
  }

  const handleBoothChange = (boothNum: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (boothNum) {
        next.booth_number = boothNum
      } else {
        delete next.booth_number
      }
      return next
    })
    setCurrentPage(1)
  }
  const debouncedFilters = useDebounce(filters, 400)

  const getKey = () => {
    const hasActiveFilters = Object.values(debouncedFilters).some(
      (v) => v && v.toString().trim() !== ""
    )

    if (!hasActiveFilters) return null

    const params = new URLSearchParams({
      skip: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      limit: ITEMS_PER_PAGE.toString(),
    })

    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString())
    })

    return `/api/search?${params.toString()}`
  }

  const { data, error, isLoading, isValidating } = useSWR(getKey(), fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const voters: Voter[] = data?.data || []
  const totalVoters: number = data?.total || 0
  const isBusy = isLoading || isValidating

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const filteredLbs = lbs.filter((l) =>
    l.code.toLowerCase().includes(lbSearch.toLowerCase()) ||
    l.name.toLowerCase().includes(lbSearch.toLowerCase())
  )

  const filteredWards = wards.filter((w) =>
    w.code.toLowerCase().includes(wardSearch.toLowerCase()) ||
    (w.name || "").toLowerCase().includes(wardSearch.toLowerCase())
  )

  const filteredBooths = booths.filter((b) =>
    b.code.toLowerCase().includes(boothSearch.toLowerCase()) ||
    (b.name || "").toLowerCase().includes(boothSearch.toLowerCase())
  )

  const handleClear = () => {
    setFilters({})
    setLbSearch("")
    setWardSearch("")
    setBoothSearch("")
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Back Button */}
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-blue-600">
          <Link href="/" className="flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Voter Database
            </h1>
            <p className="text-gray-600 text-sm">
              Real-time search across District, LB, and Voter ID.
            </p>
          </div>

          {totalVoters > 0 && (
            <Badge className="px-4 py-1 text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-300 shadow-sm">
              {totalVoters.toLocaleString()} Records Found
            </Badge>
          )}
        </div>

        {/* Search Card */}
        <GlassCard className="
          mb-8 p-10 rounded-2xl 
          bg-white/70 backdrop-blur-xl 
          border border-gray-200 
          shadow-xl
        ">

          {/* Icon */}
          <div className="flex flex-col items-center justify-center mb-8 text-center">
            <div className="p-3 rounded-full bg-white shadow-md border border-gray-200">
              {isBusy ? (
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              ) : (
                <SearchIcon className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mt-4">
              Search Voter Database
            </h2>
            <p className="text-gray-600 max-w-md">
              Enter location or identity details to find specific records.
            </p>
          </div>

          {/* Reset Filters */}
          {Object.keys(filters).length > 0 && (
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset Filters
              </Button>
            </div>
          )}

          {/* Group 1 – Location */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <MapPin className="w-3 h-3" /> Location Details
            </div>

            {/* Row 1: District / LB / Ward / Booth dropdowns */}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* District Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500">District</span>
                <select
                  aria-label="Select District"
                  value={filters.district_code || ""}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 h-9"
                >
                  <option value="">All Districts</option>
                  {districts.map((d) => (
                    <option key={`district-${d.code}`} value={d.code}>
                      {d.name || d.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Local Body Select + Search */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 flex justify-between items-center">
                  <span>Local Body</span>
                  {lbs.length > 5 && (
                    <span className="text-[10px] text-gray-400 font-normal">Type to filter below</span>
                  )}
                </span>
                <div className="flex flex-col gap-1">
                  {lbs.length > 5 && (
                    <Input
                      type="text"
                      placeholder="Filter local bodies..."
                      value={lbSearch}
                      onChange={(e) => setLbSearch(e.target.value)}
                      className="h-8 text-xs bg-white placeholder:text-gray-400 border border-gray-200"
                    />
                  )}
                  <select
                    aria-label="Select Local Body"
                    value={filters.lb_code || ""}
                    onChange={(e) => handleLbChange(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 h-9"
                  >
                    <option value="">All Local Bodies ({filteredLbs.length})</option>
                    {filteredLbs.map((l, idx) => (
                      <option key={`lb-${l.code}-${idx}`} value={l.code}>
                        {l.name || l.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ward Select + Search */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 flex justify-between items-center">
                  <span>Ward</span>
                  {wards.length > 5 && (
                    <span className="text-[10px] text-gray-400 font-normal">Type to filter below</span>
                  )}
                </span>
                <div className="flex flex-col gap-1">
                  {wards.length > 5 && (
                    <Input
                      type="text"
                      placeholder="Filter wards..."
                      value={wardSearch}
                      onChange={(e) => setWardSearch(e.target.value)}
                      disabled={!filters.district_code}
                      className="h-8 text-xs bg-white placeholder:text-gray-400 border border-gray-200"
                    />
                  )}
                  <select
                    aria-label="Select Ward"
                    value={filters.ward_number || ""}
                    onChange={(e) => handleWardChange(e.target.value)}
                    disabled={!filters.district_code}
                    className="bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100 h-9"
                  >
                    <option value="">All Wards ({filteredWards.length})</option>
                    {filteredWards.map((w, idx) => (
                      <option key={`ward-${w.code}-${w.name}-${idx}`} value={w.code}>
                        {w.code} — {w.name || "Unnamed Ward"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Booth Select + Search */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 flex justify-between items-center">
                  <span>Booth</span>
                  {booths.length > 5 && (
                    <span className="text-[10px] text-gray-400 font-normal">Type to filter below</span>
                  )}
                </span>
                <div className="flex flex-col gap-1">
                  {booths.length > 5 && (
                    <Input
                      type="text"
                      placeholder="Filter booths..."
                      value={boothSearch}
                      onChange={(e) => setBoothSearch(e.target.value)}
                      disabled={!filters.district_code && !filters.lb_code}
                      className="h-8 text-xs bg-white placeholder:text-gray-400 border border-gray-200"
                    />
                  )}
                  <select
                    aria-label="Select Booth"
                    value={filters.booth_number || ""}
                    onChange={(e) => handleBoothChange(e.target.value)}
                    disabled={!filters.district_code && !filters.lb_code}
                    className="bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100 h-9"
                  >
                    <option value="">All Booths ({filteredBooths.length})</option>
                    {filteredBooths.map((b, idx) => (
                      <option key={`booth-${b.code}-${b.name}-${idx}`} value={b.code}>
                        {b.code} — {b.name || "Unnamed Booth"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 2: Pincode search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Pincode (e.g. 683519)"
                  value={filters.pincode || ""}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  maxLength={6}
                  className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-200 h-9 text-sm"
                />
              </div>
              {filters.pincode && (
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">
                  PIN: {filters.pincode}
                </span>
              )}
            </div>
          </div>

          <Separator className="my-6 bg-gray-300" />

          {/* Group 2 – Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <User className="w-3 h-3" /> Personal Identity
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

              {/* Name */}
              <div className="md:col-span-3 relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by Name..."
                  className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
                  value={filters.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              {/* Guardian Name */}
              <div className="md:col-span-3 relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Guardian Name..."
                  className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
                  value={filters.guardian_name || ""}
                  onChange={(e) => handleInputChange("guardian_name", e.target.value)}
                />
              </div>

              {/* Voter ID */}
              <div className="md:col-span-2 relative">
                <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Voter ID / Sec ID"
                  className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
                  value={filters.sec_id || ""}
                  onChange={(e) => handleInputChange("sec_id", e.target.value)}
                />
              </div>

              {/* House Name */}
              <div className="md:col-span-2 relative">
                <Home className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="House Name"
                  className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
                  value={filters.house_name || ""}
                  onChange={(e) => handleInputChange("house_name", e.target.value)}
                />
              </div>

              {/* House No */}
              <div className="md:col-span-2">
                <Input
                  placeholder="House No"
                  value={filters.house_no || ""}
                  onChange={(e) => handleInputChange("house_no", e.target.value)}
                  className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Results */}
        <div className="min-h-[400px]">
          {error && (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" />
              <p>Something went wrong fetching data.</p>
            </div>
          )}

          {isLoading && !voters.length && !error ? (
            <LoadingSkeleton />
          ) : (
            <>
              {voters.length > 0 ? (
                <div className={`transition-opacity duration-300 ${isValidating ? "opacity-60" : "opacity-100"}`}>
                  <VoterTable voters={voters} />
                  <div className="mt-8">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalVoters / ITEMS_PER_PAGE)}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              ) : (
                getKey() !== null && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-600 border-2 border-dashed rounded-xl bg-white">
                    <SearchIcon className="w-10 h-10 mb-3 opacity-30" />
                    <p className="font-medium">No records found</p>
                    <p className="text-sm">Try adjusting your filters.</p>
                  </div>
                )
              )}

              {getKey() === null && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <p>Start typing above to search the database...</p>
                </div>
              )}
            </>
          )}
        </div>

      </main>
    </div>
  )
}
