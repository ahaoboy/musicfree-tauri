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
import {
  DEFAULT_COVER_URL,
  LocalPlaylist,
  AUDIO_PLAYLIST_ID,
  download_cover,
} from "../../api"
import { useAppStore } from "../../store"
import { AudioCard, AudioList } from "../../components"
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
    startDownload,
    abortDownload,
    downloadMultiple,
    markAsDownloaded,
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
      markAsDownloaded(audio.audio.id)
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

    const isRetryMode =
      selectedFailedIds.length > 0 && selectedPendingIds.length === 0
    const isAddMode =
      selectedDownloadedIds.length > 0 &&
      selectedPendingIds.length === 0 &&
      selectedFailedIds.length === 0

    let result

    if (isAddMode) {
      // Collect already downloaded audios
      const existingAudios = configAudios.filter((a) =>
        selectedDownloadedIds.includes(a.audio.id),
      )
      result = {
        successCount: 0,
        skippedCount: existingAudios.length,
        downloadedAudios: [],
        existingAudios,
      }
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
    }

    const allAudios = [...result.downloadedAudios, ...result.existingAudios]
    const isPlaylist = playlist.audios.length > 1

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
      }

      await addPlaylistToConfig(localPlaylist)
      clearSelection()

      // Navigate to playlists page with highlight parameter
      navigate(`/playlists?highlight=${encodeURIComponent(playlistId)}`)
    } else if (!isPlaylist && result.downloadedAudios.length > 0) {
      // Single audio - add to AUDIO_PLAYLIST
      await addAudiosToConfig(result.downloadedAudios)
      clearSelection()

      // Navigate to music page with highlight parameter
      const downloadedAudio = result.downloadedAudios[0]
      navigate(
        `/music?highlight=${encodeURIComponent(downloadedAudio.audio.id)}`,
      )
    } else if (!isPlaylist && isAddMode && result.existingAudios.length > 0) {
      clearSelection()

      // Navigate to music page with highlight parameter
      const existingAudio = result.existingAudios[0]
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

    if (pendingCount === 0 && failedCount > 0) {
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
  }, [selectedIds, downloadedIds, failedIds])

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
            Found {playlist.audios.length} tracks
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
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {playlist.platform}
                </Text>
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
                    subtitle={audio.platform}
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
                          icon={<DownloadOutlined />}
                          loading={downloading}
                          disabled={
                            downloaded ||
                            downloadingAll ||
                            allOperationsComplete
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadSingle(audio.id)
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
