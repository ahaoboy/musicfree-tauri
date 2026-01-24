import { useState, useCallback, useRef } from "react"
import { Audio, LocalAudio, download_audio } from "../../api"

interface DownloadState {
  downloadingIds: Set<string>
  downloadedIds: Set<string>
  failedIds: Set<string>
  downloadingAll: boolean
}

interface DownloadResult {
  successCount: number
  skippedCount: number
  downloadedAudios: LocalAudio[]
  existingAudios: LocalAudio[]
}

/**
 * Hook for managing audio downloads
 */
export const useDownloadManager = () => {
  const [state, setState] = useState<DownloadState>({
    downloadingIds: new Set(),
    downloadedIds: new Set(),
    failedIds: new Set(),
    downloadingAll: false,
  })

  // Abort controllers for canceling downloads
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  /**
   * Download single audio
   */
  const downloadSingleAudio = useCallback(
    async (audio: Audio, signal?: AbortSignal): Promise<LocalAudio | null> => {
      try {
        if (signal?.aborted) return null

        const result = await download_audio(audio)

        if (signal?.aborted) return null

        return result
      } catch (error) {
        console.error(`Download failed for ${audio.title}:`, error)
        return null
      }
    },
    [],
  )

  /**
   * Start downloading an audio
   */
  const startDownload = useCallback(
    async (audio: Audio): Promise<LocalAudio | null> => {
      // Create abort controller
      const abortController = new AbortController()
      abortControllersRef.current.set(audio.id, abortController)

      // Update state
      setState((prev) => ({
        ...prev,
        downloadingIds: new Set([...prev.downloadingIds, audio.id]),
        failedIds: new Set([...prev.failedIds].filter((id) => id !== audio.id)),
      }))

      // Create abort promise
      const abortPromise = new Promise<never>((_, reject) => {
        abortController.signal.addEventListener("abort", () => {
          reject(new Error("ABORTED"))
        })
      })

      try {
        // Race between download and abort
        const localAudio = await Promise.race([
          downloadSingleAudio(audio, abortController.signal),
          abortPromise,
        ])

        if (localAudio) {
          setState((prev) => ({
            ...prev,
            downloadedIds: new Set([...prev.downloadedIds, audio.id]),
          }))
          return localAudio
        } else {
          setState((prev) => ({
            ...prev,
            failedIds: new Set([...prev.failedIds, audio.id]),
          }))
          return null
        }
      } catch (error) {
        if (error instanceof Error && error.message === "ABORTED") {
          setState((prev) => ({
            ...prev,
            failedIds: new Set([...prev.failedIds, audio.id]),
          }))
        } else {
          setState((prev) => ({
            ...prev,
            failedIds: new Set([...prev.failedIds, audio.id]),
          }))
        }
        return null
      } finally {
        abortControllersRef.current.delete(audio.id)
        setState((prev) => ({
          ...prev,
          downloadingIds: new Set(
            [...prev.downloadingIds].filter((id) => id !== audio.id),
          ),
        }))
      }
    },
    [downloadSingleAudio],
  )

  /**
   * Abort a download
   */
  const abortDownload = useCallback((audioId: string) => {
    const controller = abortControllersRef.current.get(audioId)
    if (controller) {
      controller.abort()
    }
  }, [])

  /**
   * Download multiple audios
   */
  const downloadMultiple = useCallback(
    async (
      audios: Audio[],
      existingAudios: LocalAudio[],
      retryMode: boolean = false,
    ): Promise<DownloadResult> => {
      setState((prev) => ({ ...prev, downloadingAll: true }))

      let successCount = 0
      let skippedCount = 0
      const downloadedAudios: LocalAudio[] = []

      for (const audio of audios) {
        // In retry mode, only download failed audios
        if (retryMode && !state.failedIds.has(audio.id)) {
          if (state.downloadedIds.has(audio.id)) {
            skippedCount++
          }
          continue
        }

        // Skip if already downloaded (not in retry mode)
        if (!retryMode && state.downloadedIds.has(audio.id)) {
          skippedCount++
          continue
        }

        const localAudio = await startDownload(audio)
        if (localAudio) {
          downloadedAudios.push(localAudio)
          successCount++
        }
      }

      setState((prev) => ({ ...prev, downloadingAll: false }))

      return {
        successCount,
        skippedCount,
        downloadedAudios,
        existingAudios,
      }
    },
    [state.failedIds, state.downloadedIds, startDownload],
  )

  /**
   * Mark audio as downloaded
   */
  const markAsDownloaded = useCallback((audioId: string) => {
    setState((prev) => ({
      ...prev,
      downloadedIds: new Set([...prev.downloadedIds, audioId]),
    }))
  }, [])

  /**
   * Clear download state
   */
  const clearDownloadState = useCallback(() => {
    // Abort all ongoing downloads
    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()

    setState({
      downloadingIds: new Set(),
      downloadedIds: new Set(),
      failedIds: new Set(),
      downloadingAll: false,
    })
  }, [])

  return {
    ...state,
    startDownload,
    abortDownload,
    downloadMultiple,
    markAsDownloaded,
    clearDownloadState,
  }
}
