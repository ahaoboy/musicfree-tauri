import { create } from "zustand"
import {
  LocalAudio,
  LocalPlaylist,
  Config,
  get_config,
  save_config,
  get_web_url,
  get_default_config,
  PlayMode,
  ThemeMode,
  get_system_theme,
  FAVORITE_PLAYLIST_ID,
  Playlist,
} from "../api"

// Persistent data interface (saved to config)
interface PersistentData {
  config: Config
}

// Runtime data interface (lost on app restart)
interface RuntimeData {
  // Current playback state
  currentAudio: LocalAudio | null
  audioUrl: string | null
  isPlaying: boolean
  playbackRate: number
  playMode: PlayMode
  playbackQueue: LocalAudio[]
  playbackHistory: LocalAudio[] // History stack for previous button

  // Loading states
  isConfigLoading: boolean

  // Audio element reference (managed externally)
  audioElement: HTMLAudioElement | null

  // Search page runtime state
  searchText: string
  searchPlaylist: Playlist | null
  searchSelectedIds: Set<string>
  searchDownloadingIds: Set<string>
  searchDownloadedIds: Set<string>
  searchFailedIds: Set<string>
  searchSearching: boolean
  searchDownloadingAll: boolean
  searchMessageToShow: {
    type: "success" | "error" | "warning"
    text: string
  } | null
  searchCoverUrls: Record<string, string>
  searchPlaylistCoverUrl: string | null
}

// App state interface
interface AppState extends PersistentData, RuntimeData {
  // Actions for persistent data
  loadConfig: () => Promise<void>
  saveConfig: (config: Config) => Promise<void>
  setThemeMode: (mode: ThemeMode) => void
  addAudiosToConfig: (audios: LocalAudio[]) => Promise<void>
  addPlaylistToConfig: (playlist: LocalPlaylist) => Promise<void>
  setLastAudio: (audio: LocalAudio) => Promise<void>
  toggleFavorite: (audio: LocalAudio) => Promise<void>
  isFavorited: (id: string) => boolean
  deleteAudio: (id: string) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>

  // Actions for runtime data
  playAudio: (
    audio: LocalAudio,
    queue?: LocalAudio[],
    addToHistory?: boolean,
  ) => Promise<void>
  pauseAudio: () => void
  resumeAudio: () => void
  togglePlay: () => void
  playNext: (auto?: boolean) => Promise<void>
  playPrev: () => Promise<void>
  canPlayPrev: () => boolean
  togglePlayMode: () => void
  setAudioElement: (element: HTMLAudioElement | null) => void
  setPlaybackRate: (rate: number) => void

  // Search page runtime actions
  setSearchText: (text: string) => void
  setSearchPlaylist: (playlist: Playlist | null) => void
  addSearchSelectedId: (id: string) => void
  removeSearchSelectedId: (id: string) => void
  setSearchSelectedIds: (ids: Set<string>) => void
  addSearchDownloadingId: (id: string) => void
  removeSearchDownloadingId: (id: string) => void
  addSearchDownloadedId: (id: string) => void
  addSearchFailedId: (id: string) => void
  removeSearchFailedId: (id: string) => void
  setSearchSearching: (searching: boolean) => void
  setSearchDownloadingAll: (downloadingAll: boolean) => void
  setSearchMessageToShow: (
    message: { type: "success" | "error" | "warning"; text: string } | null,
  ) => void
  setSearchCoverUrls: (urls: Record<string, string>) => void
  addSearchCoverUrl: (audioId: string, url: string) => void
  setSearchPlaylistCoverUrl: (url: string | null) => void
  clearSearchRuntimeData: () => void
}

// Helper to apply theme to document
const applyTheme = (mode?: ThemeMode | null) => {
  if (typeof document !== "undefined") {
    // Default to "auto" if mode is null or undefined
    const effectiveMode = mode || "auto"
    const actualTheme =
      effectiveMode === "auto" ? get_system_theme() : effectiveMode
    document.documentElement.setAttribute(
      "data-prefers-color-scheme",
      actualTheme,
    )
  }
}

// Create the store
export const useAppStore = create<AppState>((set, get) => ({
  // Persistent data initial state
  config: get_default_config(),

  // Runtime data initial state
  currentAudio: null,
  audioUrl: null,
  isPlaying: false,
  playbackRate: 1,
  playMode: "sequence",
  playbackQueue: [],
  playbackHistory: [], // Initialize empty history stack
  isConfigLoading: false,
  audioElement: null,

  // Search page runtime state
  searchText: "",
  searchPlaylist: null,
  searchSelectedIds: new Set(),
  searchDownloadingIds: new Set(),
  searchDownloadedIds: new Set(),
  searchFailedIds: new Set(),
  searchSearching: false,
  searchDownloadingAll: false,
  searchMessageToShow: null,
  searchCoverUrls: {},
  searchPlaylistCoverUrl: null,

  // Load config from backend
  loadConfig: async () => {
    set({ isConfigLoading: true })
    try {
      const config = await get_config()
      applyTheme(config.theme || "auto")
      const playlists = config.playlists
      set({
        config,
        currentAudio: config.last_audio || null,
        isConfigLoading: false,
      })

      // Restore playback queue
      if (config.last_audio) {
        const lastAudioId = config.last_audio.audio.id
        let queue: LocalAudio[] = []

        // 1. Try to find in playlists
        const foundPlaylist = playlists.find((p) =>
          p.audios.some((a) => a.audio.id === lastAudioId),
        )
        if (foundPlaylist) {
          queue = foundPlaylist.audios
        } else {
          // 2. Try to find in all audios (Music list)
          const foundInAll = (config.audios || []).some(
            (a) => a.audio.id === lastAudioId,
          )
          if (foundInAll) {
            queue = config.audios || []
          } else {
            // 3. Fallback to just this audio
            queue = [config.last_audio]
          }
        }
        set({ playbackQueue: queue })
      }
    } catch (error) {
      console.error("Failed to load config:", error)
      set({ isConfigLoading: false })
    }
  },

  // Save config to backend
  saveConfig: async (config: Config) => {
    try {
      await save_config(config)
      set({
        config,
      })
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
  },

  // Set theme mode
  setThemeMode: (theme: ThemeMode) => {
    localStorage.setItem("themeMode", theme)
    const { config } = get()
    config.theme = theme
    applyTheme(theme)
    set({ config })
    if (config) {
      const updatedConfig = { ...config, theme }
      save_config(updatedConfig).catch((error) => {
        console.error("Failed to save theme to config:", error)
      })
    }
  },

  // Set audio element
  setAudioElement: (element: HTMLAudioElement | null) => {
    set({ audioElement: element })
    if (element) {
      element.onended = () => {
        get().playNext(true)
      }
    }
  },

  // Play audio
  playAudio: async (
    audio: LocalAudio,
    queue?: LocalAudio[],
    addToHistory: boolean = true,
  ) => {
    const { audioElement, currentAudio, playbackHistory } = get()
    try {
      const url = await get_web_url(audio.path)

      // Add current audio to history before switching (if not from history navigation)
      if (addToHistory && currentAudio) {
        const newHistory = [...playbackHistory, currentAudio]
        // Limit history to last 50 tracks to prevent memory issues
        if (newHistory.length > 50) {
          newHistory.shift()
        }
        set({ playbackHistory: newHistory })
      }

      // Update queue if provided
      if (queue) {
        set({ playbackQueue: queue })
      }

      set({
        currentAudio: audio,
        audioUrl: url,
        isPlaying: true,
      })

      if (audioElement) {
        audioElement.src = url
        audioElement.playbackRate = get().playbackRate // Ensure rate is preserved
        await audioElement.play()
      }

      // Save as last played audio
      get().setLastAudio(audio)
    } catch (error) {
      console.error("Failed to play audio:", error)
      set({ isPlaying: false })
    }
  },

  // Play Next - Choose next track based on play mode
  playNext: async (auto: boolean = false) => {
    const { currentAudio, playbackQueue, playMode } = get()
    if (!currentAudio || playbackQueue.length === 0) return

    const currentIndex = playbackQueue.findIndex(
      (a) => a.audio.id === currentAudio.audio.id,
    )
    if (currentIndex === -1) return

    let nextIndex = -1

    switch (playMode) {
      case "single-loop":
        // Auto: repeat same track, Manual: go to next
        nextIndex = auto
          ? currentIndex
          : (currentIndex + 1) % playbackQueue.length
        break

      case "shuffle":
        // Random track (avoid current track if possible)
        if (playbackQueue.length > 1) {
          do {
            nextIndex = Math.floor(Math.random() * playbackQueue.length)
          } while (nextIndex === currentIndex && playbackQueue.length > 1)
        } else {
          nextIndex = 0
        }
        break

      case "list-loop":
        // Loop to beginning after last track
        nextIndex = (currentIndex + 1) % playbackQueue.length
        break
      default:
        // Stop at end if auto, wrap if manual
        if (currentIndex < playbackQueue.length - 1) {
          nextIndex = currentIndex + 1
        } else if (!auto) {
          // Manual: wrap to beginning
          nextIndex = 0
        } else {
          // Auto: stop playing
          get().pauseAudio()
          return
        }
        break
    }

    if (nextIndex >= 0 && nextIndex < playbackQueue.length) {
      await get().playAudio(playbackQueue[nextIndex], undefined, true)
    }
  },

  // Play Previous - Pop from history stack
  playPrev: async () => {
    const { playbackHistory } = get()

    // Check if history is empty
    if (playbackHistory.length === 0) {
      return
    }

    // Pop the last audio from history
    const prevAudio = playbackHistory[playbackHistory.length - 1]
    const newHistory = playbackHistory.slice(0, -1)

    set({ playbackHistory: newHistory })

    // Play without adding to history (addToHistory = false)
    await get().playAudio(prevAudio, undefined, false)
  },

  // Check if previous button should be enabled
  canPlayPrev: () => {
    const { playbackHistory } = get()
    return playbackHistory.length > 0
  },

  // Toggle Play Mode
  togglePlayMode: () => {
    const { playMode } = get()
    const modes: PlayMode[] = [
      "sequence",
      "list-loop",
      "single-loop",
      "shuffle",
    ]
    const nextIndex = (modes.indexOf(playMode) + 1) % modes.length
    set({ playMode: modes[nextIndex] })
  },

  // Pause audio
  pauseAudio: () => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.pause()
    }
    set({ isPlaying: false })
  },

  // Resume audio
  resumeAudio: () => {
    const { audioElement, audioUrl, currentAudio, playAudio } = get()

    // If no URL but we have a current audio, try to play it (lazy load)
    if (!audioUrl && currentAudio) {
      playAudio(currentAudio)
      return
    }

    if (audioElement && audioUrl) {
      audioElement.play().catch((error) => {
        console.error("Failed to resume audio:", error)
      })
      set({ isPlaying: true })
    }
  },

  // Toggle play/pause
  togglePlay: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      get().pauseAudio()
    } else {
      get().resumeAudio()
    }
  },

  // Add audios to config
  addAudiosToConfig: async (newAudios: LocalAudio[]) => {
    const { config } = get()
    if (!config) return

    const existingIds = new Set(config.audios.map((a) => a.audio.id))
    const uniqueNewAudios = newAudios.filter(
      (a) => !existingIds.has(a.audio.id),
    )

    if (uniqueNewAudios.length === 0) return

    const updatedConfig: Config = {
      ...config,
      audios: [...config.audios, ...uniqueNewAudios],
    }

    await get().saveConfig(updatedConfig)
  },

  // Add playlist to config
  addPlaylistToConfig: async (playlist: LocalPlaylist) => {
    const { config } = get()
    if (!config) return

    const existingIndex = config.playlists.findIndex(
      (p) => p.id === playlist.id,
    )
    let updatedPlaylists: LocalPlaylist[]

    if (existingIndex >= 0) {
      // Update existing playlist
      updatedPlaylists = [...config.playlists]
      updatedPlaylists[existingIndex] = playlist
    } else {
      // Add new playlist
      updatedPlaylists = [...config.playlists, playlist]
    }

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  // Set last played audio
  setLastAudio: async (audio: LocalAudio) => {
    const { config } = get()
    if (!config) return

    const updatedConfig: Config = {
      ...config,
      last_audio: audio,
    }

    try {
      await save_config(updatedConfig)
      set({ config: updatedConfig })
    } catch (error) {
      console.error("Failed to save last audio:", error)
    }
  },

  // Set playback rate
  setPlaybackRate: (rate: number) => {
    const { audioElement } = get()
    set({ playbackRate: rate })
    if (audioElement) {
      audioElement.playbackRate = rate
    }
  },

  isFavorited(id: string) {
    const {
      config: { playlists },
    } = get()
    const v = playlists.find((i) => i.id === FAVORITE_PLAYLIST_ID)
    if (!v) {
      return false
    }
    return !!v.audios.find((a) => a.audio.id === id)
  },

  // Toggle favorite
  toggleFavorite: async (audio: LocalAudio) => {
    const { config } = get()
    if (!config) return

    let playlists = config.playlists
    let favPlaylist = playlists.find((p) => p.id === FAVORITE_PLAYLIST_ID)

    if (!favPlaylist) {
      favPlaylist = {
        id: FAVORITE_PLAYLIST_ID,
        title: FAVORITE_PLAYLIST_ID,
        cover_path: null,
        audios: [],
        platform: "File",
      }
      playlists.unshift(favPlaylist)
    }

    // Check if audio exists
    const exists = favPlaylist.audios.some((a) => a.audio.id === audio.audio.id)

    const updatedFavPlaylist = { ...favPlaylist }
    if (exists) {
      updatedFavPlaylist.audios = favPlaylist.audios.filter(
        (a) => a.audio.id !== audio.audio.id,
      )
    } else {
      updatedFavPlaylist.audios = [audio, ...favPlaylist.audios] // Add to top
    }

    // Update playlists array
    playlists = playlists.map((p) =>
      p.id === FAVORITE_PLAYLIST_ID ? updatedFavPlaylist : p,
    )
    if (
      playlists[0]?.id === FAVORITE_PLAYLIST_ID &&
      playlists[0].audios.length === 0
    ) {
      playlists.shift()
    }

    const updatedConfig: Config = {
      ...config,
      playlists,
    }

    await get().saveConfig(updatedConfig)
  },

  // Delete audio
  deleteAudio: async (id: string) => {
    const { config, currentAudio, pauseAudio } = get()
    if (!config) return

    // Stop playback if it's the current audio
    if (currentAudio?.audio.id === id) {
      pauseAudio()
      set({ currentAudio: null, audioUrl: null })
    }

    // Remove from main list
    const updatedAudios = config.audios.filter((a) => a.audio.id !== id)

    // Remove from all playlists
    const updatedPlaylists = config.playlists.map((p) => ({
      ...p,
      audios: p.audios.filter((a) => a.audio.id !== id),
    }))

    const updatedConfig: Config = {
      ...config,
      audios: updatedAudios,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  // Delete playlist
  deletePlaylist: async (id: string) => {
    const { config } = get()
    if (!config) return

    const updatedPlaylists = config.playlists.filter((p) => p.id !== id)

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  // Search page runtime actions
  setSearchText: (text: string) => {
    set({ searchText: text })
  },

  setSearchPlaylist: (playlist: Playlist | null) => {
    set({ searchPlaylist: playlist })
  },

  addSearchSelectedId: (id: string) => {
    set((state) => ({
      searchSelectedIds: new Set(state.searchSelectedIds).add(id),
    }))
  },

  removeSearchSelectedId: (id: string) => {
    set((state) => {
      const newSet = new Set(state.searchSelectedIds)
      newSet.delete(id)
      return { searchSelectedIds: newSet }
    })
  },

  setSearchSelectedIds: (ids: Set<string>) => {
    set({ searchSelectedIds: ids })
  },

  addSearchDownloadingId: (id: string) => {
    set((state) => ({
      searchDownloadingIds: new Set(state.searchDownloadingIds).add(id),
    }))
  },

  removeSearchDownloadingId: (id: string) => {
    set((state) => {
      const newSet = new Set(state.searchDownloadingIds)
      newSet.delete(id)
      return { searchDownloadingIds: newSet }
    })
  },

  addSearchDownloadedId: (id: string) => {
    set((state) => ({
      searchDownloadedIds: new Set(state.searchDownloadedIds).add(id),
    }))
  },

  addSearchFailedId: (id: string) => {
    set((state) => ({
      searchFailedIds: new Set(state.searchFailedIds).add(id),
    }))
  },

  removeSearchFailedId: (id: string) => {
    set((state) => {
      const newSet = new Set(state.searchFailedIds)
      newSet.delete(id)
      return { searchFailedIds: newSet }
    })
  },

  setSearchSearching: (searching: boolean) => {
    set({ searchSearching: searching })
  },

  setSearchDownloadingAll: (downloadingAll: boolean) => {
    set({ searchDownloadingAll: downloadingAll })
  },

  setSearchMessageToShow: (
    message: { type: "success" | "error" | "warning"; text: string } | null,
  ) => {
    set({ searchMessageToShow: message })
  },

  setSearchCoverUrls: (urls: Record<string, string>) => {
    set({ searchCoverUrls: urls })
  },

  addSearchCoverUrl: (audioId: string, url: string) => {
    set((state) => ({
      searchCoverUrls: { ...state.searchCoverUrls, [audioId]: url },
    }))
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
      searchMessageToShow: null,
      searchCoverUrls: {},
      searchPlaylistCoverUrl: null,
    })
  },
}))

// Export convenience hooks
export const useConfig = () => useAppStore((state) => state.config)
export const usePlaylists = () => useAppStore((state) => state.config.playlists)
export const useAudios = () => useAppStore((state) => state.config.audios)
export const useCurrentAudio = () => useAppStore((state) => state.currentAudio)
export const useIsPlaying = () => useAppStore((state) => state.isPlaying)
export const usePlaybackRate = () => useAppStore((state) => state.playbackRate)
export const usePlayMode = () => useAppStore((state) => state.playMode)
export const useThemeMode = () =>
  useAppStore((state) => state.config?.theme || get_system_theme())

// Search page runtime hooks
export const useSearchText = () => useAppStore((state) => state.searchText)
export const useSearchPlaylist = () =>
  useAppStore((state) => state.searchPlaylist)
export const useSearchSelectedIds = () =>
  useAppStore((state) => state.searchSelectedIds)
export const useSearchDownloadingIds = () =>
  useAppStore((state) => state.searchDownloadingIds)
export const useSearchDownloadedIds = () =>
  useAppStore((state) => state.searchDownloadedIds)
export const useSearchFailedIds = () =>
  useAppStore((state) => state.searchFailedIds)
export const useSearchSearching = () =>
  useAppStore((state) => state.searchSearching)
export const useSearchDownloadingAll = () =>
  useAppStore((state) => state.searchDownloadingAll)
export const useSearchMessageToShow = () =>
  useAppStore((state) => state.searchMessageToShow)
export const useSearchCoverUrls = () =>
  useAppStore((state) => state.searchCoverUrls)
export const useSearchPlaylistCoverUrl = () =>
  useAppStore((state) => state.searchPlaylistCoverUrl)

// Search page runtime actions
export const {
  setSearchText,
  setSearchPlaylist,
  addSearchSelectedId,
  removeSearchSelectedId,
  setSearchSelectedIds,
  addSearchDownloadingId,
  removeSearchDownloadingId,
  addSearchDownloadedId,
  addSearchFailedId,
  removeSearchFailedId,
  setSearchSearching,
  setSearchDownloadingAll,
  setSearchMessageToShow,
  setSearchCoverUrls,
  addSearchCoverUrl,
  setSearchPlaylistCoverUrl,
  clearSearchRuntimeData,
} = useAppStore.getState()
