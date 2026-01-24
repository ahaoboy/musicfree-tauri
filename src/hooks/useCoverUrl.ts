import { useState, useEffect } from "react"
import { exists_cover, download_cover, get_web_url } from "../api"

/**
 * Custom hook to load and cache cover URLs
 * Automatically handles local paths and remote URLs with download
 * Returns null on error (caller should use DEFAULT_COVER_URL as fallback)
 *
 * All parameters are optional for convenience
 *
 * @param coverPath - Local cover path (for downloaded audios/playlists)
 * @param coverUrl - Remote cover URL (for search results, will be downloaded)
 * @param platform - Platform name (required for downloading remote covers)
 * @returns Cover URL string or null
 */
export const useCoverUrl = (
  coverPath?: string | null,
  coverUrl?: string | null,
  platform?: string | null,
): string | null => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadCover = async () => {
      // No cover info provided
      if (!coverPath && !coverUrl) {
        setUrl(null)
        return
      }

      try {
        // Case 1: Local cover path exists (already downloaded)
        if (coverPath) {
          const webUrl = await get_web_url(coverPath)
          if (!cancelled) {
            setUrl(webUrl)
          }
          return
        }

        // Case 2: Remote cover URL with platform (can download)
        if (coverUrl && platform) {
          // Check if already exists locally
          const existingPath = await exists_cover(coverUrl, platform)

          if (existingPath) {
            // Already downloaded, just get web URL
            const webUrl = await get_web_url(existingPath)
            if (!cancelled) {
              setUrl(webUrl)
            }
          } else {
            // Download cover first
            const localPath = await download_cover(coverUrl, platform)
            if (!cancelled && localPath) {
              const webUrl = await get_web_url(localPath)
              setUrl(webUrl)
            } else if (!cancelled) {
              setUrl(null)
            }
          }
          return
        }

        // Case 3: Remote URL without platform (fallback, for backward compatibility)
        if (coverUrl && !platform) {
          if (!cancelled) {
            setUrl(coverUrl)
          }
          return
        }

        // No valid cover
        if (!cancelled) {
          setUrl(null)
        }
      } catch (error) {
        console.error("Failed to load cover:", error)
        if (!cancelled) {
          setUrl(null)
        }
      }
    }

    loadCover()

    return () => {
      cancelled = true
    }
  }, [coverPath, coverUrl, platform])

  return url
}
