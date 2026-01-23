import DownloadOutlined from "@ant-design/icons/DownloadOutlined"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import ReloadOutlined from "@ant-design/icons/ReloadOutlined"
import PlusOutlined from "@ant-design/icons/PlusOutlined"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import StopOutlined from "@ant-design/icons/StopOutlined"
import { Button, Checkbox, Input, Flex, Typography, Avatar, Spin } from "antd"
import { FC, useEffect, useCallback, useMemo, memo } from "react"
import {
  Audio,
  DEFAULT_COVER_URL,
  download_audio,
  download_cover,
  exists_audio,
  exists_cover,
  extract_audios,
  get_web_url,
  LocalAudio,
  LocalPlaylist,
  AUDIO_PLAYLIST_ID,
} from "../../api"
import { useAppStore } from "../../store"
import "./index.less"

const { Search } = Input
const { Text } = Typography

// ============================================
// Types
// ============================================

interface AudioItemProps {
  audio: Audio
  coverUrl: string | null
  selected: boolean
  downloading: boolean
  downloaded: boolean
  failed: boolean
  onSelect: (checked: boolean) => void
  onDownload: () => void
  onDelete: () => void
  onAbort: () => void
}

interface DownloadResult {
  successCount: number
  skippedCount: number
  downloadedAudios: LocalAudio[]
  existingAudios: LocalAudio[]
}

// Download abort controllers map
const downloadAbortControllers = new Map<string, AbortController>()

// ============================================
// Helper Functions
// ============================================

/**
 * Download cover and return web URL
 */
async function downloadCoverToWeb(
  coverUrl: string | undefined,
  platform: string,
): Promise<string | null> {
  if (!coverUrl) return null

  try {
    const localPath = await download_cover(coverUrl, platform)
    if (!localPath) return null
    return await get_web_url(localPath)
  } catch (error) {
    console.error("Failed to download cover:", error)
    return null
  }
}

/**
 * Check if audio already exists and return LocalAudio if found
 */
async function checkExistingAudio(audio: Audio): Promise<LocalAudio | null> {
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
}

/**
 * Download single audio and return LocalAudio
 * Note: Tauri invoke cannot be truly aborted, signal is used to ignore result
 */
async function downloadSingleAudio(
  audio: Audio,
  signal?: AbortSignal,
): Promise<LocalAudio | null> {
  try {
    // Check if already aborted before starting
    if (signal?.aborted) {
      return null
    }

    // Start download (cannot be truly aborted in Tauri)
    const result = await download_audio(audio)

    // Check if aborted while downloading (ignore result if aborted)
    if (signal?.aborted) {
      return null
    }

    return result
  } catch (error) {
    console.error(`Download failed for ${audio.title}:`, error)
    return null
  }
}

// ============================================
// Components
// ============================================

/**
 * Memoized AudioItem component
 */
const AudioItem: FC<AudioItemProps> = memo(
  ({
    audio,
    selected,
    coverUrl,
    downloading,
    downloaded,
    failed,
    onSelect,
    onDownload,
    onDelete,
    onAbort,
  }) => {
    const downloadingAll = useAppStore((state) => state.searchDownloadingAll)
    const selectedIds = useAppStore((state) => state.searchSelectedIds)
    const downloadedIds = useAppStore((state) => state.searchDownloadedIds)
    const failedIds = useAppStore((state) => state.searchFailedIds)

    // Check if all operations are complete
    const allOperationsComplete = useMemo(() => {
      if (selectedIds.size === 0) return false
      const selectedArray = Array.from(selectedIds)
      return selectedArray.every(
        (id) => downloadedIds.has(id) && !failedIds.has(id),
      )
    }, [selectedIds, downloadedIds, failedIds])

    return (
      <Flex className="audio-card-selectable" align="center" gap="middle">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={downloading || downloadingAll || allOperationsComplete}
        />
        <Avatar
          src={coverUrl || DEFAULT_COVER_URL}
          icon={<AudioOutlined />}
          size={56}
          shape="square"
          alt={audio.title}
        />
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Text strong ellipsis>
            {audio.title}
          </Text>
          <Flex align="center" gap="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {audio.platform}
            </Text>
            {downloaded && (
              <Text type="success" style={{ fontSize: 12 }}>
                · Downloaded
              </Text>
            )}
            {failed && (
              <Text type="danger" style={{ fontSize: 12 }}>
                · Failed
              </Text>
            )}
          </Flex>
        </Flex>
        <Button
          type="text"
          icon={<DownloadOutlined />}
          loading={downloading}
          disabled={downloaded || downloadingAll || allOperationsComplete}
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
        />
        {downloading ? (
          <Button
            type="text"
            danger
            icon={<StopOutlined />}
            disabled={allOperationsComplete}
            onClick={(e) => {
              e.stopPropagation()
              onAbort()
            }}
            title="Abort download"
          />
        ) : (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={allOperationsComplete}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Remove from list"
          />
        )}
      </Flex>
    )
  },
)

AudioItem.displayName = "AudioItem"

// ============================================
// Main Component
// ============================================

export const SearchPage: FC = () => {
  // Store subscriptions
  const url = useAppStore((state) => state.searchText)
  const playlist = useAppStore((state) => state.searchPlaylist)
  const selectedIds = useAppStore((state) => state.searchSelectedIds)
  const downloadingIds = useAppStore((state) => state.searchDownloadingIds)
  const downloadedIds = useAppStore((state) => state.searchDownloadedIds)
  const failedIds = useAppStore((state) => state.searchFailedIds)
  const searching = useAppStore((state) => state.searchSearching)
  const downloadingAll = useAppStore((state) => state.searchDownloadingAll)
  const coverUrls = useAppStore((state) => state.searchCoverUrls)
  const playlistCoverUrl = useAppStore((state) => state.searchPlaylistCoverUrl)
  const configPlaylists = useAppStore((state) => state.config.playlists)

  // Get audios from AUDIO_PLAYLIST for checking existing audios
  const configAudios = useMemo(() => {
    const audioPlaylist = configPlaylists.find(
      (p) => p.id === AUDIO_PLAYLIST_ID,
    )
    return audioPlaylist?.audios || []
  }, [configPlaylists])

  // Track if all operations are complete (all selected audios are downloaded/added)
  const allOperationsComplete = useMemo(() => {
    if (!playlist || selectedIds.size === 0) return false

    const selectedArray = Array.from(selectedIds)
    const allDownloaded = selectedArray.every((id) => downloadedIds.has(id))
    const noFailed = selectedArray.every((id) => !failedIds.has(id))

    // If not all downloaded or has failed, operations not complete
    if (!allDownloaded || !noFailed) return false

    // For playlists (multiple audios), check if playlist already exists in config
    const isPlaylist = playlist.audios.length > 1
    if (isPlaylist) {
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()
      const existingPlaylist = configPlaylists.find((p) => p.id === playlistId)

      // If playlist exists and has all the same audios, operations complete
      if (existingPlaylist) {
        const existingAudioIds = new Set(
          existingPlaylist.audios.map((a) => a.audio.id),
        )
        const allAudiosInPlaylist = selectedArray.every((id) =>
          existingAudioIds.has(id),
        )
        return allAudiosInPlaylist
      }
      // Playlist doesn't exist yet, operations not complete
      return false
    }

    // For single audio, if downloaded, operations complete
    return true
  }, [playlist, selectedIds, downloadedIds, failedIds, configPlaylists])

  // Store actions
  const setSearchText = useAppStore((state) => state.setSearchText)
  const setSearchPlaylist = useAppStore((state) => state.setSearchPlaylist)
  const setSearchSelectedIds = useAppStore(
    (state) => state.setSearchSelectedIds,
  )
  const addSearchDownloadingId = useAppStore(
    (state) => state.addSearchDownloadingId,
  )
  const removeSearchDownloadingId = useAppStore(
    (state) => state.removeSearchDownloadingId,
  )
  const addSearchDownloadedId = useAppStore(
    (state) => state.addSearchDownloadedId,
  )
  const addSearchFailedId = useAppStore((state) => state.addSearchFailedId)
  const removeSearchFailedId = useAppStore(
    (state) => state.removeSearchFailedId,
  )
  const setSearchSearching = useAppStore((state) => state.setSearchSearching)
  const setSearchDownloadingAll = useAppStore(
    (state) => state.setSearchDownloadingAll,
  )
  const addSearchCoverUrl = useAppStore((state) => state.addSearchCoverUrl)
  const setSearchPlaylistCoverUrl = useAppStore(
    (state) => state.setSearchPlaylistCoverUrl,
  )
  const clearSearchRuntimeData = useAppStore(
    (state) => state.clearSearchRuntimeData,
  )
  const clearSearchStatesOnly = useAppStore(
    (state) => state.clearSearchStatesOnly,
  )
  const addAudiosToConfig = useAppStore((state) => state.addAudiosToConfig)
  const addPlaylistToConfig = useAppStore((state) => state.addPlaylistToConfig)
  const loadConfig = useAppStore((state) => state.loadConfig)

  // ============================================
  // Effects
  // ============================================

  // Clear search when URL is empty
  useEffect(() => {
    if (!url.trim()) {
      clearSearchRuntimeData()
    }
  }, [url, clearSearchRuntimeData])

  // ============================================
  // Handlers
  // ============================================

  /**
   * Handle search - extract audios from URL
   */
  const handleSearch = useCallback(async () => {
    if (!url.trim()) return

    setSearchSearching(true)
    // Clear only runtime states, keep searchText for re-search
    clearSearchStatesOnly()

    try {
      const [playlist, defaultAudioIndex] = await extract_audios(url)

      // Check if search was cleared during API call
      if (!useAppStore.getState().searchText.trim()) return

      setSearchPlaylist(playlist)

      // Check existing audios and mark as downloaded
      const existingAudios: LocalAudio[] = []
      for (const audio of playlist.audios) {
        const existing = await checkExistingAudio(audio)
        if (existing) {
          existingAudios.push(existing)
          addSearchDownloadedId(audio.id)

          // Cache cover URL if exists
          if (existing.cover_path) {
            const webUrl = await get_web_url(existing.cover_path)
            addSearchCoverUrl(audio.id, webUrl)
          }
        }
      }

      // Add single existing audio to config
      if (existingAudios.length > 0 && playlist.audios.length === 1) {
        await addAudiosToConfig(existingAudios)
      }

      // Auto-select default audio
      if (
        defaultAudioIndex !== null &&
        defaultAudioIndex >= 0 &&
        defaultAudioIndex < playlist.audios.length
      ) {
        const defaultAudio = playlist.audios[defaultAudioIndex]
        if (defaultAudio) {
          setSearchSelectedIds(new Set([defaultAudio.id]))
        }
      }

      // Download covers in background
      if (playlist.cover) {
        downloadCoverToWeb(playlist.cover, playlist.platform).then((webUrl) => {
          if (webUrl) setSearchPlaylistCoverUrl(webUrl)
        })
      } else {
        // If playlist has no cover, use first audio's cover
        const firstAudioWithCover = playlist.audios.find((audio) => audio.cover)
        if (firstAudioWithCover?.cover) {
          downloadCoverToWeb(
            firstAudioWithCover.cover,
            firstAudioWithCover.platform,
          ).then((webUrl) => {
            if (webUrl) setSearchPlaylistCoverUrl(webUrl)
          })
        }
      }

      playlist.audios.forEach((audio) => {
        if (audio.cover) {
          downloadCoverToWeb(audio.cover, audio.platform).then((webUrl) => {
            if (webUrl) addSearchCoverUrl(audio.id, webUrl)
          })
        }
      })
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setSearchSearching(false)
    }
  }, [
    url,
    setSearchSearching,
    clearSearchStatesOnly,
    setSearchPlaylist,
    setSearchSelectedIds,
    setSearchPlaylistCoverUrl,
    addSearchDownloadedId,
    addSearchCoverUrl,
    addAudiosToConfig,
  ])

  /**
   * Handle abort download
   * Note: Tauri download cannot be truly stopped, we just ignore the result
   */
  const handleAbortDownload = useCallback((audioId: string) => {
    const controller = downloadAbortControllers.get(audioId)
    if (controller) {
      // Abort the controller (marks signal as aborted)
      // This will trigger the abort event listener in downloadSelectedAudios
      // which will reject the abortPromise and break out of Promise.race
      controller.abort()
    }
  }, [])

  /**
   * Handle delete audio from search results
   */
  const handleDeleteAudio = useCallback(
    (audioId: string) => {
      if (!playlist) return

      // Remove from selection
      const newSelected = new Set(selectedIds)
      newSelected.delete(audioId)
      setSearchSelectedIds(newSelected)

      // Remove from playlist
      const updatedPlaylist = {
        ...playlist,
        audios: playlist.audios.filter((a) => a.id !== audioId),
      }
      setSearchPlaylist(updatedPlaylist)

      // Clean up states
      removeSearchDownloadingId(audioId)
      removeSearchFailedId(audioId)
    },
    [
      playlist,
      selectedIds,
      setSearchSelectedIds,
      setSearchPlaylist,
      removeSearchDownloadingId,
      removeSearchFailedId,
    ],
  )

  /**
   * Handle select/deselect audio
   */
  const handleSelect = useCallback(
    (audioId: string, checked: boolean) => {
      const newSet = new Set(selectedIds)
      if (checked) {
        newSet.add(audioId)
      } else {
        newSet.delete(audioId)
      }
      setSearchSelectedIds(newSet)
    },
    [selectedIds, setSearchSelectedIds],
  )

  /**
   * Handle select all / deselect all
   */
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!playlist) return

      if (checked) {
        // Select all audios (including downloaded)
        setSearchSelectedIds(new Set(playlist.audios.map((a) => a.id)))
      } else {
        setSearchSelectedIds(new Set())
      }
    },
    [playlist, setSearchSelectedIds],
  )

  /**
   * Handle download single audio
   */
  const handleDownloadSingle = useCallback(
    async (audio: Audio) => {
      if (downloadingIds.has(audio.id) || downloadedIds.has(audio.id)) return

      addSearchDownloadingId(audio.id)

      try {
        const localAudio = await downloadSingleAudio(audio)

        if (localAudio) {
          await addAudiosToConfig([localAudio])
          addSearchDownloadedId(localAudio.audio.id)
        }
      } catch (_error) {
        addSearchFailedId(audio.id)
      } finally {
        removeSearchDownloadingId(audio.id)
      }
    },
    [
      downloadingIds,
      downloadedIds,
      addSearchDownloadingId,
      removeSearchDownloadingId,
      addSearchDownloadedId,
      addSearchFailedId,
      addAudiosToConfig,
    ],
  )

  /**
   * Download selected audios (or retry failed ones)
   */
  const downloadSelectedAudios = useCallback(
    async (
      selectedAudios: Audio[],
      retryMode: boolean = false,
    ): Promise<DownloadResult> => {
      let successCount = 0
      let skippedCount = 0
      const downloadedAudios: LocalAudio[] = []
      const existingAudios: LocalAudio[] = []

      for (const audio of selectedAudios) {
        // In retry mode, only download failed audios
        if (retryMode && !failedIds.has(audio.id)) {
          // Skip non-failed audios in retry mode
          if (downloadedIds.has(audio.id)) {
            const existing = configAudios.find((a) => a.audio.id === audio.id)
            if (existing) {
              existingAudios.push(existing)
              skippedCount++
            }
          }
          continue
        }

        // Skip if already downloaded (not in retry mode)
        if (!retryMode && downloadedIds.has(audio.id)) {
          const existing = configAudios.find((a) => a.audio.id === audio.id)
          if (existing) {
            existingAudios.push(existing)
            skippedCount++
          }
          continue
        }

        // Clear failed status before retry
        if (failedIds.has(audio.id)) {
          removeSearchFailedId(audio.id)
        }

        // Create abort controller for this download
        const abortController = new AbortController()
        downloadAbortControllers.set(audio.id, abortController)

        addSearchDownloadingId(audio.id)

        // Create a promise that rejects when aborted
        const abortPromise = new Promise<never>((_, reject) => {
          abortController.signal.addEventListener("abort", () => {
            reject(new Error("ABORTED"))
          })
        })

        // Start download and race with abort
        const downloadPromise = downloadSingleAudio(
          audio,
          abortController.signal,
        )

        try {
          // Race between download and abort
          const localAudio = await Promise.race([downloadPromise, abortPromise])

          if (localAudio) {
            downloadedAudios.push(localAudio)
            addSearchDownloadedId(localAudio.audio.id)
            successCount++
          } else {
            // Download returned null (failed)
            addSearchFailedId(audio.id)
          }
        } catch (error) {
          // Check if error was due to abort
          if (error instanceof Error && error.message === "ABORTED") {
            // Mark as failed and continue to next audio immediately
            addSearchFailedId(audio.id)
            continue
          }
          // Other errors
          addSearchFailedId(audio.id)
        } finally {
          // Clean up
          downloadAbortControllers.delete(audio.id)
          removeSearchDownloadingId(audio.id)
        }
      }

      return {
        successCount,
        skippedCount,
        downloadedAudios,
        existingAudios,
      }
    },
    [
      downloadedIds,
      failedIds,
      configAudios,
      addSearchDownloadingId,
      removeSearchDownloadingId,
      addSearchDownloadedId,
      addSearchFailedId,
      removeSearchFailedId,
    ],
  )

  /**
   * Handle download/retry/add action based on current state
   */
  const handleDownloadAll = useCallback(async () => {
    if (!playlist || selectedIds.size === 0) return

    setSearchDownloadingAll(true)

    try {
      const selectedAudios = playlist.audios.filter((a) =>
        selectedIds.has(a.id),
      )

      // Determine if this is retry mode or add mode
      const selectedFailedIds = Array.from(selectedIds).filter((id) =>
        failedIds.has(id),
      )
      const selectedDownloadedIds = Array.from(selectedIds).filter((id) =>
        downloadedIds.has(id),
      )
      const selectedPendingIds = Array.from(selectedIds).filter(
        (id) => !downloadedIds.has(id) && !failedIds.has(id),
      )

      const isRetryMode =
        selectedFailedIds.length > 0 && selectedPendingIds.length === 0
      const isAddMode =
        selectedDownloadedIds.length > 0 &&
        selectedPendingIds.length === 0 &&
        selectedFailedIds.length === 0

      let result: DownloadResult

      if (isAddMode) {
        // Add mode: collect already downloaded audios
        const existingAudios: LocalAudio[] = []
        for (const id of selectedDownloadedIds) {
          const existing = configAudios.find((a) => a.audio.id === id)
          if (existing) {
            existingAudios.push(existing)
          }
        }
        result = {
          successCount: 0,
          skippedCount: existingAudios.length,
          downloadedAudios: [],
          existingAudios,
        }
      } else {
        // Download or retry mode
        result = await downloadSelectedAudios(selectedAudios, isRetryMode)
      }

      const allAudios = [...result.downloadedAudios, ...result.existingAudios]
      const isPlaylist = playlist.audios.length > 1
      const isSingleAudio = playlist.audios.length === 1

      if (isPlaylist && allAudios.length > 0) {
        // Download playlist cover
        let coverPath: string | null = null
        if (playlist.cover) {
          try {
            console.log("Downloading playlist cover:", playlist.cover)
            coverPath = await download_cover(playlist.cover, playlist.platform)
            console.log("Downloaded playlist cover_path:", coverPath)
          } catch (error) {
            console.error("Failed to download playlist cover:", error)
          }
        } else {
          // If playlist has no cover, use first audio's cover
          const firstAudioWithCover = playlist.audios.find(
            (audio) => audio.cover,
          )
          if (firstAudioWithCover?.cover) {
            try {
              console.log(
                "Downloading fallback cover from first audio:",
                firstAudioWithCover.cover,
              )
              coverPath = await download_cover(
                firstAudioWithCover.cover,
                firstAudioWithCover.platform,
              )
              console.log("Downloaded fallback cover_path:", coverPath)
            } catch (error) {
              console.error("Failed to download fallback cover:", error)
            }
          }
        }

        // Create playlist - store will handle merging
        const playlistId =
          playlist.id || playlist.title || new Date().toISOString()
        const audioMap = new Map(allAudios.map((a) => [a.audio.id, a]))
        const finalAudios = playlist.audios
          .map((audio: Audio) => audioMap.get(audio.id))
          .filter(Boolean) as LocalAudio[]

        const localPlaylist: LocalPlaylist = {
          id: playlistId,
          title: playlist.title,
          cover_path: coverPath,
          cover: playlist.cover,
          audios: finalAudios,
          platform: playlist.platform,
        }

        console.log("Adding playlist to config:", {
          id: localPlaylist.id,
          cover_path: localPlaylist.cover_path,
          cover: localPlaylist.cover,
        })

        await addPlaylistToConfig(localPlaylist)
        await loadConfig()
        setSearchSelectedIds(new Set())
      } else if (isSingleAudio && result.downloadedAudios.length > 0) {
        // Single audio - add to config.audios
        await addAudiosToConfig(result.downloadedAudios)
        await loadConfig()
        setSearchSelectedIds(new Set())
      } else if (
        isSingleAudio &&
        isAddMode &&
        result.existingAudios.length > 0
      ) {
        // Single audio already exists, just clear selection
        setSearchSelectedIds(new Set())
      }
      // If there are still failed audios, keep selection for retry
    } finally {
      setSearchDownloadingAll(false)
    }
  }, [
    playlist,
    selectedIds,
    failedIds,
    downloadedIds,
    configAudios,
    downloadSelectedAudios,
    setSearchDownloadingAll,
    setSearchSelectedIds,
    addAudiosToConfig,
    addPlaylistToConfig,
    loadConfig,
  ])

  // ============================================
  // Computed Values
  // ============================================

  const { allSelected, someSelected, downloadButtonText, downloadButtonIcon } =
    useMemo(() => {
      const allAudios = playlist?.audios || []
      const all =
        allAudios.length > 0 && allAudios.every((a) => selectedIds.has(a.id))
      const some = selectedIds.size > 0 && !all

      const selectedArray = Array.from(selectedIds)

      const alreadyDownloadedCount = selectedArray.filter((id) =>
        downloadedIds.has(id),
      ).length
      const failedCount = selectedArray.filter((id) => failedIds.has(id)).length
      const pendingCount = selectedArray.filter(
        (id) => !downloadedIds.has(id) && !failedIds.has(id),
      ).length

      let text = "Download"
      let icon = <DownloadOutlined />

      // Determine button state
      if (pendingCount === 0 && failedCount > 0) {
        // Only failed audios selected - Retry mode
        text = failedCount === 1 ? "Retry" : `Retry ${failedCount}`
        icon = <ReloadOutlined />
      } else if (
        pendingCount === 0 &&
        failedCount === 0 &&
        alreadyDownloadedCount > 0
      ) {
        // Only downloaded audios selected - Add mode
        text =
          alreadyDownloadedCount === 1
            ? "Add to playlist"
            : `Add ${alreadyDownloadedCount} to playlist`
        icon = <PlusOutlined />
      } else if (pendingCount > 0) {
        // Has pending downloads - Download mode
        if (alreadyDownloadedCount > 0) {
          text = `Download ${pendingCount} (${alreadyDownloadedCount} existing)`
        } else {
          text = pendingCount === 1 ? "Download" : `Download ${pendingCount}`
        }
        icon = <DownloadOutlined />
      }

      return {
        allSelected: all,
        someSelected: some,
        downloadButtonText: text,
        downloadButtonIcon: icon,
      }
    }, [playlist, selectedIds, downloadedIds, failedIds])

  // ============================================
  // Render
  // ============================================

  return (
    <Flex vertical className="page search-page" gap="middle">
      <Search
        placeholder="Paste audio/playlist URL here"
        allowClear
        value={url}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        loading={searching}
        disabled={searching}
        size="large"
      />

      {searching && (
        <Flex flex={1} align="center" justify="center">
          <Spin size="large" tip="Searching..." />
        </Flex>
      )}

      {playlist && !searching && (
        <>
          <Flex vertical className="audio-list" gap="small">
            <Text type="secondary" style={{ fontSize: 14 }}>
              Found {playlist.audios.length} tracks
            </Text>

            {playlist.title && playlist.audios.length > 1 && (
              <Flex align="center" gap="middle" className="audio-card">
                <Avatar
                  src={playlistCoverUrl || DEFAULT_COVER_URL}
                  icon={<AudioOutlined />}
                  size={56}
                  shape="square"
                  alt={playlist.title}
                />
                <Flex vertical flex={1} style={{ minWidth: 0 }}>
                  <Text strong ellipsis>
                    {playlist.title}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {playlist.platform}
                  </Text>
                </Flex>
              </Flex>
            )}

            {playlist.audios.map((audio) => (
              <AudioItem
                key={audio.id}
                audio={audio}
                coverUrl={coverUrls[audio.id] || null}
                selected={selectedIds.has(audio.id)}
                downloading={downloadingIds.has(audio.id)}
                downloaded={downloadedIds.has(audio.id)}
                failed={failedIds.has(audio.id)}
                onSelect={(checked) => handleSelect(audio.id, checked)}
                onDownload={() => handleDownloadSingle(audio)}
                onDelete={() => handleDeleteAudio(audio.id)}
                onAbort={() => handleAbortDownload(audio.id)}
              />
            ))}
          </Flex>

          <Flex
            align="center"
            justify="space-between"
            className="search-bottom-bar"
          >
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              disabled={downloadingAll || allOperationsComplete}
            >
              Select All
            </Checkbox>
            <Button
              type="primary"
              icon={downloadButtonIcon}
              onClick={handleDownloadAll}
              loading={downloadingAll}
              disabled={selectedIds.size === 0 || allOperationsComplete}
            >
              {downloadButtonText}
            </Button>
          </Flex>
        </>
      )}

      {!playlist && !searching && (
        <Flex flex={1} align="center" justify="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="Search"
          />
        </Flex>
      )}
    </Flex>
  )
}

export default SearchPage
