import { StateCreator } from "zustand"
import type { AppState } from "./index"
import { LocalAudio, PlayMode, get_web_url, storage } from "../api"
import { initBluetoothListener } from "../utils/bluetooth"
import {
  initMediaSession,
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
} from "../utils/mediaSession"

// Helper to create and configure Audio element
const getAudio = (): HTMLAudioElement => {
  const audio = new Audio()
  audio.preload = "auto"
  // Allow cross-origin playback if needed for some resources
  // audio.crossOrigin = "anonymous"
  return audio
}

const MAX_HISTORY_SIZE = 64

// ============================================
// Playback Slice State Interface
// ============================================
export interface PlaybackSliceState {
  // Current playback state
  currentAudio: LocalAudio | null
  currentPlaylistId: string | null
  audioUrl: string | null
  isPlaying: boolean
  playbackRate: number
  currentPlayMode: PlayMode | null
  playbackHistory: LocalAudio[]
  duration: number
  currentTime: number
  canSeek: boolean

  // Audio element reference
  audioElement: HTMLAudioElement
  listenersInitialized: boolean

  // Device listeners
  deviceListenersInitialized: boolean
  connectedDevices: MediaDeviceInfo[]
}

// ============================================
// Playback Slice Actions Interface
// ============================================
export interface PlaybackSliceActions {
  // Playback actions
  playAudio: (
    audio: LocalAudio,
    playlistId: string,
    addToHistory?: boolean,
    autoPlay?: boolean,
  ) => Promise<void>
  loadAudioMetadata: (audio: LocalAudio) => Promise<void>
  pauseAudio: () => void
  resumeAudio: () => void
  togglePlay: () => void
  playNext: (force?: boolean) => Promise<void>
  playPrev: (force?: boolean) => Promise<void>
  switchToNextAudio: () => LocalAudio | null
  switchToPrevAudio: () => LocalAudio | null
  canPlayPrev: () => boolean

  togglePlayMode: () => void
  setupAudioListeners: () => void
  initDeviceListeners: () => Promise<void>
  seekTo: (time: number) => void

  // Helper to get next audio in playlist
  getNextAudio: () => LocalAudio | null
}

export type PlaybackSlice = PlaybackSliceState & PlaybackSliceActions

// ============================================
// Create Playback Slice
// ============================================
export const createPlaybackSlice: StateCreator<
  AppState,
  [],
  [],
  PlaybackSlice
> = (set, get) => ({
  // Initial state
  currentAudio: null,
  currentPlaylistId: null,
  audioUrl: null,
  isPlaying: false,
  playbackRate: 1,
  currentPlayMode: null, // Updated initial state
  playbackHistory: [],
  duration: 0,
  currentTime: 0,
  canSeek: false,
  audioElement: getAudio(),
  listenersInitialized: false,
  deviceListenersInitialized: false,
  connectedDevices: [],

  // Setup audio event listeners
  setupAudioListeners: () => {
    const { audioElement } = get()

    // Helper to check seekability
    const checkSeekable = () => {
      // HAVE_METADATA (1) or higher means we have duration and can seek
      const isSeekable =
        audioElement.readyState >= 1 &&
        Number.isFinite(audioElement.duration) &&
        audioElement.duration > 0
      set({ canSeek: isSeekable })
    }

    // Time update
    audioElement.addEventListener("timeupdate", () => {
      const { currentTime, duration } = audioElement
      set({
        currentTime,
        duration: duration || 0,
      })

      updateMediaSessionPositionState({
        duration: duration,
        playbackRate: audioElement.playbackRate,
        position: currentTime,
      })
    })

    // Load start - reset state
    audioElement.addEventListener("loadstart", () => {
      set({ canSeek: false, duration: 0 })
    })

    // Metadata loaded - ready to seek
    audioElement.addEventListener("loadedmetadata", () => {
      set({
        duration: audioElement.duration || 0,
      })
      checkSeekable()
    })

    // Can play - definitely seekable
    audioElement.addEventListener("canplay", checkSeekable)

    // Can play through - optimal state
    audioElement.addEventListener("canplaythrough", checkSeekable)

    // Audio ended - auto play next
    audioElement.addEventListener("ended", () => {
      get().playNext()
    })

    // Error handling
    audioElement.addEventListener("error", (e) => {
      console.error("Audio playback error:", e)
      set({ isPlaying: false, canSeek: false })
    })

    audioElement.addEventListener("pause", () => {
      if (get().isPlaying) {
        set({ isPlaying: false })
      }
      updateMediaSessionPlaybackState("paused")
    })

    audioElement.addEventListener("play", () => {
      if (!get().isPlaying) {
        set({ isPlaying: true })
      }
      updateMediaSessionPlaybackState("playing")
    })

    // Setup Media Session action handlers
    initMediaSession({
      onPlay: () => get().resumeAudio(),
      onPause: () => get().pauseAudio(),
      onPreviousTrack: () => get().playPrev(true),
      onNextTrack: () => get().playNext(true),
      onSeekTo: (time) => get().seekTo(time),
      onSeekBackward: (offset) => {
        const skipTime = offset || 10
        get().seekTo(Math.max(audioElement.currentTime - skipTime, 0))
      },
      onSeekForward: (offset) => {
        const skipTime = offset || 10
        get().seekTo(
          Math.min(
            audioElement.currentTime + skipTime,
            audioElement.duration || Infinity,
          ),
        )
      },
    })

    // Initial check in case listeners are attached after load
    checkSeekable()
  },

  initDeviceListeners: async () => {
    const { deviceListenersInitialized } = get()
    if (deviceListenersInitialized) return

    await initBluetoothListener({
      onDevicesChange: (devices) =>
        set({ connectedDevices: devices, deviceListenersInitialized: true }),
      onBluetoothDisconnect: () => get().pauseAudio(),
      getIsPlaying: () => get().isPlaying,
      getConnectedDevices: () => get().connectedDevices,
    })

    set({ deviceListenersInitialized: true })
  },

  playAudio: async (
    audio: LocalAudio,
    playlistId: string,
    addToHistory: boolean = true,
    autoPlay: boolean = true,
  ) => {
    const {
      currentAudio,
      audioElement,
      playbackHistory,
      deviceListenersInitialized,
    } = get()

    // Initialize device listeners on first play
    if (!deviceListenersInitialized) {
      get().initDeviceListeners()
    }

    // Add current audio to history if different
    if (
      addToHistory &&
      currentAudio &&
      currentAudio.audio.id !== audio.audio.id
    ) {
      const newHistory = [...playbackHistory, currentAudio]
      // Limit history
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
        canSeek: false,
      })

      // Update Media Session Metadata
      let artworkUrl = audio.audio.cover
      if (audio.cover_path) {
        try {
          artworkUrl = await get_web_url(audio.cover_path)
        } catch (e) {
          console.error("Failed to get artwork URL:", e)
        }
      }

      const { config } = get()
      const playlist = config.playlists.find((p) => p.id === playlistId)
      const albumTitle = playlist?.title || "musicfree"

      // Update document title to help Windows identify the app in media controls
      document.title = `${audio.audio.title} - musicfree`

      updateMediaSessionMetadata({
        title: audio.audio.title,
        artist: audio.audio.platform,
        album: albumTitle,
        artworkUrl: artworkUrl,
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

          // Now play if autoPlay is true
          if (autoPlay) {
            await audioElement.play()
            set({ isPlaying: true })
          } else {
            set({ isPlaying: false })
          }
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

  resumeAudio: async () => {
    const { audioElement } = get()
    try {
      await audioElement.play()
      set({ isPlaying: true })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Resume interrupted")
      } else {
        console.error("Failed to resume audio:", error)
      }
    }
  },

  togglePlay: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      get().pauseAudio()
    } else {
      get().resumeAudio()
    }
  },

  getNextAudio: () => {
    const { currentAudio, currentPlayMode, config, currentPlaylistId } = get()
    if (!currentAudio || !currentPlaylistId) return null

    const mode: PlayMode = currentPlayMode || storage.getPlayMode()

    // Get current playlist
    const playlist = config.playlists.find((p) => p.id === currentPlaylistId)
    if (!playlist || playlist.audios.length === 0) return null

    const currentIndex = playlist.audios.findIndex(
      (a) => a.audio.id === currentAudio.audio.id,
    )

    let nextAudio: LocalAudio | null = null

    switch (mode) {
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

    return nextAudio
  },

  switchToNextAudio: () => {
    return get().getNextAudio()
  },

  switchToPrevAudio: () => {
    const { playbackHistory } = get()
    if (playbackHistory.length === 0) return null

    const prevAudio = playbackHistory[playbackHistory.length - 1]
    const newHistory = playbackHistory.slice(0, -1)

    set({ playbackHistory: newHistory })
    return prevAudio
  },

  playNext: async (force: boolean = false) => {
    const { currentPlaylistId, switchToNextAudio, isPlaying } = get()
    const nextAudio = switchToNextAudio()

    if (nextAudio && currentPlaylistId) {
      await get().playAudio(
        nextAudio,
        currentPlaylistId,
        true,
        force || isPlaying,
      )
    }
  },

  playPrev: async (force: boolean = false) => {
    const { currentPlaylistId, switchToPrevAudio, isPlaying } = get()
    const prevAudio = switchToPrevAudio()

    if (prevAudio && currentPlaylistId) {
      await get().playAudio(
        prevAudio,
        currentPlaylistId,
        false,
        force || isPlaying,
      )
    }
  },

  canPlayPrev: () => {
    return get().playbackHistory.length > 0
  },

  togglePlayMode: () => {
    const { currentPlayMode } = get()
    const modes: PlayMode[] = [
      "sequence",
      "list-loop",
      "single-loop",
      "shuffle",
    ]
    const currentMode = currentPlayMode || storage.getPlayMode()
    const currentIndex = modes.indexOf(currentMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    set({ currentPlayMode: nextMode })
    storage.setPlayMode(nextMode)
  },

  seekTo: (time: number) => {
    const { audioElement } = get()
    if (audioElement && Number.isFinite(time)) {
      audioElement.currentTime = time
      set({ currentTime: time })
    }
  },
})
