import { invoke, convertFileSrc } from "@tauri-apps/api/core"
import { join } from "@tauri-apps/api/path"
import { platform } from "@tauri-apps/plugin-os"
import { getWavUrl, isAudio, isVideo } from "./audio"
import { appCache } from "../utils/cache"
export * from "./sync"

export const CurrentPlatform = platform()

export type Platform = `Bilibili` | `Youtube` | `File` | (string & {})
export const FAVORITE_PLAYLIST_ID = "__FAVORITE__"
export const FAVORITE_PLAYLIST_TITLE = "FAVORITE"
export const AUDIO_PLAYLIST_ID = "__AUDIO__"
export const AUDIO_PLAYLIST_TITLE = "AUDIOS"

export function is_builtin(id: string) {
  return id === FAVORITE_PLAYLIST_ID || id === AUDIO_PLAYLIST_ID
}

export type Audio = {
  id: string
  title: string
  download_url: string
  cover?: string
  platform: Platform
  duration?: number
}

export type LocalAudio = {
  audio: Audio
  path: string
  cover_path: string | null
}

export type Playlist = {
  id?: string
  download_url?: string
  title?: string
  cover?: string
  audios: Audio[]
  platform: Platform
}

export type LocalPlaylist = {
  id: string
  download_url?: string
  title?: string
  cover_path: string | null
  cover?: string
  audios: LocalAudio[]
  platform: Platform
}

// Playback Mode
export type PlayMode = "sequence" | "list-loop" | "single-loop" | "shuffle"

// Theme types
export type ThemeMode = "light" | "dark" | "auto"

export type Config = {
  playlists: LocalPlaylist[]
}

export type GistConfig = {
  repoUrl: string // GitHub repository URL (e.g., "https://github.com/owner/repo" or "owner/repo")
  githubToken: string
  syncInterval: number // in minutes
  lastSyncTime?: number
  lastRemoteSha?: string // SHA of the remote yjs file at last sync, used for change detection
}

export type FileInfo = {
  sha: string
  size: number
}

export type ImportResult = {
  config: Config
  filename: string
  paths: string[]
}

export function get_default_config(): Config {
  return {
    playlists: [],
  }
}

export function extract_audios(
  url: string,
): Promise<[playlist: Playlist, default_audio: number | null]> {
  return invoke("extract_audios", { url })
}

export function download_audio(audio: Audio): Promise<LocalAudio> {
  return invoke("download_audio", { audio })
}

export function app_dir(): Promise<string> {
  return invoke("app_dir")
}

export function read_file(path: string): Promise<Uint8Array> {
  return invoke("read_file", { path })
}

export function path_exists(path: string): Promise<boolean> {
  return invoke("path_exists", { path })
}

export function clear_all_data(): Promise<void> {
  return invoke("clear_all_data")
}

export function get_storage_size(): Promise<number> {
  return invoke("get_storage_size")
}

export function get_cache_size(): Promise<number> {
  return invoke("get_cache_size")
}

export function clear_cache(): Promise<void> {
  return invoke("clear_cache")
}

export function download_cover(
  url: string,
  platform: string,
): Promise<string | null> {
  return invoke("download_cover", { url, platform })
}

// Clean up blob URLs when they're no longer needed
export function revokeBlobUrl(path: string) {
  appCache.delete(path)
}

// Clear all cached blob URLs (useful for memory management)
export function clearBlobCache() {
  appCache.clear()
}

export async function get_convert_url(path: string): Promise<string> {
  const appDataDirPath: string = await invoke("app_dir")
  const localPath = await join(appDataDirPath, path)
  const assetUrl = convertFileSrc(localPath)
  return assetUrl
}

export function is_android() {
  return CurrentPlatform === "android"
}

async function get_web_blob(path: string): Promise<string> {
  // Check cache first
  const cached = appCache.get(path)
  if (cached) {
    return cached
  }

  const bin = await read_file(path)
  const blob = new Blob([new Uint8Array(bin)])
  const assetUrl = URL.createObjectURL(blob)

  // Cache the blob URL
  appCache.set(path, assetUrl)

  return assetUrl
}

async function get_musicfree_url(path: string): Promise<string> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path
  const isMedia = isAudio(path) || isVideo(path)

  // Check cache first for media resources
  if (isMedia) {
    const cached = appCache.get(cleanPath)
    if (cached) {
      return cached
    }
  }

  let assetUrl: string = `http://musicfree.localhost/${cleanPath}`
  if (CurrentPlatform === "windows") {
  } else if (CurrentPlatform === "android") {
    // FIXME: Converting video to audio takes a long time.
    if (isVideo(path)) {
      assetUrl = await getWavUrl(assetUrl)
    } else if (isAudio(path)) {
      assetUrl = await get_web_blob(cleanPath)
    } else {
      // Image uses file url
    }
  } else {
    // macOS, iOS, Linux
    assetUrl = `musicfree://localhost/${cleanPath}`
  }

  // Cache the result only for media resources
  if (isMedia) {
    appCache.set(cleanPath, assetUrl)
  }
  return assetUrl
}

export function get_web_url(path: string): Promise<string> {
  return is_android() ? get_musicfree_url(path) : get_convert_url(path)
}

export const DEFAULT_COVER_URL = "/icon.png"

export function get_config(): Promise<Config> {
  return invoke("get_config")
}

export function save_config(config: Config) {
  return invoke("save_config", { config })
}

export function is_favorite_audio(audio: LocalAudio, config: Config): boolean {
  const fav = config.playlists.find((p) => p.id === FAVORITE_PLAYLIST_ID)
  if (!fav) {
    return false
  }
  return fav.audios.some((a) => a.audio.id === audio.audio.id)
}

// Helper to get system theme
export const get_system_theme = (): "light" | "dark" => {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return "light"
}

export function app_version(): Promise<string> {
  return invoke("app_version")
}

export function exists_audio(audio: Audio): Promise<string | null> {
  return invoke("exists_audio", { audio })
}
export function exists_cover(
  url: string,
  platform: Platform,
): Promise<string | null> {
  return invoke("exists_cover", { url, platform })
}

export function export_data(): Promise<string> {
  return invoke("export_data")
}

export function import_data(): Promise<ImportResult> {
  return invoke("import_data")
}

export function remove_file(path: string): Promise<void> {
  return invoke("remove_file", { path })
}

export function sync_download(
  token: string,
  repo: string,
  path?: string,
): Promise<Uint8Array> {
  return invoke<number[]>("sync_download", { token, repo, path }).then(
    (data) => new Uint8Array(data),
  )
}

export function sync_update(
  token: string,
  repo: string,
  content: Uint8Array,
  path?: string,
  message?: string,
): Promise<void> {
  return invoke("sync_update", { token, repo, content, path, message })
}

export function sync_file_info(
  token: string,
  repo: string,
  path?: string,
): Promise<FileInfo | null> {
  return invoke("sync_file_info", { token, repo, path })
}

export function get_local_yjs(): Promise<Uint8Array> {
  return invoke<number[]>("get_local_yjs").then((data) => new Uint8Array(data))
}

export function save_local_yjs(content: Uint8Array): Promise<void> {
  return invoke("save_local_yjs", { content })
}

// Export Yjs sync functions
export { syncWithYjs, persistLocalYjsState, SyncOfflineError } from "./sync"

// ============================================
// LocalStorage Keys
// ============================================
const STORAGE_KEYS = {
  CURRENT_AUDIO: "musicfree_current_audio",
  CURRENT_PLAYLIST_ID: "musicfree_current_playlist_id",
  PLAY_MODE: "musicfree_play_mode",
  THEME: "musicfree_theme",
  GIST_CONFIG: "musicfree_repo_sync_config",
} as const

// ============================================
// LocalStorage Helpers
// ============================================
export const storage = {
  setCurrentAudio: (audio: LocalAudio | null) => {
    if (audio) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_AUDIO, JSON.stringify(audio))
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_AUDIO)
    }
  },
  getCurrentAudio: (): LocalAudio | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_AUDIO)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },
  setCurrentPlaylistId: (id: string | null) => {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID, id)
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID)
    }
  },
  getCurrentPlaylistId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID)
  },
  setPlayMode: (mode: PlayMode) => {
    localStorage.setItem(STORAGE_KEYS.PLAY_MODE, mode)
  },
  getPlayMode: (): PlayMode => {
    return (
      (localStorage.getItem(STORAGE_KEYS.PLAY_MODE) as PlayMode) || "sequence"
    )
  },
  setTheme: (theme: ThemeMode) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
  },
  getTheme: (): ThemeMode => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || "auto"
  },
  setGistConfig: (config: GistConfig | null) => {
    if (config) {
      localStorage.setItem(STORAGE_KEYS.GIST_CONFIG, JSON.stringify(config))
    } else {
      localStorage.removeItem(STORAGE_KEYS.GIST_CONFIG)
    }
  },
  getGistConfig: (): GistConfig | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GIST_CONFIG)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },
}

// Log API
export function write_log(
  level: string,
  module: string,
  message: string,
): Promise<void> {
  return invoke("write_log", { level, module, message })
}

export function get_log_path(): Promise<string> {
  return invoke("get_log_path")
}

export function clear_log(): Promise<void> {
  return invoke("clear_log")
}

export function get_log_size(): Promise<number> {
  return invoke("get_log_size")
}

export function read_log(): Promise<string> {
  return invoke("read_log")
}
