export interface Voter {
  _id?: string

  // Kerala-level administrative fields
  state: string
  district_code: string
  district_name: string
  lb_code: string
  lb_name: string
  lb_type: string

  // Ward & booth
  ward_number: string
  ward_name: string
  booth_number: string
  booth_name?: string

  // Basic voter info
  sec_id: string
  name: string
  age: number
  gender: "M" | "F" | "Other"
  guardian_name: string

  // House details
  house_no: string
  house_name?: string

  // Contact
  phone?: string
  alternate_phone?: string

  // Coordinates
  latitude?: number
  longitude?: number

  // GeoJSON format (MongoDB)
  location?: {
    type: "Point"
    coordinates: [number | null, number | null]
  }

  // Status
  voter_status?: "active" | "inactive"
  is_flagged?: boolean

  // Timestamps
  created_at?: string | Date
  updated_at?: string | Date
}

// ------------------------------------------------------------
// Ward Summary
// ------------------------------------------------------------
export interface Ward {
  ward_number: number
  name: string
  total_voters: number
  booths: number
}

// ------------------------------------------------------------
// Household Group
// ------------------------------------------------------------
export interface Household {
  house_no: string
  house_name?: string
  ward_number: string
  booth_number: string
  members: Voter[]
}

// ------------------------------------------------------------
// Search Filters
// ------------------------------------------------------------
export type SearchFilters = {
  name?: string
  sec_id?: string
  house_no?: string
  house_name?: string   // <-- ADD THIS
  phone?: string
  ward_number?: string | number
  booth_number?: string | number
  district_code?: string
  lb_code?: string
}
// ------------------------------------------------------------
// API Response Wrapper
// ------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
