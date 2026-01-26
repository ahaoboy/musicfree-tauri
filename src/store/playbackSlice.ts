import { StateCreator } from "zustand"
import type { AppState } from "./index"
import { LocalAudio, PlayMode, get_web_url, storage } from "../api"

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
  playMode: PlayMode
  playbackHistory: LocalAudio[]
  duration: number
  currentTime: number

  // Audio element reference
  audioElement: HTMLAudioElement
  listenersInitialized: boolean
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
  currentAudio: storage.getCurrentAudio(),
  currentPlaylistId: storage.getCurrentPlaylistId(),
  audioUrl: null,
  isPlaying: false,
  playbackRate: 1,
  playMode: storage.getPlayMode(),
  playbackHistory: [],
  duration: 0,
  currentTime: 0,
  audioElement: new Audio(),
  listenersInitialized: false,

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

  getNextAudio: () => {
    const { currentAudio, playMode, config, currentPlaylistId } = get()
    if (!currentAudio || !currentPlaylistId) return null

    // Get current playlist
    const playlist = config.playlists.find((p) => p.id === currentPlaylistId)
    if (!playlist || playlist.audios.length === 0) return null

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

    return nextAudio
  },

  playNext: async () => {
    const { currentPlaylistId, getNextAudio } = get()
    const nextAudio = getNextAudio()

    if (nextAudio && currentPlaylistId) {
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
})
