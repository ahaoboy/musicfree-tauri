import { StateCreator } from "zustand"
import type { AppState } from "./index"
import {
  LocalAudio,
  LocalPlaylist,
  Config,
  get_config,
  save_config,
  get_default_config,
  ThemeMode,
  get_system_theme,
  FAVORITE_PLAYLIST_ID,
  FAVORITE_PLAYLIST_TITLE,
  AUDIO_PLAYLIST_ID,
  AUDIO_PLAYLIST_TITLE,
  storage,
  app_version,
  app_dir,
  get_web_url,
  remove_file,
  GistConfig,
  syncWithGist,
} from "../api"

// ============================================
// Config Slice State Interface
// ============================================
export interface ConfigSliceState {
  // Persistent data
  config: Config

  // Loading states
  isConfigLoading: boolean

  // Sync state
  isSyncing: boolean
  gistConfig: GistConfig | null

  // Theme
  theme: ThemeMode

  // App info
  app_dir: string | null
  app_version: string | null

  // UI State
  viewingPlaylistId: string | null
}

// ============================================
// Config Slice Actions Interface
// ============================================
export interface ConfigSliceActions {
  // Config actions
  loadConfig: () => Promise<void>
  saveConfig: (config: Config) => Promise<void>
  // setThemeMode: (mode: ThemeMode) => void
  // isDark: () => boolean

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

  // UI Actions
  setViewingPlaylistId: (id: string | null) => void

  // Gist actions
  setGistConfig: (config: GistConfig | null) => void
  syncGist: (manual?: boolean) => Promise<void>
}

export type ConfigSlice = ConfigSliceState & ConfigSliceActions

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
// Create Config Slice
// ============================================
export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (
  set,
  get,
) => ({
  // Initial state
  config: get_default_config(),
  isConfigLoading: true,
  isSyncing: false,
  gistConfig: storage.getGistConfig(),
  theme: storage.getTheme(),
  app_dir: null,
  app_version: null,
  viewingPlaylistId: null,

  // Config actions
  loadConfig: async () => {
    set({ isConfigLoading: true })
    const { audioElement, setupAudioListeners, listenersInitialized } = get()
    try {
      const config = await get_config()
      applyTheme(storage.getTheme())

      const [dir, version] = await Promise.all([app_dir(), app_version()])

      // Restore playback state with validation
      const storedAudio = storage.getCurrentAudio()
      const storedPlaylistId = storage.getCurrentPlaylistId()

      let restoredAudio: LocalAudio | null = null
      let restoredPlaylistId: string | null = null
      let initialDuration = 0

      if (storedAudio && storedPlaylistId) {
        const playlist = config.playlists.find((p) => p.id === storedPlaylistId)
        if (playlist) {
          const audio = playlist.audios.find(
            (a) => a.audio.id === storedAudio.audio.id,
          )
          if (audio) {
            restoredAudio = audio
            restoredPlaylistId = storedPlaylistId
            initialDuration = audio.audio.duration || 0
            audioElement.src = await get_web_url(audio.path)
          }
        }
      }

      if (!listenersInitialized) {
        setupAudioListeners()
      }

      set({
        config,
        isConfigLoading: false,
        currentAudio: restoredAudio,
        currentPlaylistId: restoredPlaylistId,
        currentPlayMode: storage.getPlayMode(),
        duration: initialDuration,
        listenersInitialized: true,
        app_dir: dir,
        app_version: version,
      })
    } catch (error) {
      console.error("Failed to load config:", error)
      set({ isConfigLoading: false })
    }
  },

  saveConfig: async (config: Config) => {
    const { config: oldConfig } = get()
    if (JSON.stringify(oldConfig) === JSON.stringify(config)) {
      return
    }

    try {
      await save_config(config)
      set({ config })
      // Trigger background sync when config changes
      get().syncGist()
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
  },

  // isDark() {
  //   const { theme } = get()
  //   return (
  //     theme === "dark" || (theme === "auto" && get_system_theme() === "dark")
  //   )
  // },

  getTotalAudios(): LocalAudio[] {
    const { config } = get()
    return config.playlists.flatMap((i) => i.audios)
  },

  // setThemeMode: (mode: ThemeMode) => {
  //   set({ theme: mode })
  //   storage.setTheme(mode)
  //   applyTheme(mode)
  // },

  // Playlist actions
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

      const mergedAudios: LocalAudio[] = []
      const processedIds = new Set<string>()

      // First pass: add all items from new playlist in order
      for (const newLocalAudio of playlist.audios) {
        const audioId = newLocalAudio.audio.id
        processedIds.add(audioId)

        const existingLocalAudio = existingAudioMap.get(audioId)
        if (existingLocalAudio) {
          mergedAudios.push({
            ...existingLocalAudio,
            audio: {
              ...existingLocalAudio.audio,
              ...newLocalAudio.audio,
            },
          })
        } else {
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
    const { config, currentPlaylistId, pauseAudio } = get()
    if (!config) return

    // Don't allow deleting special playlists
    if (id === FAVORITE_PLAYLIST_ID || id === AUDIO_PLAYLIST_ID) {
      console.warn("Cannot delete special playlist:", id)
      return
    }

    // If deleting current playlist, stop playback
    if (currentPlaylistId === id) {
      pauseAudio()
      set({
        currentAudio: null,
        currentPlaylistId: null,
        audioUrl: null,
        isPlaying: false,
        duration: 0,
        currentTime: 0,
      })
      storage.setCurrentAudio(null)
      storage.setCurrentPlaylistId(null)
    }

    const playlistToRemove = config.playlists.find((p) => p.id === id)
    const updatedPlaylists = config.playlists.filter((p) => p.id !== id)

    // File Cleanup Logic
    if (playlistToRemove) {
      // 1. Collect all used paths in REMAINING playlists
      const usedAudioPaths = new Set<string>()
      const usedCoverPaths = new Set<string>()

      for (const p of updatedPlaylists) {
        if (p.cover_path) usedCoverPaths.add(p.cover_path)
        for (const a of p.audios) {
          usedAudioPaths.add(a.path)
          if (a.cover_path) usedCoverPaths.add(a.cover_path)
        }
      }

      // 2. Check and delete files from removed playlist
      for (const audio of playlistToRemove.audios) {
        if (!usedAudioPaths.has(audio.path)) {
          await remove_file(audio.path)
        }
        if (audio.cover_path && !usedCoverPaths.has(audio.cover_path)) {
          // Double check if cover is used by other audios in the SAME removed playlist?
          // No, we are deleting the whole playlist. If multiple items in deleted playlist shared a cover,
          // and that cover is NOT in updatedPlaylists, we delete it.
          // HOWEVER, we process item by item. If item A and B share cover C.
          // Processing A: usedCoverPaths doesn't have C. We delete C.
          // Processing B: usedCoverPaths doesn't have C. We try delete C again (ok, safe).
          // BUT if we delete C when processing A, and B needed it?
          // We are deleting B too. So it's fine.
          // The files are removed from disk.
          await remove_file(audio.cover_path)
        }
      }

      // 3. Playlist cover
      if (
        playlistToRemove.cover_path &&
        !usedCoverPaths.has(playlistToRemove.cover_path)
      ) {
        await remove_file(playlistToRemove.cover_path)
      }
    }

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
  },

  // Audio actions
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
    const {
      config,
      currentAudio,
      currentPlaylistId,
      isPlaying,
      playAudio,
      pauseAudio,
    } = get()
    if (!config) return

    // Check if deleting currently playing audio
    const isDeletingCurrent =
      currentPlaylistId === playlistId && currentAudio?.audio.id === audioId

    // Determine next audio if deleting current
    let nextAudioToPlay: LocalAudio | null = null
    if (isDeletingCurrent) {
      const playlist = config.playlists.find((p) => p.id === playlistId)
      if (playlist && playlist.audios.length > 1) {
        const currentIndex = playlist.audios.findIndex(
          (a) => a.audio.id === audioId,
        )
        // Default to next in sequence, or wrap to start
        const nextIndex = (currentIndex + 1) % playlist.audios.length
        // If it's the specific item we are deleting, ensure we get a DIFFERENT one if possible
        // But since we haven't deleted yet, playlist still has it.
        // If we only have 1 item, we can't play next.
        if (playlist.audios.length > 1) {
          nextAudioToPlay = playlist.audios[nextIndex]
          // If next is same as current (e.g. 1 item?), handled by length check
          if (
            nextAudioToPlay.audio.id === audioId &&
            playlist.audios.length > 1
          ) {
            // scan for another?
            nextAudioToPlay =
              playlist.audios.find((a) => a.audio.id !== audioId) || null
          }
        }
      }
    }

    let updatedPlaylists = config.playlists.map((playlist) => {
      // Remove audio from target playlist
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          audios: playlist.audios.filter((a) => a.audio.id !== audioId),
        }
      }
      // Also remove from FAVORITE if not deleting from FAVORITE
      if (
        playlistId !== FAVORITE_PLAYLIST_ID &&
        playlist.id === FAVORITE_PLAYLIST_ID
      ) {
        return {
          ...playlist,
          audios: playlist.audios.filter((a) => a.audio.id !== audioId),
        }
      }
      return playlist
    })

    // Remove empty playlists (except AUDIO_PLAYLIST)
    updatedPlaylists = updatedPlaylists.filter((playlist) => {
      if (playlist.id === AUDIO_PLAYLIST_ID) return true
      return playlist.audios.length > 0
    })

    // File Cleanup Logic for Audio Delete
    // Optimization: Deleting from FAVORITE is purely metadata removal.
    // The audio should presumably exist in the main library or other lists.
    // Even if it's an orphan, we skip file deletion to strictly follow "remove info only" for Favorites
    // and avoid O(N) scan.
    const shouldCheckCleanup = playlistId !== FAVORITE_PLAYLIST_ID

    const deletedAudio = shouldCheckCleanup
      ? config.playlists
          .find((p) => p.id === playlistId)
          ?.audios.find((a) => a.audio.id === audioId)
      : null

    if (deletedAudio) {
      // Check if path is used in UPDATED playlists
      const usedAudioPaths = new Set<string>()
      const usedCoverPaths = new Set<string>()

      for (const p of updatedPlaylists) {
        if (p.cover_path) usedCoverPaths.add(p.cover_path)
        for (const a of p.audios) {
          usedAudioPaths.add(a.path)
          if (a.cover_path) usedCoverPaths.add(a.cover_path)
        }
      }

      if (!usedAudioPaths.has(deletedAudio.path)) {
        await remove_file(deletedAudio.path)
      }

      if (
        deletedAudio.cover_path &&
        !usedCoverPaths.has(deletedAudio.cover_path)
      ) {
        await remove_file(deletedAudio.cover_path)
      }
    }

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)

    // Handle playback state changes AFTER saving config
    if (isDeletingCurrent) {
      if (nextAudioToPlay) {
        // Switch to next audio
        await playAudio(nextAudioToPlay, playlistId, false)
        // Restore pause state if was paused
        if (!isPlaying) {
          pauseAudio()
        }
      } else {
        // No more audio, stop playback
        pauseAudio()
        set({
          currentAudio: null,
          currentPlaylistId: null,
          audioUrl: null,
          isPlaying: false,
          duration: 0,
          currentTime: 0,
        })
        storage.setCurrentAudio(null)
        storage.setCurrentPlaylistId(null)
      }
    }
  },

  // Favorite actions
  toggleFavorite: async (audio: LocalAudio) => {
    const { config } = get()
    if (!config) return

    const favPlaylist = getOrCreateFavoritePlaylist(config)
    const index = favPlaylist.audios.findIndex(
      (a) => a.audio.id === audio.audio.id,
    )

    let updatedPlaylists: LocalPlaylist[]

    if (index >= 0) {
      // Remove from favorites
      const updatedAudios = favPlaylist.audios.filter(
        (a) => a.audio.id !== audio.audio.id,
      )

      if (updatedAudios.length === 0) {
        updatedPlaylists = config.playlists.filter(
          (p) => p.id !== FAVORITE_PLAYLIST_ID,
        )
      } else {
        updatedPlaylists = config.playlists.map((p) =>
          p.id === FAVORITE_PLAYLIST_ID ? { ...p, audios: updatedAudios } : p,
        )
      }
    } else {
      // Add to favorites
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

  setViewingPlaylistId: (id: string | null) => {
    set({ viewingPlaylistId: id })
  },

  setGistConfig: (config) => {
    storage.setGistConfig(config)
    set({ gistConfig: config })
  },

  syncGist: async (manual = false) => {
    const { config, gistConfig, isSyncing } = get()
    if (!gistConfig || (!manual && isSyncing)) return

    try {
      set({ isSyncing: true })
      const { updatedConfig, newGistConfig, changed } = await syncWithGist(
        config,
        gistConfig,
      )

      if (changed) {
        await save_config(updatedConfig)
        set({ config: updatedConfig })
      }
      get().setGistConfig(newGistConfig)
    } catch (error) {
      console.error("Sync failed:", error)
      if (manual) throw error
    } finally {
      set({ isSyncing: false })
    }
  },
})
