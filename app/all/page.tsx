"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Navbar } from "@/components/navbar"
import { VoterTable } from "@/components/voter-table"
import { Pagination } from "@/components/pagination"
import type { Voter } from "@/lib/types"
import { LoadingSkeleton } from "@/components/loading-skeleton"

const ITEMS_PER_PAGE = 100

export default function AllVotersPage() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [totalVoters, setTotalVoters] = useState(0)

  useEffect(() => {
    const fetchVoters = async () => {
      setLoading(true)
      try {
        const response = await axios.get("/api/voters", {
          params: {
            skip: (currentPage - 1) * ITEMS_PER_PAGE,
            limit: ITEMS_PER_PAGE,
          },
        })
        setVoters(response.data.data || [])
        setTotalVoters(response.data.total || 0)
      } catch (error) {
        console.error("Failed to fetch voters:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVoters()
  }, [currentPage])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">All Voters</h1>

        {loading ? (
          <LoadingSkeleton />
        ) : voters.length > 0 ? (
          <>
            <VoterTable voters={voters} />
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalVoters / ITEMS_PER_PAGE)}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <p className="text-muted-foreground">No voters found.</p>
        )}
      </main>
    </div>
  )
}
