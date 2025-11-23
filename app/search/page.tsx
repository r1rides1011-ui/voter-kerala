"use client"

import Link from "next/link"
import { useState } from "react"
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
} from "lucide-react"

import type { Voter, SearchFilters } from "@/lib/types"

const ITEMS_PER_PAGE = 30
const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
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

  const handleClear = () => {
    setFilters({})
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                placeholder="Dist. Code (e.g. 08)"
                value={filters.district_code || ""}
                onChange={(e) => handleInputChange("district_code", e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
              />

              <Input
                placeholder="LB Code"
                value={filters.lb_code || ""}
                onChange={(e) => handleInputChange("lb_code", e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
              />

              <Input
                type="number"
                placeholder="Ward No"
                value={filters.ward_number || ""}
                onChange={(e) => handleInputChange("ward_number", e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
              />

              <Input
                type="number"
                placeholder="Booth No"
                value={filters.booth_number || ""}
                onChange={(e) => handleInputChange("booth_number", e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
              />
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
              <div className="md:col-span-5 relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by Name..."
                  className="pl-9 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-200"
                  value={filters.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              {/* Voter ID */}
              <div className="md:col-span-3 relative">
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
