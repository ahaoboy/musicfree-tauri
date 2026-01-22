import { useState, useEffect } from "react"
import { get_web_url } from "../api"

/**
 * Custom hook to load and cache cover URLs
 * Optimizes cover loading by caching results
 */
export const useCoverUrl = (
  coverPath: string | null | undefined,
  fallbackCover?: string,
): string | null => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadCover = async () => {
      if (coverPath) {
        try {
          const url = await get_web_url(coverPath)
          if (!cancelled) {
            setCoverUrl(url)
          }
        } catch (error) {
          console.error("Failed to load cover:", error)
          if (!cancelled && fallbackCover) {
            setCoverUrl(fallbackCover)
          }
        }
      } else if (fallbackCover) {
        setCoverUrl(fallbackCover)
      } else {
        setCoverUrl(null)
      }
    }

    loadCover()

    return () => {
      cancelled = true
    }
  }, [coverPath, fallbackCover])

  return coverUrl
}
