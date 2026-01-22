import { DownloadOutlined, AudioOutlined } from "@ant-design/icons"
import {
  Button,
  Checkbox,
  Input,
  Flex,
  Typography,
  Avatar,
  Spin,
} from "antd"
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
  onSelect: (checked: boolean) => void
  onDownload: () => void
}

interface DownloadResult {
  successCount: number
  skippedCount: number
  downloadedAudios: LocalAudio[]
  existingAudios: LocalAudio[]
}

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
async function checkExistingAudio(
  audio: Audio,
): Promise<LocalAudio | null> {
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
 */
async function downloadSingleAudio(audio: Audio): Promise<LocalAudio | null> {
  try {
    return await download_audio(audio)
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
    onSelect,
    onDownload,
  }) => {
    const downloadingAll = useAppStore((state) => state.searchDownloadingAll)

    return (
      <Flex className="audio-card-selectable" align="center" gap="middle">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={downloaded || downloading || downloadingAll}
        />
        <Avatar
          src={coverUrl || DEFAULT_COVER_URL}
          icon={<AudioOutlined />}
          size={56}
          shape="square"
          alt={audio.title}
        />
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Text strong ellipsis={{ tooltip: audio.title }}>
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
          </Flex>
        </Flex>
        <Button
          type="text"
          icon={<DownloadOutlined />}
          loading={downloading}
          disabled={downloaded || downloadingAll}
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
        />
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
  const searching = useAppStore((state) => state.searchSearching)
  const downloadingAll = useAppStore((state) => state.searchDownloadingAll)
  const coverUrls = useAppStore((state) => state.searchCoverUrls)
  const playlistCoverUrl = useAppStore((state) => state.searchPlaylistCoverUrl)
  const configAudios = useAppStore((state) => state.config.audios)

  // Store actions
  const setSearchText = useAppStore((state) => state.setSearchText)
  const setSearchPlaylist = useAppStore((state) => state.setSearchPlaylist)
  const setSearchSelectedIds = useAppStore((state) => state.setSearchSelectedIds)
  const addSearchDownloadingId = useAppStore((state) => state.addSearchDownloadingId)
  const removeSearchDownloadingId = useAppStore((state) => state.removeSearchDownloadingId)
  const addSearchDownloadedId = useAppStore((state) => state.addSearchDownloadedId)
  const addSearchFailedId = useAppStore((state) => state.addSearchFailedId)
  const setSearchSearching = useAppStore((state) => state.setSearchSearching)
  const setSearchDownloadingAll = useAppStore((state) => state.setSearchDownloadingAll)
  const addSearchCoverUrl = useAppStore((state) => state.addSearchCoverUrl)
  const setSearchPlaylistCoverUrl = useAppStore((state) => state.setSearchPlaylistCoverUrl)
  const clearSearchRuntimeData = useAppStore((state) => state.clearSearchRuntimeData)
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
    setSearchPlaylist(null)
    setSearchSelectedIds(new Set())

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
      }

      playlist.audios.forEach((audio) => {
        if (audio.cover && !downloadedIds.has(audio.id)) {
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
    downloadedIds,
    setSearchSearching,
    setSearchPlaylist,
    setSearchSelectedIds,
    setSearchPlaylistCoverUrl,
    addSearchDownloadedId,
    addSearchCoverUrl,
    addAudiosToConfig,
  ])

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
      } catch (error) {
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
   * Download selected audios
   */
  const downloadSelectedAudios = useCallback(
    async (selectedAudios: Audio[]): Promise<DownloadResult> => {
      let successCount = 0
      let skippedCount = 0
      const downloadedAudios: LocalAudio[] = []
      const existingAudios: LocalAudio[] = []

      for (const audio of selectedAudios) {
        // Skip if already downloaded
        if (downloadedIds.has(audio.id)) {
          const existing = configAudios.find((a) => a.audio.id === audio.id)
          if (existing) {
            existingAudios.push(existing)
            skippedCount++
          }
          continue
        }

        addSearchDownloadingId(audio.id)

        try {
          const localAudio = await downloadSingleAudio(audio)
          if (localAudio) {
            downloadedAudios.push(localAudio)
            addSearchDownloadedId(localAudio.audio.id)
            successCount++
          }
        } catch (error) {
          addSearchFailedId(audio.id)
        } finally {
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
      configAudios,
      addSearchDownloadingId,
      removeSearchDownloadingId,
      addSearchDownloadedId,
      addSearchFailedId,
    ],
  )

  /**
   * Handle download all selected audios
   */
  const handleDownloadAll = useCallback(async () => {
    if (!playlist || selectedIds.size === 0) return

    setSearchDownloadingAll(true)

    try {
      const selectedAudios = playlist.audios.filter((a) => selectedIds.has(a.id))
      const result = await downloadSelectedAudios(selectedAudios)

      const allAudios = [...result.downloadedAudios, ...result.existingAudios]
      const isPlaylist = playlist.audios.length > 1
      const isSingleAudio = playlist.audios.length === 1

      if (isPlaylist && allAudios.length > 0) {
        // Download playlist cover
        let coverPath: string | null = null
        if (playlist.cover) {
          try {
            coverPath = await download_cover(playlist.cover, playlist.platform)
          } catch (error) {
            console.error("Failed to download playlist cover:", error)
          }
        }

        // Create playlist - store will handle merging
        const playlistId = playlist.id || playlist.title || new Date().toISOString()
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

        await addPlaylistToConfig(localPlaylist)
      } else if (isSingleAudio && result.downloadedAudios.length > 0) {
        // Single audio - add to config.audios
        await addAudiosToConfig(result.downloadedAudios)
      }

      await loadConfig()
      setSearchSelectedIds(new Set())
    } finally {
      setSearchDownloadingAll(false)
    }
  }, [
    playlist,
    selectedIds,
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

  const { allSelected, someSelected, downloadButtonText } = useMemo(() => {
    const allAudios = playlist?.audios || []
    const all = allAudios.length > 0 && allAudios.every((a) => selectedIds.has(a.id))
    const some = selectedIds.size > 0 && !all

    const selectedCount = selectedIds.size
    const alreadyDownloadedCount = Array.from(selectedIds).filter((id) =>
      downloadedIds.has(id),
    ).length
    const toDownloadCount = selectedCount - alreadyDownloadedCount

    let text = "Download"
    if (toDownloadCount > 0 && alreadyDownloadedCount > 0) {
      text = `Download ${toDownloadCount} (${alreadyDownloadedCount} existing)`
    } else if (toDownloadCount > 0) {
      text = `Download ${toDownloadCount}`
    } else if (alreadyDownloadedCount > 0) {
      text = `Add ${alreadyDownloadedCount} to playlist`
    }

    return { allSelected: all, someSelected: some, downloadButtonText: text }
  }, [playlist, selectedIds, downloadedIds])

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
        size="large"
      />

      {searching && (
        <Flex flex={1} align="center" justify="center">
          <Spin fullscreen size="large" />
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
                  <Text strong ellipsis={{ tooltip: playlist.title }}>
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
                onSelect={(checked) => handleSelect(audio.id, checked)}
                onDownload={() => handleDownloadSingle(audio)}
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
              disabled={downloadingAll}
            >
              Select All
            </Checkbox>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadAll}
              loading={downloadingAll}
              disabled={selectedIds.size === 0}
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
