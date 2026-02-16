/**
 * Utility to manage Media Session API integration.
 * This allows the application to respond to system media controls and display rich metadata.
 */

export interface MediaSessionOptions {
  onPlay: () => void
  onPause: () => void
  onPreviousTrack: () => void
  onNextTrack: () => void
  onSeekTo: (time: number) => void
  onSeekBackward: (offset?: number) => void
  onSeekForward: (offset?: number) => void
}

/**
 * Initializes the Media Session action handlers.
 */
export const initMediaSession = (options: MediaSessionOptions) => {
  if (!("mediaSession" in navigator)) return

  const {
    onPlay,
    onPause,
    onPreviousTrack,
    onNextTrack,
    onSeekTo,
    onSeekBackward,
    onSeekForward,
  } = options

  navigator.mediaSession.setActionHandler("play", onPlay)
  navigator.mediaSession.setActionHandler("pause", onPause)
  navigator.mediaSession.setActionHandler("previoustrack", onPreviousTrack)
  navigator.mediaSession.setActionHandler("nexttrack", onNextTrack)

  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime !== undefined) {
      onSeekTo(details.seekTime)
    }
  })

  navigator.mediaSession.setActionHandler("seekbackward", (details) => {
    onSeekBackward(details.seekOffset)
  })

  navigator.mediaSession.setActionHandler("seekforward", (details) => {
    onSeekForward(details.seekOffset)
  })
}

/**
 * Updates the media metadata displayed by the OS.
 */
export const updateMediaSessionMetadata = (metadata: {
  title: string
  artist: string
  album: string
  artworkUrl?: string
}) => {
  if (!("mediaSession" in navigator)) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    artwork: metadata.artworkUrl
      ? [
          {
            src: metadata.artworkUrl,
            sizes: "512x512",
            type: "image/png",
          },
        ]
      : [],
  })
}

/**
 * Updates the playback state (playing/paused) in the Media Session.
 */
export const updateMediaSessionPlaybackState = (
  state: "playing" | "paused",
) => {
  if (!("mediaSession" in navigator)) return
  navigator.mediaSession.playbackState = state
}

/**
 * Updates the position state (duration, position, playbackRate) in the Media Session.
 */
export const updateMediaSessionPositionState = (state: {
  duration: number
  playbackRate: number
  position: number
}) => {
  if (
    !("mediaSession" in navigator) ||
    !("setPositionState" in navigator.mediaSession)
  )
    return

  try {
    // Media Session requires positive finite numbers for duration and position
    if (
      Number.isFinite(state.duration) &&
      state.duration > 0 &&
      Number.isFinite(state.position)
    ) {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        playbackRate: state.playbackRate,
        position: state.position,
      })
    }
  } catch (e) {
    console.warn("Failed to set Media Session position state:", e)
  }
}
