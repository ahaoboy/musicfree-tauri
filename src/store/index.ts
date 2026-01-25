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
  FAVORITE_PLAYLIST_TITLE,
  AUDIO_PLAYLIST_ID,
  AUDIO_PLAYLIST_TITLE,
  Playlist,
  storage,
  app_version,
  app_dir,
} from "../api"

const MAX_HISTORY_SIZE = 64

// ============================================
// Persistent Data Interface
// ============================================
interface PersistentData {
  config: Config
}

// ============================================
// Runtime Data Interface
// ============================================
interface RuntimeData {
  // Current playback state
  currentAudio: LocalAudio | null
  currentPlaylistId: string | null // Track which playlist is playing
  audioUrl: string | null
  isPlaying: boolean
  playbackRate: number
  playMode: PlayMode
  playbackHistory: LocalAudio[]
  theme: ThemeMode // Theme stored in localStorage
  duration: number
  currentTime: number

  // Loading states
  isConfigLoading: boolean

  // Audio element reference
  audioElement: HTMLAudioElement

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

  // App info
  app_dir: string | null
  app_version: string | null
}

// ============================================
// App State Interface
// ============================================
interface AppState extends PersistentData, RuntimeData {
  // Config actions
  loadConfig: () => Promise<void>
  saveConfig: (config: Config) => Promise<void>
  setThemeMode: (mode: ThemeMode) => void
  isDark: () => boolean

  // Playlist actions
  addPlaylistToConfig: (playlist: LocalPlaylist) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  getTotalAudios: () => LocalAudio[]

  // Audio actions (operates on AUDIO_PLAYLIST)
  addAudiosToConfig: (audios: LocalAudio[]) => Promise<void>
  deleteAudio: (audioId: string, playlistId: string) => Promise<void>

  // Favorite actions
  toggleFavorite: (audio: LocalAudio) => Promise<void>
  isFavoritedAudio: (id: string) => boolean

  // Playback actions
  playAudio: (
    audio: LocalAudio,
    playlistId: string,
    addToHistory?: boolean,
  ) => Promise<void>
  loadAudioMetadata: (audio: LocalAudio) => Promise<void>
  pauseAudio: () => void
  resumeAudio: () => void
  togglePlay: () => void
  playNext: () => Promise<void>
  playPrev: () => Promise<void>
  canPlayPrev: () => boolean
  togglePlayMode: () => void
  setupAudioListeners: () => void
  listenersInitialized: boolean
  seekTo: (time: number) => void

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

// ============================================
// Helper Functions
// ============================================

// Apply theme to document
export const applyTheme = (mode?: ThemeMode | null) => {
  if (typeof document !== "undefined") {
    const effectiveMode = mode || "auto"
    const actualTheme =
      effectiveMode === "auto" ? get_system_theme() : effectiveMode

    document.documentElement.setAttribute(
      "data-prefers-color-scheme",
      actualTheme,
    )
  }
}

// Get or create AUDIO playlist
const getOrCreateAudioPlaylist = (config: Config): LocalPlaylist => {
  let audioPlaylist = config.playlists.find((p) => p.id === AUDIO_PLAYLIST_ID)
  if (!audioPlaylist) {
    audioPlaylist = {
      id: AUDIO_PLAYLIST_ID,
      title: AUDIO_PLAYLIST_TITLE,
      cover_path: null,
      audios: [],
      platform: "File",
      download_url: undefined,
    }
    config.playlists.push(audioPlaylist)
  }
  return audioPlaylist
}

// Get or create FAVORITE playlist
const getOrCreateFavoritePlaylist = (config: Config): LocalPlaylist => {
  let favPlaylist = config.playlists.find((p) => p.id === FAVORITE_PLAYLIST_ID)
  if (!favPlaylist) {
    favPlaylist = {
      id: FAVORITE_PLAYLIST_ID,
      title: FAVORITE_PLAYLIST_TITLE,
      cover_path: null,
      audios: [],
      platform: "File",
      download_url: undefined,
    }
    // Always insert at the beginning
    config.playlists.unshift(favPlaylist)
  }
  return favPlaylist
}

// ============================================
// Create Store
// ============================================
export const useAppStore = create<AppState>((set, get) => ({
  // ============================================
  // Initial State
  // ============================================
  config: get_default_config(),
  currentAudio: storage.getCurrentAudio(),
  currentPlaylistId: storage.getCurrentPlaylistId(),
  audioUrl: null,
  isPlaying: false,
  playbackRate: 1,
  playMode: storage.getPlayMode(),
  theme: storage.getTheme(),
  playbackHistory: [],
  isConfigLoading: false,
  audioElement: new Audio(),
  duration: 0,
  currentTime: 0,

  // Search state
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
  listenersInitialized: false,

  // App info
  app_dir: null,
  app_version: null,

  // ============================================
  // Config Actions
  // ============================================
  loadConfig: async () => {
    set({ isConfigLoading: true })
    const { audioElement, setupAudioListeners, listenersInitialized } = get()
    try {
      const config = await get_config()
      applyTheme(storage.getTheme())

      const currentAudio = storage.getCurrentAudio()
      const currentPlaylistId = storage.getCurrentPlaylistId()
      if (currentAudio && currentPlaylistId) {
        audioElement.src = await get_web_url(currentAudio.path)
      }
      if (!listenersInitialized) {
        setupAudioListeners()
      }

      const [dir, version] = await Promise.all([app_dir(), app_version()])

      set({
        config,
        isConfigLoading: false,
        currentAudio,
        currentPlaylistId,
        listenersInitialized: true,
        app_dir: dir,
        app_version: version,
      })
    } catch (error) {
      console.error("Failed to load config:", error)
      set({ isConfigLoading: false })
    }
  },

  // Setup audio event listeners
  setupAudioListeners: () => {
    const { audioElement } = get()
    // Time update
    audioElement.addEventListener("timeupdate", () => {
      set({
        currentTime: audioElement.currentTime,
        duration: audioElement.duration || 0,
      })
    })

    // Metadata loaded
    audioElement.addEventListener("loadedmetadata", () => {
      set({
        duration: audioElement.duration || 0,
      })
    })

    // Audio ended - auto play next
    audioElement.addEventListener("ended", () => {
      get().playNext()
    })

    // Error handling
    audioElement.addEventListener("error", (e) => {
      console.error("Audio playback error:", e)
      set({ isPlaying: false })
    })
  },

  saveConfig: async (config: Config) => {
    try {
      await save_config(config)
      set({ config })
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
  },

  isDark() {
    const { theme } = get()
    return (
      theme === "dark" || (theme === "auto" && get_system_theme() === "dark")
    )
  },
  getTotalAudios(): LocalAudio[] {
    const { config } = get()
    return config.playlists.flatMap((i) => i.audios)
  },

  setThemeMode: (mode: ThemeMode) => {
    // Update store state
    set({ theme: mode })
    // Sync to localStorage for persistence
    storage.setTheme(mode)
    // Apply theme to document
    applyTheme(mode)
  },

  // ============================================
  // Playlist Actions
  // ============================================
  addPlaylistToConfig: async (playlist: LocalPlaylist) => {
    const { config } = get()
    if (!config) return

    const existingIndex = config.playlists.findIndex(
      (p) => p.id === playlist.id,
    )
    let updatedPlaylists: LocalPlaylist[]

    if (existingIndex >= 0) {
      // Merge with existing playlist
      const existing = config.playlists[existingIndex]
      const existingAudioMap = new Map(
        existing.audios.map((a) => [a.audio.id, a]),
      )

      // Build merged audios following this priority:
      // 1. Items in new playlist: follow new playlist order (prefer existing local data)
      // 2. Items only in old playlist: append at the end (keep old data)

      const mergedAudios: LocalAudio[] = []
      const processedIds = new Set<string>()

      // First pass: add all items from new playlist in order
      for (const newLocalAudio of playlist.audios) {
        const audioId = newLocalAudio.audio.id
        processedIds.add(audioId)

        const existingLocalAudio = existingAudioMap.get(audioId)
        if (existingLocalAudio) {
          // Audio exists in both: use existing local data (already downloaded)
          // but update metadata from new playlist
          mergedAudios.push({
            ...existingLocalAudio,
            audio: {
              ...existingLocalAudio.audio,
              ...newLocalAudio.audio, // Update metadata from new playlist
            },
          })
        } else {
          // Audio only in new playlist: use new data
          mergedAudios.push(newLocalAudio)
        }
      }

      // Second pass: add items that only exist in old playlist
      for (const existingAudio of existing.audios) {
        const audioId = existingAudio.audio.id
        if (!processedIds.has(audioId)) {
          mergedAudios.push(existingAudio)
        }
      }

      const mergedPlaylist: LocalPlaylist = {
        ...playlist,
        audios: mergedAudios,
        cover_path: playlist.cover_path || existing.cover_path,
      }

      // Move updated playlist to the front
      updatedPlaylists = [
        mergedPlaylist,
        ...config.playlists.filter((_p, i) => i !== existingIndex),
      ]
    } else {
      // Add new playlist to the front (but after special playlists)
      const specialPlaylists = config.playlists.filter(
        (p) => p.id === FAVORITE_PLAYLIST_ID || p.id === AUDIO_PLAYLIST_ID,
      )
      const regularPlaylists = config.playlists.filter(
        (p) => p.id !== FAVORITE_PLAYLIST_ID && p.id !== AUDIO_PLAYLIST_ID,
      )
      updatedPlaylists = [...specialPlaylists, playlist, ...regularPlaylists]
    }

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  deletePlaylist: async (id: string) => {
    const { config } = get()
    if (!config) return

    // Don't allow deleting special playlists
    if (id === FAVORITE_PLAYLIST_ID || id === AUDIO_PLAYLIST_ID) {
      console.warn("Cannot delete special playlist:", id)
      return
    }

    const updatedPlaylists = config.playlists.filter((p) => p.id !== id)
    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  // ============================================
  // Audio Actions (AUDIO_PLAYLIST)
  // ============================================
  addAudiosToConfig: async (audios: LocalAudio[]) => {
    const { config } = get()
    if (!config) return

    const audioPlaylist = getOrCreateAudioPlaylist(config)

    // Add new audios to the front, avoiding duplicates
    const existingIds = new Set(audioPlaylist.audios.map((a) => a.audio.id))
    const newAudios = audios.filter((a) => !existingIds.has(a.audio.id))
    audioPlaylist.audios.unshift(...newAudios)

    await get().saveConfig(config)
  },

  deleteAudio: async (audioId: string, playlistId: string) => {
    const { config } = get()
    if (!config) return

    // Helper function to remove audio from a playlist
    const removeAudioFromPlaylist = (pId: string) => {
      const playlist = config.playlists.find((p) => p.id === pId)
      if (!playlist) return false

      playlist.audios = playlist.audios.filter((a) => a.audio.id !== audioId)
      return playlist.audios.length === 0
    }

    // Helper function to remove empty playlist
    const removeEmptyPlaylist = (pId: string) => {
      config.playlists = config.playlists.filter((p) => p.id !== pId)
    }

    // Remove from target playlist
    const targetIsEmpty = removeAudioFromPlaylist(playlistId)

    // Remove target playlist if empty (except AUDIO_PLAYLIST)
    if (targetIsEmpty && playlistId !== AUDIO_PLAYLIST_ID) {
      removeEmptyPlaylist(playlistId)
    }

    // Also remove from FAVORITE if not deleting from FAVORITE
    if (playlistId !== FAVORITE_PLAYLIST_ID) {
      const favIsEmpty = removeAudioFromPlaylist(FAVORITE_PLAYLIST_ID)
      if (favIsEmpty) {
        removeEmptyPlaylist(FAVORITE_PLAYLIST_ID)
      }
    }

    await get().saveConfig(config)
  },

  // ============================================
  // Favorite Actions
  // ============================================
  toggleFavorite: async (audio: LocalAudio) => {
    const { config } = get()
    if (!config) return

    const favPlaylist = getOrCreateFavoritePlaylist(config)
    const index = favPlaylist.audios.findIndex(
      (a) => a.audio.id === audio.audio.id,
    )

    let updatedPlaylists: LocalPlaylist[]

    if (index >= 0) {
      // Remove from favorites - create new array without the audio
      const updatedAudios = favPlaylist.audios.filter(
        (a) => a.audio.id !== audio.audio.id,
      )

      if (updatedAudios.length === 0) {
        // Remove playlist if empty
        updatedPlaylists = config.playlists.filter(
          (p) => p.id !== FAVORITE_PLAYLIST_ID,
        )
      } else {
        // Update playlist with new audios array
        updatedPlaylists = config.playlists.map((p) =>
          p.id === FAVORITE_PLAYLIST_ID ? { ...p, audios: updatedAudios } : p,
        )
      }
    } else {
      // Add to favorites - create new array with the audio at the front
      const updatedAudios = [audio, ...favPlaylist.audios]
      updatedPlaylists = config.playlists.map((p) =>
        p.id === FAVORITE_PLAYLIST_ID ? { ...p, audios: updatedAudios } : p,
      )
    }

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  isFavoritedAudio: (id: string) => {
    const { config } = get()
    const favPlaylist = config.playlists.find(
      (p) => p.id === FAVORITE_PLAYLIST_ID,
    )
    if (!favPlaylist) return false
    return favPlaylist.audios.some((a) => a.audio.id === id)
  },

  // ============================================
  // Playback Actions
  // ============================================
  playAudio: async (
    audio: LocalAudio,
    playlistId: string,
    addToHistory: boolean = true,
  ) => {
    const { currentAudio, audioElement, playbackHistory } = get()

    // Add current audio to history if different
    if (
      addToHistory &&
      currentAudio &&
      currentAudio.audio.id !== audio.audio.id
    ) {
      const newHistory = [...playbackHistory, currentAudio]
      // Limit history to 50 items
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
      }
      set({ playbackHistory: newHistory })
    }

    try {
      const url = await get_web_url(audio.path)
      set({
        currentAudio: audio,
        currentPlaylistId: playlistId,
        audioUrl: url,
        duration: audio.audio.duration || 0,
        isPlaying: false,
      })

      // Save to localStorage
      storage.setCurrentAudio(audio)
      storage.setCurrentPlaylistId(playlistId)

      if (audioElement) {
        // Pause current playback to avoid conflicts
        audioElement.pause()

        // Set new source and load
        audioElement.src = url
        audioElement.load()

        try {
          // Wait for loadedmetadata before playing
          await new Promise<void>((resolve, reject) => {
            const onLoadedMetadata = () => {
              audioElement.removeEventListener(
                "loadedmetadata",
                onLoadedMetadata,
              )
              audioElement.removeEventListener("error", onError)
              resolve()
            }
            const onError = (e: Event) => {
              audioElement.removeEventListener(
                "loadedmetadata",
                onLoadedMetadata,
              )
              audioElement.removeEventListener("error", onError)
              reject(e)
            }
            audioElement.addEventListener("loadedmetadata", onLoadedMetadata, {
              once: true,
            })
            audioElement.addEventListener("error", onError, { once: true })
          })

          // Now play
          await audioElement.play()
          set({ isPlaying: true })
        } catch (error) {
          // Ignore AbortError when switching tracks quickly
          if (error instanceof Error && error.name === "AbortError") {
            console.log("Play interrupted by new load request")
          } else {
            console.error("Failed to play audio:", error)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load audio:", error)
    }
  },

  loadAudioMetadata: async (audio: LocalAudio) => {
    const { audioElement } = get()
    if (!audioElement) return

    try {
      const url = await get_web_url(audio.path)
      audioElement.src = url
      audioElement.load()
    } catch (error) {
      console.error("Failed to load audio metadata:", error)
    }
  },

  pauseAudio: () => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.pause()
      set({ isPlaying: false })
    }
  },

  resumeAudio: () => {
    const { audioElement } = get()
    audioElement.play()
    set({ isPlaying: true })
  },

  togglePlay: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      get().pauseAudio()
    } else {
      get().resumeAudio()
    }
  },

  playNext: async () => {
    const { currentAudio, playMode, config, currentPlaylistId } = get()
    if (!currentAudio || !currentPlaylistId) return

    // Get current playlist
    const playlist = config.playlists.find((p) => p.id === currentPlaylistId)
    if (!playlist || playlist.audios.length === 0) return

    const currentIndex = playlist.audios.findIndex(
      (a) => a.audio.id === currentAudio.audio.id,
    )

    let nextAudio: LocalAudio | null = null

    switch (playMode) {
      case "sequence":
        // Play next in sequence, stop at end
        if (currentIndex < playlist.audios.length - 1) {
          nextAudio = playlist.audios[currentIndex + 1]
        }
        break

      case "list-loop":
        // Loop to beginning when reaching end
        nextAudio = playlist.audios[(currentIndex + 1) % playlist.audios.length]
        break

      case "single-loop":
        // Repeat current audio
        nextAudio = currentAudio
        break

      case "shuffle": {
        // Random audio from playlist
        const randomIndex = Math.floor(Math.random() * playlist.audios.length)
        nextAudio = playlist.audios[randomIndex]
        break
      }
    }

    if (nextAudio) {
      await get().playAudio(nextAudio, currentPlaylistId, true)
    }
  },

  playPrev: async () => {
    const { playbackHistory, currentPlaylistId } = get()
    if (playbackHistory.length === 0 || !currentPlaylistId) return

    const prevAudio = playbackHistory[playbackHistory.length - 1]
    const newHistory = playbackHistory.slice(0, -1)

    set({ playbackHistory: newHistory })
    await get().playAudio(prevAudio, currentPlaylistId, false)
  },

  canPlayPrev: () => {
    return get().playbackHistory.length > 0
  },

  togglePlayMode: () => {
    const { playMode } = get()
    const modes: PlayMode[] = [
      "sequence",
      "list-loop",
      "single-loop",
      "shuffle",
    ]
    const currentIndex = modes.indexOf(playMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    set({ playMode: nextMode })
    storage.setPlayMode(nextMode)
  },

  seekTo: (time: number) => {
    const { audioElement } = get()
    if (audioElement && Number.isFinite(time)) {
      audioElement.currentTime = time
      set({ currentTime: time })
    }
  },

  // setPlaybackRate: (rate: number) => {
  //   const { audioElement } = get()
  //   if (audioElement) {
  //     audioElement.playbackRate = rate
  //   }
  //   set({ playbackRate: rate })
  // },

  // ============================================
  // Search Actions
  // ============================================
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
}))

// ============================================
// Convenience Hooks
// ============================================
export const useConfig = () => useAppStore((state) => state.config)
export const usePlaylists = () => useAppStore((state) => state.config.playlists)

// Get AUDIO playlist audios
export const useAudios = (): LocalAudio[] => {
  const playlists = useAppStore((state) => state.config.playlists)
  const audioPlaylist = playlists.find((p) => p.id === AUDIO_PLAYLIST_ID)
  return audioPlaylist?.audios || []
}

// Get FAVORITE playlist
export const useFavorite = (): LocalPlaylist | null => {
  const playlists = useAppStore((state) => state.config.playlists)
  const favPlaylist = playlists.find((p) => p.id === FAVORITE_PLAYLIST_ID)
  return favPlaylist || null
}

// Get FAVORITE audios
export const useFavoriteAudios = (): LocalAudio[] => {
  const playlists = useAppStore((state) => state.config.playlists)
  const favPlaylist = playlists.find((p) => p.id === FAVORITE_PLAYLIST_ID)
  return favPlaylist?.audios || []
}

// Get user playlists (excluding special playlists)
export const useUserPlaylists = (): LocalPlaylist[] => {
  const playlists = useAppStore((state) => state.config.playlists)
  return playlists.filter(
    (p) => p.id !== AUDIO_PLAYLIST_ID && p.id !== FAVORITE_PLAYLIST_ID,
  )
}

// Get playlists for PlaylistsPage (FAVORITE + user playlists)
export const usePlaylistsPageData = (): LocalPlaylist[] => {
  const playlists = useAppStore((state) => state.config.playlists)
  const filtered = playlists.filter((p) => p.id !== AUDIO_PLAYLIST_ID)
  // Filter out empty FAVORITE playlist
  return filtered.filter(
    (p) => p.id !== FAVORITE_PLAYLIST_ID || p.audios.length > 0,
  )
}

export const useCurrentAudio = () => useAppStore((state) => state.currentAudio)
export const useIsPlaying = () => useAppStore((state) => state.isPlaying)
export const usePlaybackRate = () => useAppStore((state) => state.playbackRate)
export const usePlayMode = () => useAppStore((state) => state.playMode)
export const useThemeMode = () => useAppStore((state) => state.theme)
export const useCurrentTime = () => useAppStore((state) => state.currentTime)
export const useDuration = () => useAppStore((state) => state.duration)
