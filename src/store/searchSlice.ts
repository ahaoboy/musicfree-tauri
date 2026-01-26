import { StateCreator } from "zustand"
import type { AppState } from "./index"
import {
  Playlist,
  LocalAudio,
  Audio,
  extract_audios,
  exists_audio,
  exists_cover,
  download_cover,
  get_web_url,
  download_audio,
} from "../api"

// Module-level abort controllers
const abortControllers = new Map<string, AbortController>()

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
  searchSkippedIds: Set<string>
  searchSearching: boolean
  searchDownloadingAll: boolean
  searchCoverUrls: Record<string, string>
  searchPlaylistCoverUrl: string | null
  // Map of downloaded audios to add to config later
  searchDownloadedAudios: Map<string, LocalAudio>
}

// ============================================
// Search Slice Actions Interface
// ============================================
export interface SearchSliceActions {
  // Actions
  setSearchText: (text: string) => void
  setSearchSelectedIds: (ids: Set<string>) => void
  toggleSearchSelect: (id: string) => void
  toggleSearchSelectAll: (audios: Audio[], checked: boolean) => void
  clearSearchSelection: () => void

  // Async Actions
  search: (url: string) => Promise<void>
  startDownload: (audio: Audio) => Promise<LocalAudio | null>
  downloadMultiple: (
    audios: Audio[],
    existingAudios: LocalAudio[],
    retryMode?: boolean,
  ) => Promise<{
    successCount: number
    failedCount: number
    skippedCount: number
    downloadedAudios: LocalAudio[]
    existingAudios: LocalAudio[]
  }>
  abortDownload: (audioId: string) => void
  clearSearchFailedAndSkippedIds: () => void
  clearSearchRuntimeData: () => void
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
  searchSkippedIds: new Set(), // New state
  searchSearching: false,
  searchDownloadingAll: false,
  searchCoverUrls: {},
  searchPlaylistCoverUrl: null,
  searchDownloadedAudios: new Map(),

  // Actions
  setSearchText: (text: string) => {
    set({ searchText: text })
  },

  setSearchSelectedIds: (ids: Set<string>) => {
    set({ searchSelectedIds: ids })
  },

  toggleSearchSelect: (id: string) => {
    const { searchSelectedIds } = get()
    const newSet = new Set(searchSelectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    set({ searchSelectedIds: newSet })
  },

  toggleSearchSelectAll: (audios: Audio[], checked: boolean) => {
    if (checked) {
      const ids = new Set(audios.map((a) => a.id))
      set({ searchSelectedIds: ids })
    } else {
      set({ searchSelectedIds: new Set() })
    }
  },

  clearSearchSelection: () => {
    set({ searchSelectedIds: new Set() })
  },

  // Async Actions
  search: async (url: string) => {
    if (!url.trim()) return

    set({
      searchSearching: true,
      searchPlaylist: null,
      searchPlaylistCoverUrl: null,
      searchDownloadedIds: new Set(),
      searchDownloadedAudios: new Map(),
      searchFailedIds: new Set(),
      searchSkippedIds: new Set(), // Clear skipped
      searchDownloadingIds: new Set(),
      searchSelectedIds: new Set(),
    })

    try {
      const [playlist] = await extract_audios(url)

      // Check existing audios
      const downloadedIds = new Set<string>()
      const downloadedAudios = new Map<string, LocalAudio>()

      // Parallel check for performance
      await Promise.all(
        playlist.audios.map(async (audio) => {
          const audioPath = await exists_audio(audio)
          if (audioPath) {
            let coverPath: string | null = null
            if (audio.cover) {
              coverPath = await exists_cover(audio.cover, audio.platform)
            }
            const localAudio: LocalAudio = {
              audio,
              path: audioPath,
              cover_path: coverPath,
            }
            // Use set/map methods in a thread-safe way (JS is single threaded event loop so this block is atomic per promise resolution)
            downloadedIds.add(audio.id)
            downloadedAudios.set(audio.id, localAudio)
          }
        }),
      )

      set({
        searchPlaylist: playlist,
        searchSearching: false,
        searchDownloadedIds: downloadedIds,
        searchDownloadedAudios: downloadedAudios,
      })

      // Background download playlist cover
      const downloadCoverHelper = async () => {
        let targetCover = playlist.cover
        let targetPlatform = playlist.platform

        if (!targetCover) {
          const first = playlist.audios.find((a) => a.cover)
          if (first) {
            targetCover = first.cover
            targetPlatform = first.platform
          }
        }

        if (targetCover) {
          try {
            const localPath = await download_cover(targetCover, targetPlatform)
            if (localPath) {
              const webUrl = await get_web_url(localPath)
              set({ searchPlaylistCoverUrl: webUrl })
            }
          } catch (e) {
            console.error("Failed to download playlist cover", e)
          }
        }
      }
      downloadCoverHelper()
    } catch (error) {
      console.error("Search failed:", error)
      set({ searchSearching: false })
    }
  },

  startDownload: async (audio: Audio) => {
    const { searchDownloadingIds, searchFailedIds, searchSkippedIds } = get()

    // Check if already downloading
    if (abortControllers.has(audio.id)) return null

    // Create abort controller
    const controller = new AbortController()
    abortControllers.set(audio.id, controller)

    // Update state
    set({
      searchDownloadingIds: new Set([...searchDownloadingIds, audio.id]),
      // Remove from failed/skipped if retrying
      searchFailedIds: new Set(
        [...searchFailedIds].filter((id) => id !== audio.id),
      ),
      searchSkippedIds: new Set(
        [...searchSkippedIds].filter((id) => id !== audio.id),
      ),
    })

    try {
      // Check abort before starting (unlikely but safe)
      if (controller.signal.aborted) throw new Error("ABORTED")

      // Perform download
      const downloadPromise = download_audio(audio)

      const result = await new Promise<LocalAudio>((resolve, reject) => {
        const onAbort = () => reject(new Error("ABORTED"))
        controller.signal.addEventListener("abort", onAbort)

        downloadPromise.then(
          (res) => {
            controller.signal.removeEventListener("abort", onAbort)
            if (controller.signal.aborted) reject(new Error("ABORTED"))
            else resolve(res)
          },
          (err) => {
            controller.signal.removeEventListener("abort", onAbort)
            reject(err)
          },
        )
      })

      // Success
      const {
        searchDownloadedIds,
        searchDownloadedAudios,
        searchDownloadingIds: currDownloading,
      } = get()

      const newDownloaded = new Set(searchDownloadedIds)
      newDownloaded.add(audio.id)

      const newMap = new Map(searchDownloadedAudios)
      newMap.set(audio.id, result)

      const newDownloading = new Set(currDownloading)
      newDownloading.delete(audio.id)

      set({
        searchDownloadedIds: newDownloaded,
        searchDownloadedAudios: newMap,
        searchDownloadingIds: newDownloading,
      })

      return result
    } catch (error: any) {
      const {
        searchDownloadingIds: currDownloading,
        searchFailedIds: currFailed,
        searchSkippedIds: currSkipped,
      } = get()

      const newDownloading = new Set(currDownloading)
      newDownloading.delete(audio.id)

      const newFailed = new Set(currFailed)
      const newSkipped = new Set(currSkipped)

      if (error.message === "ABORTED") {
        newSkipped.add(audio.id)
      } else {
        newFailed.add(audio.id)
      }

      set({
        searchDownloadingIds: newDownloading,
        searchFailedIds: newFailed,
        searchSkippedIds: newSkipped,
      })

      return null
    } finally {
      abortControllers.delete(audio.id)
    }
  },

  abortDownload: (audioId: string) => {
    const controller = abortControllers.get(audioId)
    if (controller) {
      controller.abort()
      abortControllers.delete(audioId)
      // State update handled in startDownload catch block (ABORTED error)
    }
  },

  downloadMultiple: async (audios, existingAudios, retryMode = false) => {
    const { searchDownloadedIds, searchFailedIds } = get()
    set({ searchDownloadingAll: true })

    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    const downloadedAudios: LocalAudio[] = []

    for (const audio of audios) {
      // Logic from hook
      if (retryMode && !searchFailedIds.has(audio.id)) {
        if (searchDownloadedIds.has(audio.id)) skippedCount++
        continue
      }

      if (!retryMode && searchDownloadedIds.has(audio.id)) {
        skippedCount++
        continue
      }

      const result = await get().startDownload(audio)
      if (result) {
        downloadedAudios.push(result)
        successCount++
      } else {
        failedCount++
      }
    }

    set({ searchDownloadingAll: false })

    return {
      successCount,
      failedCount,
      skippedCount,
      downloadedAudios,
      existingAudios,
    }
  },

  clearSearchFailedAndSkippedIds: () => {
    set({
      searchFailedIds: new Set(),
      searchSkippedIds: new Set(),
    })
  },

  clearSearchRuntimeData: () => {
    abortControllers.forEach((c) => c.abort())
    abortControllers.clear()

    set({
      searchText: "",
      searchPlaylist: null,
      searchSelectedIds: new Set(),
      searchDownloadingIds: new Set(),
      searchDownloadedIds: new Set(),
      searchFailedIds: new Set(),
      searchSkippedIds: new Set(),
      searchSearching: false,
      searchDownloadingAll: false,
      searchCoverUrls: {},
      searchPlaylistCoverUrl: null,
      searchDownloadedAudios: new Map(),
    })
  },
})
