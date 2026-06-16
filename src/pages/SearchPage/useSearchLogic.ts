import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  LocalPlaylist,
  LocalAudio,
  Audio,
  Playlist,
  AUDIO_PLAYLIST_ID,
  download_cover,
} from "../../api"
import { useAppStore } from "../../store"
import { useShallow } from "zustand/react/shallow"
import logger from "../../utils/logger"

const log = logger.search

/**
 * Hook that encapsulates the download-and-add-to-config logic
 * extracted from SearchPage to reduce component size.
 */
export function useSearchLogic() {
  const navigate = useNavigate()

  const {
    playlist,
    selectedIds,
    failedIds,
    skippedIds,
    downloadedIds,
    downloadedAudios,
    configPlaylists,
    startDownload,
    downloadMultiple,
    addAudiosToConfig,
    addPlaylistToConfig,
    clearSelection,
  } = useAppStore(
    useShallow((state) => ({
      playlist: state.searchPlaylist,
      selectedIds: state.searchSelectedIds,
      failedIds: state.searchFailedIds,
      skippedIds: state.searchSkippedIds,
      downloadedIds: state.searchDownloadedIds,
      downloadedAudios: state.searchDownloadedAudios,
      configPlaylists: state.config.playlists,
      startDownload: state.startDownload,
      downloadMultiple: state.downloadMultiple,
      addAudiosToConfig: state.addAudiosToConfig,
      addPlaylistToConfig: state.addPlaylistToConfig,
      clearSelection: state.clearSearchSelection,
    })),
  )

  const configAudios = configPlaylists.find((p) => p.id === AUDIO_PLAYLIST_ID)?.audios || []

  const processDownloadResult = useCallback(
    async (
      result: { downloadedAudios: LocalAudio[]; existingAudios: LocalAudio[] },
      currentPlaylist: Playlist,
      isAddMode: boolean,
    ) => {
      log.info("Processing download result...")
      log.info(
        `Downloaded: ${result.downloadedAudios.length}, Existing: ${result.existingAudios.length}`,
      )

      const allAudios = [...result.downloadedAudios, ...result.existingAudios]
      const isPlaylist = currentPlaylist.audios.length > 1

      log.info(`Is playlist: ${isPlaylist}, Total audios: ${allAudios.length}`)

      if (isPlaylist && allAudios.length > 0) {
        log.info("Processing as playlist...")
        let coverPath: string | null = null
        if (currentPlaylist.cover) {
          try {
            coverPath = await download_cover(currentPlaylist.cover, currentPlaylist.platform)
          } catch (e) {
            log.error("Failed to download playlist cover:", e)
          }
        } else {
          const first = result.downloadedAudios[0] || result.existingAudios[0]
          if (first?.audio.cover) {
            try {
              coverPath = await download_cover(first.audio.cover, first.audio.platform)
            } catch (e) {
              log.error("download_cover failed", e)
            }
          }
        }

        const audioMap = new Map(allAudios.map((a) => [a.audio.id, a]))
        const finalAudios = currentPlaylist.audios
          .map((a: Audio) => audioMap.get(a.id))
          .filter(Boolean) as LocalAudio[]

        const localPlaylist: LocalPlaylist = {
          id: currentPlaylist.id || currentPlaylist.title || new Date().toISOString(),
          title: currentPlaylist.title,
          cover_path: coverPath,
          cover: currentPlaylist.cover,
          audios: finalAudios,
          platform: currentPlaylist.platform,
          download_url: currentPlaylist.download_url,
        }

        log.info(`Adding playlist to config: ${localPlaylist.title}`)
        await addPlaylistToConfig(localPlaylist)
        clearSelection()
        navigate(`/playlists?highlight=${encodeURIComponent(localPlaylist.id!)}`)
      } else if (!isPlaylist && allAudios.length > 0) {
        log.info("Processing as single audio...")

        if (isAddMode && result.existingAudios.length > 0) {
          log.info("Add mode: checking if audios need to be added to config...")
          const audiosToAdd: LocalAudio[] = []

          for (const audio of result.existingAudios) {
            const inConfig = configAudios.some((a) => a.audio.id === audio.audio.id)
            if (!inConfig) {
              log.info(`Audio not in config, will add: ${audio.audio.title}`)
              audiosToAdd.push(audio)
            } else {
              log.info(`Audio already in config: ${audio.audio.title}`)
            }
          }

          if (audiosToAdd.length > 0) {
            log.info(`Adding ${audiosToAdd.length} audios to config`)
            await addAudiosToConfig(audiosToAdd)
          }
        } else if (result.downloadedAudios.length > 0) {
          log.info(`Adding ${result.downloadedAudios.length} downloaded audios to config`)
          await addAudiosToConfig(result.downloadedAudios)
        }

        clearSelection()
        navigate(`/music?highlight=${encodeURIComponent(allAudios[0].audio.id)}`)
      }

      log.info("Process complete")
    },
    [configAudios, addAudiosToConfig, addPlaylistToConfig, clearSelection, navigate],
  )

  const handleDownloadSingle = useCallback(
    async (audioId: string) => {
      if (!playlist) return
      const audio = playlist.audios.find((a) => a.id === audioId)
      if (!audio) return

      const localAudio = await startDownload(audio)
      if (localAudio) {
        await addAudiosToConfig([localAudio])
      }
    },
    [playlist, startDownload, addAudiosToConfig],
  )

  const handleDownloadAll = useCallback(async () => {
    if (!playlist || selectedIds.size === 0) return

    log.info("Starting download/add process...")
    log.info(`Selected IDs: ${selectedIds.size}`)

    const selectedAudios = playlist.audios.filter((a) => selectedIds.has(a.id))

    const selectedFailedIds = Array.from(selectedIds).filter((id) => failedIds.has(id))
    const selectedSkippedIds = Array.from(selectedIds).filter((id) => skippedIds.has(id))
    const selectedPendingIds = Array.from(selectedIds).filter(
      (id) => !downloadedIds.has(id) && !failedIds.has(id) && !skippedIds.has(id),
    )

    const isRetryMode =
      (selectedFailedIds.length > 0 || selectedSkippedIds.length > 0) &&
      selectedPendingIds.length === 0
    const isAddMode =
      selectedPendingIds.length === 0 &&
      selectedFailedIds.length === 0 &&
      selectedSkippedIds.length === 0

    log.info(`Mode: ${isRetryMode ? "Retry" : isAddMode ? "Add" : "Download"}`)
    log.info(
      `Pending: ${selectedPendingIds.length}, Failed: ${selectedFailedIds.length}, Skipped: ${selectedSkippedIds.length}`,
    )

    const existingAudios: LocalAudio[] = []
    if (isAddMode) {
      log.info("Add mode: collecting existing audios...")
      for (const id of selectedIds) {
        if (downloadedAudios.has(id)) {
          const audio = downloadedAudios.get(id)!
          existingAudios.push(audio)
          log.info(`Found in downloadedAudios: ${audio.audio.title}`)
        } else {
          const cfg = configAudios.find((a) => a.audio.id === id)
          if (cfg) {
            existingAudios.push(cfg)
            log.info(`Found in config: ${cfg.audio.title}`)
          }
        }
      }
      log.info(`Total existing audios: ${existingAudios.length}`)
    }

    const knownExisting = configAudios.filter((a) => selectedIds.has(a.audio.id))

    if (isAddMode) {
      const result = {
        downloadedAudios: [] as LocalAudio[],
        existingAudios,
      }
      await processDownloadResult(result, playlist, isAddMode)
    } else {
      const result = await downloadMultiple(selectedAudios, knownExisting, isRetryMode)

      if (result.failedCount === 0) {
        await processDownloadResult(result, playlist, isAddMode)
      }
    }
  }, [
    playlist,
    selectedIds,
    failedIds,
    skippedIds,
    downloadedIds,
    downloadedAudios,
    configAudios,
    downloadMultiple,
    processDownloadResult,
  ])

  return {
    processDownloadResult,
    handleDownloadSingle,
    handleDownloadAll,
    configAudios,
  }
}
