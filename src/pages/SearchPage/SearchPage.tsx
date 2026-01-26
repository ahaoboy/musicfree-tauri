import { FC, useState, useCallback, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Checkbox, Input, Flex, Typography, Avatar, Spin } from "antd"
import DownloadOutlined from "@ant-design/icons/DownloadOutlined"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import ReloadOutlined from "@ant-design/icons/ReloadOutlined"
import PlusOutlined from "@ant-design/icons/PlusOutlined"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import StopOutlined from "@ant-design/icons/StopOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import ClearOutlined from "@ant-design/icons/ClearOutlined"
import EnvironmentOutlined from "@ant-design/icons/EnvironmentOutlined"
import {
  DEFAULT_COVER_URL,
  LocalPlaylist,
  AUDIO_PLAYLIST_ID,
  download_cover,
  LocalAudio,
} from "../../api"
import { useAppStore } from "../../store"
import { AudioCard, AudioList, PlatformIcon } from "../../components"
import { useSearchAudio } from "./useSearchAudio"
import { useDownloadManager } from "./useDownloadManager"
import { useSelectionManager } from "./useSelectionManager"
import "./index.less"

const { Search } = Input
const { Text } = Typography

export const SearchPage: FC = () => {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState("")
  const [defaultAudioId, setDefaultAudioId] = useState<string | null>(null)

  // Custom hooks
  const { playlist, searching, playlistCoverUrl, searchAudios, clearSearch } =
    useSearchAudio()

  const {
    downloadingIds,
    downloadedIds,
    failedIds,
    downloadingAll,
    downloadedAudios,
    startDownload,
    abortDownload,
    downloadMultiple,
    markAsDownloaded,
    removeFromFailed,
    clearDownloadState,
  } = useDownloadManager()

  const {
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    removeFromSelection,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useSelectionManager()

  // Store actions
  const addAudiosToConfig = useAppStore((state) => state.addAudiosToConfig)
  const addPlaylistToConfig = useAppStore((state) => state.addPlaylistToConfig)
  const configPlaylists = useAppStore((state) => state.config.playlists)

  // Get existing audios from config
  const configAudios = useMemo(() => {
    const audioPlaylist = configPlaylists.find(
      (p) => p.id === AUDIO_PLAYLIST_ID,
    )
    return audioPlaylist?.audios || []
  }, [configPlaylists])

  // Check if audio exists in AUDIO_PLAYLIST
  const checkAudioExists = useCallback(
    (audioId: string): boolean => {
      return configAudios.some((a) => a.audio.id === audioId)
    },
    [configAudios],
  )

  // Check if playlist exists and all selected audios are downloaded
  const checkPlaylistExists = useCallback(
    (playlistId: string): boolean => {
      if (!playlist) return false

      const existingPlaylist = configPlaylists.find((p) => p.id === playlistId)
      if (!existingPlaylist) return false

      // Check if all selected audios exist in the playlist
      const selectedArray = Array.from(selectedIds)
      if (selectedArray.length === 0) return false

      const existingAudioIds = new Set(
        existingPlaylist.audios.map((a) => a.audio.id),
      )
      return selectedArray.every((id) => existingAudioIds.has(id))
    },
    [playlist, configPlaylists, selectedIds],
  )

  // Check if all operations are complete
  const allOperationsComplete = useMemo(() => {
    if (!playlist || selectedIds.size === 0) return false

    const selectedArray = Array.from(selectedIds)
    const allDownloaded = selectedArray.every((id) => downloadedIds.has(id))
    const noFailed = selectedArray.every((id) => !failedIds.has(id))

    if (!allDownloaded || !noFailed) return false

    // For playlists, check if already added to config
    const isPlaylist = playlist.audios.length > 1
    if (isPlaylist) {
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()
      const existingPlaylist = configPlaylists.find((p) => p.id === playlistId)

      if (existingPlaylist) {
        const existingAudioIds = new Set(
          existingPlaylist.audios.map((a) => a.audio.id),
        )
        return selectedArray.every((id) => existingAudioIds.has(id))
      }
      return false
    }

    return true
  }, [playlist, selectedIds, downloadedIds, failedIds, configPlaylists])

  // Check if should show navigate button (exists in config)
  const shouldShowNavigateButton = useMemo(() => {
    if (!playlist || selectedIds.size === 0) return false

    const isPlaylist = playlist.audios.length > 1
    const selectedArray = Array.from(selectedIds)

    if (isPlaylist) {
      // For playlist: check if playlist exists and all selected audios are in it
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()
      return checkPlaylistExists(playlistId)
    } else {
      // For single audio: check if exists in AUDIO_PLAYLIST
      if (selectedArray.length !== 1) return false
      return checkAudioExists(selectedArray[0])
    }
  }, [playlist, selectedIds, checkAudioExists, checkPlaylistExists])

  // Clear search when text is empty
  useEffect(() => {
    if (!searchText.trim()) {
      clearSearch()
      clearDownloadState()
      clearSelection()
      setDefaultAudioId(null)
    }
  }, [searchText, clearSearch, clearDownloadState, clearSelection])

  /**
   * Handle search
   */
  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return

    clearDownloadState()
    clearSelection()
    setDefaultAudioId(null)

    const result = await searchAudios(searchText)
    if (!result) return

    const { playlist, defaultAudioIndex, existingAudios } = result

    // Mark existing audios as downloaded
    existingAudios.forEach((audio) => {
      markAsDownloaded(audio.audio.id, audio)
    })

    // Add single existing audio to config
    if (existingAudios.length > 0 && playlist.audios.length === 1) {
      await addAudiosToConfig(existingAudios)
    }

    // Set default audio ID for highlighting and scrolling
    if (
      defaultAudioIndex !== null &&
      defaultAudioIndex >= 0 &&
      defaultAudioIndex < playlist.audios.length
    ) {
      const defaultAudio = playlist.audios[defaultAudioIndex]
      if (defaultAudio) {
        setDefaultAudioId(defaultAudio.id)
        toggleSelect(defaultAudio.id)
      }
    }
  }, [
    searchText,
    searchAudios,
    clearDownloadState,
    clearSelection,
    markAsDownloaded,
    addAudiosToConfig,
    toggleSelect,
  ])

  /**
   * Handle navigate to existing audio/playlist
   */
  const handleNavigateToExisting = useCallback(() => {
    if (!playlist || selectedIds.size === 0) return

    const isPlaylist = playlist.audios.length > 1
    const selectedArray = Array.from(selectedIds)

    if (isPlaylist) {
      // Navigate to playlist
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()
      navigate(`/playlists?highlight=${encodeURIComponent(playlistId)}`)
    } else {
      // Navigate to single audio in music page
      if (selectedArray.length === 1) {
        navigate(`/music?highlight=${encodeURIComponent(selectedArray[0])}`)
      }
    }
  }, [playlist, selectedIds, navigate])

  /**
   * Handle navigate to single audio
   */
  const handleNavigateToAudio = useCallback(
    (audioId: string) => {
      navigate(`/music?highlight=${encodeURIComponent(audioId)}`)
    },
    [navigate],
  )

  /**
   * Handle download single audio
   */
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

  /**
   * Handle delete audio from list
   */
  const handleDeleteAudio = useCallback(
    (audioId: string) => {
      if (!playlist) return

      removeFromSelection(audioId)
      // Note: We don't modify the playlist here, just remove from selection
      // If you want to remove from playlist, you'd need to update the playlist state
    },
    [playlist, removeFromSelection],
  )

  /**
   * Handle clear all failed audios
   */
  const handleClearFailed = useCallback(() => {
    if (!playlist) return

    // Remove all failed audios from selection and failed state
    const failedArray = Array.from(failedIds)
    failedArray.forEach((id) => {
      removeFromSelection(id)
      removeFromFailed(id)
    })
  }, [playlist, failedIds, removeFromSelection, removeFromFailed])

  /**
   * Handle download/add all selected
   */
  const handleDownloadAll = useCallback(async () => {
    if (!playlist || selectedIds.size === 0) return

    const selectedAudios = playlist.audios.filter((a) => selectedIds.has(a.id))

    // Determine mode
    const selectedFailedIds = Array.from(selectedIds).filter((id) =>
      failedIds.has(id),
    )
    const selectedDownloadedIds = Array.from(selectedIds).filter((id) =>
      downloadedIds.has(id),
    )
    const selectedPendingIds = Array.from(selectedIds).filter(
      (id) => !downloadedIds.has(id) && !failedIds.has(id),
    )

    console.log("handleDownloadAll debug:", {
      selectedIds: Array.from(selectedIds),
      selectedFailedIds,
      selectedDownloadedIds,
      selectedPendingIds,
      failedIds: Array.from(failedIds),
      downloadedIds: Array.from(downloadedIds),
    })

    const isRetryMode =
      selectedFailedIds.length > 0 && selectedPendingIds.length === 0
    const isAddMode =
      selectedDownloadedIds.length > 0 &&
      selectedPendingIds.length === 0 &&
      selectedFailedIds.length === 0

    console.log("Mode:", { isRetryMode, isAddMode })

    let result

    if (isAddMode) {
      // In add mode, collect LocalAudio objects from downloadedAudios Map
      const existingAudios: LocalAudio[] = []

      for (const audioId of selectedDownloadedIds) {
        const localAudio = downloadedAudios.get(audioId)
        if (localAudio) {
          existingAudios.push(localAudio)
        } else {
          // Also check configAudios as fallback
          const configAudio = configAudios.find((a) => a.audio.id === audioId)
          if (configAudio) {
            existingAudios.push(configAudio)
          }
        }
      }

      console.log("Add mode - checking existingAudios:", {
        selectedDownloadedIds,
        downloadedAudiosMapSize: downloadedAudios.size,
        existingAudiosCount: existingAudios.length,
      })

      result = {
        successCount: 0,
        failedCount: 0,
        skippedCount: existingAudios.length,
        downloadedAudios: [],
        existingAudios,
      }
      console.log("Add mode result:", result)
    } else {
      // Download or retry
      const existingAudios = configAudios.filter((a) =>
        selectedDownloadedIds.includes(a.audio.id),
      )
      result = await downloadMultiple(
        selectedAudios,
        existingAudios,
        isRetryMode,
      )

      console.log("Download result:", result)

      // If there are any failed downloads, don't auto-add to config
      // Let user decide to clear failed or retry
      if (result.failedCount > 0) {
        console.log("Has failed downloads, not auto-adding")
        return
      }
    }

    const allAudios = [...result.downloadedAudios, ...result.existingAudios]
    const isPlaylist = playlist.audios.length > 1

    console.log("Processing result:", {
      allAudios: allAudios.length,
      isPlaylist,
    })

    if (isPlaylist && allAudios.length > 0) {
      // Download playlist cover
      let coverPath: string | null = null
      if (playlist.cover) {
        try {
          coverPath = await download_cover(playlist.cover, playlist.platform)
        } catch (error) {
          console.error("Failed to download playlist cover:", error)
        }
      } else {
        // Use first audio's cover as fallback
        const firstAudioWithCover = playlist.audios.find((audio) => audio.cover)
        if (firstAudioWithCover?.cover) {
          try {
            coverPath = await download_cover(
              firstAudioWithCover.cover,
              firstAudioWithCover.platform,
            )
          } catch (error) {
            console.error("Failed to download fallback cover:", error)
          }
        }
      }

      // Create playlist
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()
      const audioMap = new Map(allAudios.map((a) => [a.audio.id, a]))
      const finalAudios = playlist.audios
        .map((audio) => audioMap.get(audio.id))
        .filter(Boolean) as any[]

      const localPlaylist: LocalPlaylist = {
        id: playlistId,
        title: playlist.title,
        cover_path: coverPath,
        cover: playlist.cover,
        audios: finalAudios,
        platform: playlist.platform,
        download_url: playlist.id,
      }

      console.log("Adding playlist to config:", localPlaylist)
      await addPlaylistToConfig(localPlaylist)
      clearSelection()

      // Navigate to playlists page with highlight parameter
      console.log("Navigating to playlists page")
      navigate(`/playlists?highlight=${encodeURIComponent(playlistId)}`)
    } else if (!isPlaylist && result.downloadedAudios.length > 0) {
      // Single audio - add to AUDIO_PLAYLIST
      console.log("Adding single audio to config")
      await addAudiosToConfig(result.downloadedAudios)
      clearSelection()

      // Navigate to music page with highlight parameter
      const downloadedAudio = result.downloadedAudios[0]
      console.log("Navigating to music page")
      navigate(
        `/music?highlight=${encodeURIComponent(downloadedAudio.audio.id)}`,
      )
    } else if (!isPlaylist && isAddMode && result.existingAudios.length > 0) {
      console.log("Adding existing single audio")
      clearSelection()

      // Navigate to music page with highlight parameter
      const existingAudio = result.existingAudios[0]
      console.log("Navigating to music page (existing)")
      navigate(`/music?highlight=${encodeURIComponent(existingAudio.audio.id)}`)
    }
  }, [
    playlist,
    selectedIds,
    failedIds,
    downloadedIds,
    configAudios,
    downloadMultiple,
    addPlaylistToConfig,
    addAudiosToConfig,
    clearSelection,
    navigate,
  ])

  // Check if should show clear failed button
  const showClearFailedButton = useMemo(() => {
    if (!playlist || downloadingAll) return false

    // Show button if:
    // 1. There are failed audios
    // 2. Not currently downloading
    // 3. Some audios are selected and failed
    const selectedArray = Array.from(selectedIds)
    const hasFailedInSelection = selectedArray.some((id) => failedIds.has(id))

    return failedIds.size > 0 && hasFailedInSelection
  }, [playlist, downloadingAll, selectedIds, failedIds])

  // Compute button state
  const { downloadButtonText, downloadButtonIcon } = useMemo(() => {
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

    // Check if should show navigate button
    if (shouldShowNavigateButton) {
      text = "Go to"
      icon = <EnvironmentOutlined />
    } else if (pendingCount === 0 && failedCount > 0) {
      text = failedCount === 1 ? "Retry" : `Retry ${failedCount}`
      icon = <ReloadOutlined />
    } else if (
      pendingCount === 0 &&
      failedCount === 0 &&
      alreadyDownloadedCount > 0
    ) {
      text =
        alreadyDownloadedCount === 1
          ? "Add to playlist"
          : `Add ${alreadyDownloadedCount} to playlist`
      icon = <PlusOutlined />
    } else if (pendingCount > 0) {
      if (alreadyDownloadedCount > 0) {
        text = `Download ${pendingCount} (${alreadyDownloadedCount} existing)`
      } else {
        text = pendingCount === 1 ? "Download" : `Download ${pendingCount}`
      }
      icon = <DownloadOutlined />
    }

    return { downloadButtonText: text, downloadButtonIcon: icon }
  }, [selectedIds, downloadedIds, failedIds, shouldShowNavigateButton])

  // Render
  return (
    <Flex vertical className="page search-page" gap="middle">
      <Search
        placeholder="Paste audio/playlist URL here"
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        loading={searching}
        disabled={searching}
        size="large"
      />

      {searching && (
        <Flex flex={1} align="center" justify="center">
          <Spin fullscreen size="large" tip="Searching..." />
        </Flex>
      )}

      {playlist && !searching && (
        <>
          <Text type="secondary" style={{ fontSize: 14, paddingLeft: 16 }}>
            Found {playlist.audios.length} ♪
          </Text>

          {playlist.title && playlist.audios.length > 1 && (
            <Flex
              align="center"
              gap="middle"
              className="audio-card"
              style={{ paddingLeft: 16, paddingRight: 16 }}
            >
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
                <Flex align="center" gap="small">
                  <PlatformIcon platform={playlist.platform} size={12} />
                </Flex>
              </Flex>
            </Flex>
          )}

          <AudioList highlightId={defaultAudioId}>
            {playlist.audios.map((audio) => {
              const downloading = downloadingIds.has(audio.id)
              const downloaded = downloadedIds.has(audio.id)
              const failed = failedIds.has(audio.id)
              const selected = selectedIds.has(audio.id)
              const isHighlighted = defaultAudioId === audio.id

              return (
                <div
                  key={`${playlist.id || "search"}-${audio.id}-${audio.platform}`}
                  data-item-id={audio.id}
                >
                  <AudioCard
                    coverPath={null}
                    coverUrl={audio.cover}
                    platform={audio.platform}
                    title={audio.title}
                    duration={audio.duration}
                    warnLongDuration={true}
                    onClick={() => {
                      if (
                        !downloading &&
                        !downloadingAll &&
                        !allOperationsComplete
                      ) {
                        toggleSelect(audio.id)
                      }
                    }}
                    active={isHighlighted}
                    badge={{
                      show: true,
                      icon: selected ? (
                        <CheckOutlined
                          style={{
                            color: "#fff",
                            backgroundColor: "#52c41a",
                            borderRadius: "50%",
                            padding: "4px",
                            fontSize: "12px",
                          }}
                        />
                      ) : (
                        0
                      ),
                    }}
                    extraInfo={
                      <>
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
                      </>
                    }
                    actions={
                      <>
                        <Button
                          type="text"
                          icon={
                            checkAudioExists(audio.id) ? (
                              <EnvironmentOutlined />
                            ) : (
                              <DownloadOutlined />
                            )
                          }
                          loading={downloading}
                          disabled={
                            checkAudioExists(audio.id)
                              ? false
                              : downloaded ||
                                downloadingAll ||
                                allOperationsComplete
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            if (checkAudioExists(audio.id)) {
                              handleNavigateToAudio(audio.id)
                            } else {
                              handleDownloadSingle(audio.id)
                            }
                          }}
                          title={
                            checkAudioExists(audio.id)
                              ? "Go to audio"
                              : "Download"
                          }
                        />
                        {downloading ? (
                          <Button
                            type="text"
                            danger
                            icon={<StopOutlined />}
                            disabled={allOperationsComplete}
                            onClick={(e) => {
                              e.stopPropagation()
                              abortDownload(audio.id)
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
                              handleDeleteAudio(audio.id)
                            }}
                            title="Remove from list"
                          />
                        )}
                      </>
                    }
                  />
                </div>
              )
            })}
          </AudioList>

          <Flex
            align="center"
            justify="space-between"
            className="search-bottom-bar"
          >
            <Checkbox
              checked={isAllSelected(playlist.audios)}
              indeterminate={isSomeSelected(playlist.audios)}
              onChange={(e) =>
                toggleSelectAll(playlist.audios, e.target.checked)
              }
              disabled={downloadingAll || allOperationsComplete}
            ></Checkbox>

            <Flex gap="small">
              {showClearFailedButton && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearFailed}
                  disabled={downloadingAll || allOperationsComplete}
                  title="Clear all failed audios from selection"
                ></Button>
              )}
              <Button
                type="primary"
                icon={downloadButtonIcon}
                onClick={
                  shouldShowNavigateButton
                    ? handleNavigateToExisting
                    : handleDownloadAll
                }
                loading={downloadingAll}
                disabled={
                  selectedIds.size === 0 ||
                  (!shouldShowNavigateButton && allOperationsComplete)
                }
              >
                {downloadButtonText}
              </Button>
            </Flex>
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
