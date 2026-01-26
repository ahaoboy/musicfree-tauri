import { create } from "zustand"
import {
  LocalAudio,
  LocalPlaylist,
  FAVORITE_PLAYLIST_ID,
  AUDIO_PLAYLIST_ID,
} from "../api"

// Import slices
import { createConfigSlice, ConfigSlice, applyTheme } from "./configSlice"
import { createPlaybackSlice, PlaybackSlice } from "./playbackSlice"
import { createSearchSlice, SearchSlice } from "./searchSlice"

// Re-export applyTheme for external use
export { applyTheme }

// ============================================
// Combined App State Type
// ============================================
export type AppState = ConfigSlice & PlaybackSlice & SearchSlice

// ============================================
// Create Store with Combined Slices
// ============================================
export const useAppStore = create<AppState>()((...a) => ({
  ...createConfigSlice(...a),
  ...createPlaybackSlice(...a),
  ...createSearchSlice(...a),
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
