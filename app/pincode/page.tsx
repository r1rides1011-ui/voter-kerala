"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  MapPin,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Sparkles,
  Database,
  Building2,
  Users,
  Loader2,
  Check,
  RotateCcw,
  Play,
  Pause,
  XCircle,
  ShieldCheck,
  Flag,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PincodeItem {
  district_name: string
  lb_name: string
  ward_number: string
  ward_name: string
  voter_count: number
  pincode: string | null
  status: "resolved" | "unresolved"
  source: string
  resolved_at: string | null
  is_verified: boolean
  is_flagged: boolean
}

interface Stats {
  totalLocations: number
  totalResolved: number
  totalUnresolved: number
  totalVerified: number
  totalFlagged: number
  totalVotersUpdated: number
}

interface ProgressState {
  isOpen: boolean
  isRunning: boolean
  isPaused: boolean
  total: number
  current: number
  resolved: number
  failed: number
  votersUpdated: number
  currentLocationName: string
}

export default function PincodeManagementPage() {
  const [items, setItems] = useState<PincodeItem[]>([])
  const [stats, setStats] = useState<Stats>({
    totalLocations: 0,
    totalResolved: 0,
    totalUnresolved: 0,
    totalVerified: 0,
    totalFlagged: 0,
    totalVotersUpdated: 0,
  })
  const [districts, setDistricts] = useState<string[]>([])
  const [localBodies, setLocalBodies] = useState<string[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("ALL")
  const [selectedLb, setSelectedLb] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedVerification, setSelectedVerification] = useState("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Loading states
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)

  // Audit & Fix Invalid Pincodes
  const handleAuditFix = async () => {
    setAuditLoading(true)
    setAlertMessage(null)
    try {
      const res = await fetch("/api/pincode/audit", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        let msg = data.message
        if (data.totalVotersUpdated > 0) {
          msg += ` (${data.totalVotersUpdated.toLocaleString()} voter records corrected)`
        }
        setAlertMessage({ type: "success", text: msg })
        fetchData()
      } else {
        setAlertMessage({ type: "error", text: data.error || "Audit failed" })
      }
    } catch (err) {
      console.error(err)
      setAlertMessage({ type: "error", text: "Error executing pincode audit" })
    } finally {
      setAuditLoading(false)
    }
  }

  // Progress Modal & Engine State
  const [progressState, setProgressState] = useState<ProgressState>({
    isOpen: false,
    isRunning: false,
    isPaused: false,
    total: 0,
    current: 0,
    resolved: 0,
    failed: 0,
    votersUpdated: 0,
    currentLocationName: "",
  })

  // Ref to handle cancellation / pausing in async loops
  const isCancelledRef = useRef(false)
  const isPausedRef = useRef(false)

  // Messages & Notifications
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{
    district_name: string
    lb_name: string
    ward_number: string
    ward_name: string
    pincode: string
  }>({
    district_name: "",
    lb_name: "",
    ward_number: "",
    ward_name: "",
    pincode: "",
  })

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      })

      if (search.trim()) params.append("search", search.trim())
      if (selectedDistrict !== "ALL") params.append("district_name", selectedDistrict)
      if (selectedLb !== "ALL") params.append("lb_name", selectedLb)
      if (selectedStatus !== "ALL") params.append("status", selectedStatus)
      if (selectedVerification !== "ALL") params.append("verification", selectedVerification)

      const res = await fetch(`/api/pincode/list?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setItems(data.data || [])
        setStats(
          data.stats || {
            totalLocations: 0,
            totalResolved: 0,
            totalUnresolved: 0,
            totalVerified: 0,
            totalFlagged: 0,
            totalVotersUpdated: 0,
          }
        )
        setDistricts(data.filters?.districts || [])
        setLocalBodies(data.filters?.localBodies || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalItems(data.pagination?.totalItems || 0)
      } else {
        setAlertMessage({ type: "error", text: data.error || "Failed to load pincode data" })
      }
    } catch (err) {
      console.error(err)
      setAlertMessage({ type: "error", text: "Network error fetching pincode list" })
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedDistrict, selectedLb, selectedStatus, selectedVerification])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Single Auto Lookup via API
  const handleAutoLookup = async (item: PincodeItem) => {
    const key = `${item.district_name}-${item.lb_name}-${item.ward_number}`
    setActionLoading(key)
    setAlertMessage(null)

    try {
      const params = new URLSearchParams({
        district_name: item.district_name,
        lb_name: item.lb_name,
        ward_name: item.ward_name,
        ward_number: item.ward_number,
      })

      const res = await fetch(`/api/pincode/lookup?${params.toString()}`)
      const data = await res.json()

      if (data.success && data.pincode) {
        // Auto save to database
        const updateRes = await fetch("/api/pincode/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district_name: item.district_name,
            lb_name: item.lb_name,
            ward_number: item.ward_number,
            ward_name: item.ward_name,
            pincode: data.pincode,
          }),
        })
        const updateData = await updateRes.json()

        setAlertMessage({
          type: "success",
          text: `Resolved Pincode: ${data.pincode} for ${item.ward_name || item.lb_name}. Updated ${updateData.votersUpdated || 0} voter records!`,
        })
        fetchData()
      } else {
        setAlertMessage({
          type: "error",
          text: data.error || `Could not auto-detect pincode for ${item.ward_name || item.lb_name}`,
        })
      }
    } catch (err) {
      console.error(err)
      setAlertMessage({ type: "error", text: "Error looking up pincode" })
    } finally {
      setActionLoading(null)
    }
  }

  // Toggle Verification Status
  const handleToggleVerification = async (item: PincodeItem, isVerified: boolean, isFlagged: boolean) => {
    const key = `verify-${item.district_name}-${item.lb_name}-${item.ward_number}`
    setActionLoading(key)
    setAlertMessage(null)

    try {
      const res = await fetch("/api/pincode/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_name: item.district_name,
          lb_name: item.lb_name,
          ward_number: item.ward_number,
          is_verified: isVerified,
          is_flagged: isFlagged,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setAlertMessage({ type: "success", text: data.message })
        fetchData()
      } else {
        setAlertMessage({ type: "error", text: data.error || "Failed to update verification" })
      }
    } catch (err) {
      console.error(err)
      setAlertMessage({ type: "error", text: "Error toggling verification" })
    } finally {
      setActionLoading(null)
    }
  }

  // Submit Edit Modal
  const handleSavePincode = async () => {
    if (editTarget.pincode && !/^\d{6}$/.test(editTarget.pincode.trim())) {
      setAlertMessage({ type: "error", text: "Pincode must be a 6-digit number" })
      return
    }

    setActionLoading("saving")
    try {
      const res = await fetch("/api/pincode/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_name: editTarget.district_name,
          lb_name: editTarget.lb_name,
          ward_number: editTarget.ward_number,
          ward_name: editTarget.ward_name,
          pincode: editTarget.pincode.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Automatically mark as verified when manually edited!
        await fetch("/api/pincode/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district_name: editTarget.district_name,
            lb_name: editTarget.lb_name,
            ward_number: editTarget.ward_number,
            is_verified: true,
            is_flagged: false,
          }),
        })

        setAlertMessage({ type: "success", text: `${data.message} & marked as Verified ✅` })
        setIsEditOpen(false)
        fetchData()
      } else {
        setAlertMessage({ type: "error", text: data.error || "Failed to update pincode" })
      }
    } catch (err) {
      console.error(err)
      setAlertMessage({ type: "error", text: "Error saving pincode update" })
    } finally {
      setActionLoading(null)
    }
  }

  // Real-Time Batch Auto Resolve with Progress Bar
  const startAutoResolveWithProgress = async () => {
    setAlertMessage(null)
    isCancelledRef.current = false
    isPausedRef.current = false

    // Fetch all unresolved locations
    let targets: PincodeItem[] = []
    try {
      const res = await fetch(`/api/pincode/list?status=unresolved&limit=1000`)
      const data = await res.json()
      if (data.success && data.data) {
        targets = data.data
      }
    } catch (e) {
      console.error(e)
      setAlertMessage({ type: "error", text: "Failed to load unresolved locations" })
      return
    }

    if (targets.length === 0) {
      setAlertMessage({ type: "success", text: "All locations already have resolved pincodes!" })
      return
    }

    // Open progress modal
    setProgressState({
      isOpen: true,
      isRunning: true,
      isPaused: false,
      total: targets.length,
      current: 0,
      resolved: 0,
      failed: 0,
      votersUpdated: 0,
      currentLocationName: "Starting resolution...",
    })

    let resolvedCount = 0
    let failedCount = 0
    let votersCount = 0

    for (let i = 0; i < targets.length; i++) {
      if (isCancelledRef.current) break

      // Handle pause loop
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 300))
      }

      if (isCancelledRef.current) break

      const loc = targets[i]
      const locLabel = `${loc.district_name} → ${loc.lb_name} (Ward ${loc.ward_number}${loc.ward_name ? ` - ${loc.ward_name}` : ""})`

      setProgressState((prev) => ({
        ...prev,
        current: i + 1,
        currentLocationName: locLabel,
      }))

      try {
        const params = new URLSearchParams({
          district_name: loc.district_name,
          lb_name: loc.lb_name,
          ward_name: loc.ward_name || "",
          ward_number: loc.ward_number || "",
        })

        const lookupRes = await fetch(`/api/pincode/lookup?${params.toString()}`)
        const lookupData = await lookupRes.json()

        if (lookupData.success && lookupData.pincode) {
          resolvedCount++
          votersCount += lookupData.votersUpdated || 0
        } else {
          failedCount++
        }
      } catch (err) {
        console.error(err)
        failedCount++
      }

      setProgressState((prev) => ({
        ...prev,
        resolved: resolvedCount,
        failed: failedCount,
        votersUpdated: votersCount,
      }))

      // Rate limit protection delay (~500ms)
      await new Promise((r) => setTimeout(r, 500))
    }

    setProgressState((prev) => ({
      ...prev,
      isRunning: false,
      currentLocationName: isCancelledRef.current ? "Resolution Stopped by User" : "Completed!",
    }))

    fetchData()
  }

  // Toggle Pause
  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current
    setProgressState((prev) => ({ ...prev, isPaused: isPausedRef.current }))
  }

  // Cancel Progress
  const cancelProgress = () => {
    isCancelledRef.current = true
    isPausedRef.current = false
    setProgressState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentLocationName: "Stopped",
    }))
  }

  // Sync JSON Data
  const handleImportJson = async () => {
    setImportLoading(true)
    setAlertMessage(null)
    try {
      const res = await fetch("/api/pincode/import-json", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setAlertMessage({ type: "success", text: data.message })
        fetchData()
      } else {
        setAlertMessage({ type: "error", text: data.error || "JSON import failed" })
      }
    } catch (err) {
      console.error(err)
      setAlertMessage({ type: "error", text: "Error executing JSON import" })
    } finally {
      setImportLoading(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (item?: PincodeItem) => {
    if (item) {
      setEditTarget({
        district_name: item.district_name,
        lb_name: item.lb_name,
        ward_number: item.ward_number,
        ward_name: item.ward_name || "",
        pincode: item.pincode || "",
      })
    } else {
      setEditTarget({
        district_name: districts[0] || "",
        lb_name: "",
        ward_number: "",
        ward_name: "",
        pincode: "",
      })
    }
    setIsEditOpen(true)
  }

  const resolvePercentage = stats.totalLocations > 0
    ? Math.round((stats.totalResolved / stats.totalLocations) * 100)
    : 0

  const progressPercentage = progressState.total > 0
    ? Math.round((progressState.current / progressState.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="w-8 h-8 text-primary" />
              Pincode Directory & Verification
            </h1>
            <p className="text-muted-foreground mt-1">
              Verify accuracy, auto-resolve postal pincodes, and audit voter location data.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleAuditFix}
              disabled={auditLoading || progressState.isRunning}
              className="gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
            >
              {auditLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              )}
              Audit & Fix Mismatches
            </Button>

            <Button
              variant="outline"
              onClick={handleImportJson}
              disabled={importLoading || progressState.isRunning || auditLoading}
              className="gap-2"
            >
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4 text-emerald-500" />}
              Sync from JSON
            </Button>

            <Button
              variant="outline"
              onClick={startAutoResolveWithProgress}
              disabled={progressState.isRunning || importLoading}
              className="gap-2 border-primary/40 hover:bg-primary/5 text-primary font-semibold"
            >
              {progressState.isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary" />
              )}
              Auto-Resolve All
            </Button>

            <Button onClick={() => openEditModal()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Pincode
            </Button>
          </div>
        </div>

        {/* Alert Notification */}
        {alertMessage && (
          <Alert variant={alertMessage.type === "error" ? "destructive" : "default"} className={alertMessage.type === "success" ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : ""}>
            {alertMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{alertMessage.type === "success" ? "Success" : "Notice"}</AlertTitle>
            <AlertDescription>{alertMessage.text}</AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Locations</CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLocations}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Unique Wards / LBs</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Resolved Pincodes</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalResolved}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">({resolvePercentage}%)</span>
              </div>
              <Progress value={resolvePercentage} className="h-1.5 mt-2 bg-secondary" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Verified Accurate</CardTitle>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalVerified}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Confirmed correct mappings</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pending / Unresolved</CardTitle>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.totalUnresolved}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Missing postal codes</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Voters Assigned</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalVotersUpdated}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Voters with pincode set</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card>
          <CardContent className="p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Ward Name, Number, Local Body, Pincode..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>

            {/* District Filter */}
            <div className="w-full md:w-44">
              <Select
                value={selectedDistrict}
                onValueChange={(val) => {
                  setSelectedDistrict(val)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Districts</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Local Body Filter */}
            <div className="w-full md:w-44">
              <Select
                value={selectedLb}
                onValueChange={(val) => {
                  setSelectedLb(val)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Local Body" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Local Bodies</SelectItem>
                  {localBodies.map((lb) => (
                    <SelectItem key={lb} value={lb}>
                      {lb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Verification Status Filter */}
            <div className="w-full md:w-44">
              <Select
                value={selectedVerification}
                onValueChange={(val) => {
                  setSelectedVerification(val)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Accuracy Status</SelectItem>
                  <SelectItem value="verified">Verified Accurate ✅</SelectItem>
                  <SelectItem value="unverified">Auto-Matched (Needs Review)</SelectItem>
                  <SelectItem value="flagged">Flagged ⚠️</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {(search || selectedDistrict !== "ALL" || selectedLb !== "ALL" || selectedStatus !== "ALL" || selectedVerification !== "ALL") && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("")
                  setSelectedDistrict("ALL")
                  setSelectedLb("ALL")
                  setSelectedStatus("ALL")
                  setSelectedVerification("ALL")
                  setPage(1)
                }}
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Local Body (LB)</th>
                  <th className="px-4 py-3">Ward # & Name</th>
                  <th className="px-4 py-3">Pincode</th>
                  <th className="px-4 py-3">Verification Status</th>
                  <th className="px-4 py-3 text-right">Voters</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading pincode directory...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No location records found matching filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const rowKey = `${item.district_name}-${item.lb_name}-${item.ward_number}`
                    const isRowLoading = actionLoading === rowKey || actionLoading === `verify-${rowKey}`

                    return (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.district_name}</td>
                        <td className="px-4 py-3">{item.lb_name}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">Ward {item.ward_number}</span>
                          {item.ward_name && <span className="text-muted-foreground ml-2">({item.ward_name})</span>}
                        </td>
                        <td className="px-4 py-3">
                          {item.pincode ? (
                            <Badge variant="outline" className="font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              {item.pincode}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30">
                              Unresolved
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.is_verified ? (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 gap-1">
                              <ShieldCheck className="w-3 h-3" /> Verified Accurate
                            </Badge>
                          ) : item.is_flagged ? (
                            <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 gap-1">
                              <Flag className="w-3 h-3" /> Flagged for Audit
                            </Badge>
                          ) : item.pincode ? (
                            <Badge variant="outline" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 gap-1">
                              Auto-Matched
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{item.voter_count}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Verify Checkmark Button */}
                            {item.pincode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleVerification(item, !item.is_verified, false)}
                                disabled={isRowLoading || progressState.isRunning}
                                title={item.is_verified ? "Unmark Verified" : "Mark as Verified Accurate"}
                                className={`h-8 px-2 text-xs gap-1 ${item.is_verified ? "text-emerald-500 hover:text-emerald-600" : "text-muted-foreground hover:text-emerald-500"}`}
                              >
                                {isRowLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                            {/* Auto Fetch */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAutoLookup(item)}
                              disabled={isRowLoading || progressState.isRunning}
                              title="Fetch pincode automatically via India Post API"
                              className="h-8 px-2 text-xs gap-1"
                            >
                              {isRowLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                              )}
                              Auto Fetch
                            </Button>

                            {/* Manual Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(item)}
                              disabled={progressState.isRunning}
                              title="Edit pincode manually"
                              className="h-8 px-2 text-xs gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && totalPages > 1 && (
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Showing {items.length} of {totalItems} locations (Page {page} of {totalPages})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

      </div>

      {/* Real-Time Auto-Resolve Progress Modal */}
      <Dialog
        open={progressState.isOpen}
        onOpenChange={(open) => {
          if (!open && progressState.isRunning) {
            cancelProgress()
          }
          setProgressState((prev) => ({ ...prev, isOpen: open }))
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Auto-Resolving Pincodes (India Post API)
            </DialogTitle>
            <DialogDescription>
              Searching postal directories with strict Kerala district filtering and assigning pincodes in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Progress Bar & Percentage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>Overall Progress</span>
                <span className="text-primary font-mono">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-secondary" />
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Processed: {progressState.current} / {progressState.total}</span>
                <span>Remaining: {Math.max(0, progressState.total - progressState.current)}</span>
              </div>
            </div>

            {/* Current Item Ticker */}
            <div className="bg-muted/50 p-3 rounded-lg border space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Target</div>
              <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                {progressState.isRunning && !progressState.isPaused && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                )}
                <span className="truncate">{progressState.currentLocationName || "Initializing..."}</span>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                <div className="text-xs text-muted-foreground">Resolved</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{progressState.resolved}</div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                <div className="text-xs text-muted-foreground">Not Found</div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{progressState.failed}</div>
              </div>

              <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-lg">
                <div className="text-xs text-muted-foreground">Voters Updated</div>
                <div className="text-xl font-bold text-primary">{progressState.votersUpdated}</div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <div className="flex items-center gap-2">
              {progressState.isRunning && (
                <Button variant="outline" size="sm" onClick={togglePause} className="gap-1.5">
                  {progressState.isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-500" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-500" /> Pause
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {progressState.isRunning ? (
                <Button variant="destructive" size="sm" onClick={cancelProgress} className="gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Stop Auto-Resolve
                </Button>
              ) : (
                <Button
                  onClick={() => setProgressState((prev) => ({ ...prev, isOpen: false }))}
                  className="gap-1.5"
                >
                  <Check className="w-4 h-4" /> Close
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Add Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget.ward_number ? "Edit & Verify Pincode" : "Add Custom Pincode Mapping"}</DialogTitle>
            <DialogDescription>
              Saving a manual pincode marks it as Verified Accurate ✅ and updates all matching voter records in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">District Name</label>
              <Input
                value={editTarget.district_name}
                onChange={(e) => setEditTarget({ ...editTarget, district_name: e.target.value })}
                placeholder="e.g. ERNAKULAM"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Local Body Name (LB)</label>
              <Input
                value={editTarget.lb_name}
                onChange={(e) => setEditTarget({ ...editTarget, lb_name: e.target.value })}
                placeholder="e.g. Aluva / Kottuvally"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Ward Number</label>
                <Input
                  value={editTarget.ward_number}
                  onChange={(e) => setEditTarget({ ...editTarget, ward_number: e.target.value })}
                  placeholder="e.g. 024"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Ward Name (Optional)</label>
                <Input
                  value={editTarget.ward_name}
                  onChange={(e) => setEditTarget({ ...editTarget, ward_name: e.target.value })}
                  placeholder="e.g. PRIYADARSHINI"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">6-Digit Pincode</label>
              <Input
                value={editTarget.pincode}
                onChange={(e) => setEditTarget({ ...editTarget, pincode: e.target.value })}
                placeholder="e.g. 683101"
                maxLength={6}
                className="font-mono text-base tracking-wider"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePincode} disabled={actionLoading === "saving"} className="gap-2">
              {actionLoading === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save & Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
