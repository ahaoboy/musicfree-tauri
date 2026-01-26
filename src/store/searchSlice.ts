import { StateCreator } from "zustand"
import type { AppState } from "./index"
import { Playlist } from "../api"

// ============================================
// Search Slice State Interface
// ============================================
export interface SearchSliceState {
  // Search page runtime state
  searchText: string
  searchPlaylist: Playlist | null
  searchSelectedIds: Set<string>
  searchDownloadingIds: Set<string>
  searchDownloadedIds: Set<string>
  searchFailedIds: Set<string>
  searchSearching: boolean
  searchDownloadingAll: boolean
  searchCoverUrls: Record<string, string>
  searchPlaylistCoverUrl: string | null
}

// ============================================
// Search Slice Actions Interface
// ============================================
export interface SearchSliceActions {
  // Search page actions
  setSearchText: (text: string) => void
  setSearchPlaylist: (playlist: Playlist | null) => void
  setSearchSelectedIds: (ids: Set<string>) => void
  addSearchDownloadingId: (id: string) => void
  removeSearchDownloadingId: (id: string) => void
  addSearchDownloadedId: (id: string) => void
  addSearchFailedId: (id: string) => void
  removeSearchFailedId: (id: string) => void
  setSearchSearching: (searching: boolean) => void
  setSearchDownloadingAll: (downloadingAll: boolean) => void
  addSearchCoverUrl: (audioId: string, url: string) => void
  setSearchPlaylistCoverUrl: (url: string | null) => void
  clearSearchRuntimeData: () => void
  clearSearchStatesOnly: () => void
}

export type SearchSlice = SearchSliceState & SearchSliceActions

// ============================================
// Create Search Slice
// ============================================
export const createSearchSlice: StateCreator<AppState, [], [], SearchSlice> = (
  set,
  get,
) => ({
  // Initial state
  searchText: "",
  searchPlaylist: null,
  searchSelectedIds: new Set(),
  searchDownloadingIds: new Set(),
  searchDownloadedIds: new Set(),
  searchFailedIds: new Set(),
  searchSearching: false,
  searchDownloadingAll: false,
  searchCoverUrls: {},
  searchPlaylistCoverUrl: null,

  // Search actions
  setSearchText: (text: string) => {
    set({ searchText: text })
  },

  setSearchPlaylist: (playlist: Playlist | null) => {
    set({ searchPlaylist: playlist })
  },

  setSearchSelectedIds: (ids: Set<string>) => {
    set({ searchSelectedIds: ids })
  },

  addSearchDownloadingId: (id: string) => {
    const { searchDownloadingIds } = get()
    set({ searchDownloadingIds: new Set([...searchDownloadingIds, id]) })
  },

  removeSearchDownloadingId: (id: string) => {
    const { searchDownloadingIds } = get()
    const newSet = new Set(searchDownloadingIds)
    newSet.delete(id)
    set({ searchDownloadingIds: newSet })
  },

  addSearchDownloadedId: (id: string) => {
    const { searchDownloadedIds } = get()
    set({ searchDownloadedIds: new Set([...searchDownloadedIds, id]) })
  },

  addSearchFailedId: (id: string) => {
    const { searchFailedIds } = get()
    set({ searchFailedIds: new Set([...searchFailedIds, id]) })
  },

  removeSearchFailedId: (id: string) => {
    const { searchFailedIds } = get()
    const newSet = new Set(searchFailedIds)
    newSet.delete(id)
    set({ searchFailedIds: newSet })
  },

  setSearchSearching: (searching: boolean) => {
    set({ searchSearching: searching })
  },

  setSearchDownloadingAll: (downloadingAll: boolean) => {
    set({ searchDownloadingAll: downloadingAll })
  },

  addSearchCoverUrl: (audioId: string, url: string) => {
    const { searchCoverUrls } = get()
    set({ searchCoverUrls: { ...searchCoverUrls, [audioId]: url } })
  },

  setSearchPlaylistCoverUrl: (url: string | null) => {
    set({ searchPlaylistCoverUrl: url })
  },

  clearSearchRuntimeData: () => {
    set({
      searchText: "",
      searchPlaylist: null,
      searchSelectedIds: new Set(),
      searchDownloadingIds: new Set(),
      searchDownloadedIds: new Set(),
      searchFailedIds: new Set(),
      searchSearching: false,
      searchDownloadingAll: false,
      searchCoverUrls: {},
      searchPlaylistCoverUrl: null,
    })
  },

  clearSearchStatesOnly: () => {
    set({
      searchPlaylist: null,
      searchSelectedIds: new Set(),
      searchDownloadingIds: new Set(),
      searchDownloadedIds: new Set(),
      searchFailedIds: new Set(),
      searchSearching: false,
      searchDownloadingAll: false,
      searchCoverUrls: {},
      searchPlaylistCoverUrl: null,
    })
  },
})
