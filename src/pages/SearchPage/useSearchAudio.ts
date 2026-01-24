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
  coverUrls: Record<string, string>
  playlistCoverUrl: string | null
}

/**
 * Hook for managing audio search functionality
 */
export const useSearchAudio = () => {
  const [state, setState] = useState<SearchState>({
    playlist: null,
    searching: false,
    coverUrls: {},
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
   * Download covers for playlist and audios in background
   */
  const downloadCovers = useCallback(
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

      // Download audio covers
      for (const audio of playlist.audios) {
        if (audio.cover) {
          const webUrl = await downloadCoverUrl(audio.cover, audio.platform)
          if (webUrl) {
            setState((prev) => ({
              ...prev,
              coverUrls: { ...prev.coverUrls, [audio.id]: webUrl },
            }))
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

            // Cache existing cover URL
            if (existing.cover_path) {
              const webUrl = await get_web_url(existing.cover_path)
              setState((prev) => ({
                ...prev,
                coverUrls: { ...prev.coverUrls, [audio.id]: webUrl },
              }))
            }
          }
        }

        setState((prev) => ({ ...prev, playlist, searching: false }))

        // Download covers in background
        downloadCovers(playlist)

        return { playlist, defaultAudioIndex, existingAudios }
      } catch (error) {
        console.error("Search failed:", error)
        setState((prev) => ({ ...prev, searching: false }))
        return null
      }
    },
    [checkExistingAudio, downloadCovers],
  )

  /**
   * Clear search state
   */
  const clearSearch = useCallback(() => {
    setState({
      playlist: null,
      searching: false,
      coverUrls: {},
      playlistCoverUrl: null,
    })
  }, [])

  return {
    ...state,
    searchAudios,
    clearSearch,
    downloadCoverUrl,
  }
}
