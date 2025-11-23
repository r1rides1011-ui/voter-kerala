import { create } from "zustand"
import type { Voter, SearchFilters } from "./types"

interface VoterStore {
  voters: Voter[]
  selectedVoter: Voter | null
  filters: SearchFilters
  currentPage: number
  setVoters: (voters: Voter[]) => void
  setSelectedVoter: (voter: Voter | null) => void
  setFilters: (filters: SearchFilters) => void
  setCurrentPage: (page: number) => void
  addVoter: (voter: Voter) => void
  updateVoter: (voter: Voter) => void
}

export const useVoterStore = create<VoterStore>((set) => ({
  voters: [],
  selectedVoter: null,
  filters: {},
  currentPage: 1,
  setVoters: (voters) => set({ voters }),
  setSelectedVoter: (voter) => set({ selectedVoter: voter }),
  setFilters: (filters) => set({ filters, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  addVoter: (voter) => set((state) => ({ voters: [...state.voters, voter] })),
  updateVoter: (voter) =>
    set((state) => ({
      voters: state.voters.map((v) => (v._id === voter._id ? voter : v)),
      selectedVoter: state.selectedVoter?._id === voter._id ? voter : state.selectedVoter,
    })),
}))
