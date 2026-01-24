import { useState, useCallback } from "react"
import {
  Audio,
  Playlist,
  extract_audios,
  exists_audio,
  exists_cover,
  download_cover,
  get_web_url,
  LocalAudio,
} from "../../api"

interface SearchState {
  playlist: Playlist | null
  searching: boolean
  playlistCoverUrl: string | null
}

/**
 * Hook for managing audio search functionality
 */
export const useSearchAudio = () => {
  const [state, setState] = useState<SearchState>({
    playlist: null,
    searching: false,
    playlistCoverUrl: null,
  })

  /**
   * Download cover and return web URL
   */
  const downloadCoverUrl = useCallback(
    async (
      coverUrl: string | undefined,
      platform: string,
    ): Promise<string | null> => {
      if (!coverUrl) return null

      try {
        const localPath = await download_cover(coverUrl, platform)
        if (!localPath) return null
        return await get_web_url(localPath)
      } catch (error) {
        console.error("Failed to download cover:", error)
        return null
      }
    },
    [],
  )

  /**
   * Check if audio already exists locally
   */
  const checkExistingAudio = useCallback(
    async (audio: Audio): Promise<LocalAudio | null> => {
      const audioPath = await exists_audio(audio)
      if (!audioPath) return null

      let coverPath: string | null = null
      if (audio.cover) {
        coverPath = await exists_cover(audio.cover, audio.platform)
      }

      return {
        audio,
        path: audioPath,
        cover_path: coverPath,
      }
    },
    [],
  )

  /**
   * Download playlist cover in background
   */
  const downloadPlaylistCover = useCallback(
    async (playlist: Playlist) => {
      // Download playlist cover
      if (playlist.cover) {
        const webUrl = await downloadCoverUrl(playlist.cover, playlist.platform)
        if (webUrl) {
          setState((prev) => ({ ...prev, playlistCoverUrl: webUrl }))
        }
      } else {
        // Use first audio's cover as fallback
        const firstAudioWithCover = playlist.audios.find((audio) => audio.cover)
        if (firstAudioWithCover?.cover) {
          const webUrl = await downloadCoverUrl(
            firstAudioWithCover.cover,
            firstAudioWithCover.platform,
          )
          if (webUrl) {
            setState((prev) => ({ ...prev, playlistCoverUrl: webUrl }))
          }
        }
      }
    },
    [downloadCoverUrl],
  )

  /**
   * Search for audios from URL
   */
  const searchAudios = useCallback(
    async (
      url: string,
    ): Promise<{
      playlist: Playlist
      defaultAudioIndex: number | null
      existingAudios: LocalAudio[]
    } | null> => {
      if (!url.trim()) return null

      setState((prev) => ({ ...prev, searching: true }))

      try {
        const [playlist, defaultAudioIndex] = await extract_audios(url)

        // Check existing audios
        const existingAudios: LocalAudio[] = []
        for (const audio of playlist.audios) {
          const existing = await checkExistingAudio(audio)
          if (existing) {
            existingAudios.push(existing)
          }
        }

        setState((prev) => ({ ...prev, playlist, searching: false }))

        // Download playlist cover in background
        downloadPlaylistCover(playlist)

        return { playlist, defaultAudioIndex, existingAudios }
      } catch (error) {
        console.error("Search failed:", error)
        setState((prev) => ({ ...prev, searching: false }))
        return null
      }
    },
    [checkExistingAudio, downloadPlaylistCover],
  )

  /**
   * Clear search state
   */
  const clearSearch = useCallback(() => {
    setState({
      playlist: null,
      searching: false,
      playlistCoverUrl: null,
    })
  }, [])

  return {
    ...state,
    searchAudios,
    clearSearch,
  }
}
