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
} from "../api"

// ============================================
// Config Slice State Interface
// ============================================
export interface ConfigSliceState {
  // Persistent data
  config: Config

  // Loading states
  isConfigLoading: boolean

  // Theme
  theme: ThemeMode

  // App info
  app_dir: string | null
  app_version: string | null
}

// ============================================
// Config Slice Actions Interface
// ============================================
export interface ConfigSliceActions {
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
  isConfigLoading: false,
  theme: storage.getTheme(),
  app_dir: null,
  app_version: null,

  // Config actions
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
    set({ theme: mode })
    storage.setTheme(mode)
    applyTheme(mode)
  },

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
    const { config } = get()
    if (!config) return

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

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    }

    await get().saveConfig(updatedConfig)
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
})
