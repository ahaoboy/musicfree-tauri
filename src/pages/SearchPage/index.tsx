import { DownloadOutlined, AudioOutlined } from "@ant-design/icons"
import {
  App,
  Button,
  Checkbox,
  Input,
  Space,
  Flex,
  Typography,
  Avatar,
} from "antd"
import { FC, useEffect } from "react"
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
import {
  useAppStore,
  useSearchText,
  useSearchPlaylist,
  useSearchSelectedIds,
  useSearchDownloadingIds,
  useSearchDownloadedIds,
  useSearchSearching,
  useSearchDownloadingAll,
  useSearchMessageToShow,
  useSearchCoverUrls,
  useSearchPlaylistCoverUrl,
  // Search page actions
  setSearchText,
  setSearchPlaylist,
  setSearchSelectedIds,
  addSearchDownloadingId,
  removeSearchDownloadingId,
  addSearchDownloadedId,
  addSearchFailedId,
  setSearchSearching,
  setSearchDownloadingAll,
  setSearchMessageToShow,
  setSearchCoverUrls,
  setSearchPlaylistCoverUrl,
  clearSearchRuntimeData,
} from "../../store"
import "./index.less"

const { Search } = Input
const { Text } = Typography

interface AudioItemProps {
  audio: Audio
  coverUrl: string | null
  selected: boolean
  downloading: boolean
  downloaded: boolean
  onSelect: (checked: boolean) => void
  onDownload: () => void
}

const AudioItem: FC<AudioItemProps> = ({
  audio,
  selected,
  coverUrl,
  downloading,
  downloaded,
  onSelect,
  onDownload,
}) => {
  return (
    <Flex className="audio-card-selectable" align="center" gap="middle">
      <div className="checkbox-wrapper">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={downloaded || downloading}
        />
      </div>
      <Avatar
        src={coverUrl || DEFAULT_COVER_URL}
        icon={<AudioOutlined />}
        size={56}
        shape="square"
        alt={audio.title}
        className="audio-cover"
      />
      <Flex vertical flex={1} style={{ minWidth: 0 }}>
        <Text
          strong
          ellipsis={{ tooltip: audio.title }}
          className="audio-title"
        >
          {audio.title}
        </Text>
        <Flex className="audio-meta" align="center" gap="small">
          <Text type="secondary" className="audio-platform">
            {audio.platform}
          </Text>
          {downloaded && <Text type="success"> · Downloaded</Text>}
        </Flex>
      </Flex>
      <div className="audio-action">
        <Button
          type="text"
          icon={<DownloadOutlined />}
          loading={downloading}
          disabled={downloaded}
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
        />
      </div>
    </Flex>
  )
}

// Search page - search for audio content and download tracks/playlists
export const SearchPage: FC = () => {
  const { message } = App.useApp()

  // Use global store for search page state persistence
  const url = useSearchText()
  const playlist = useSearchPlaylist()
  const selectedIds = useSearchSelectedIds()
  const downloadingIds = useSearchDownloadingIds()
  const downloadedIds = useSearchDownloadedIds()
  const searching = useSearchSearching()
  const downloadingAll = useSearchDownloadingAll()
  const messageToShow = useSearchMessageToShow()
  const coverUrls = useSearchCoverUrls()
  const playlistCoverUrl = useSearchPlaylistCoverUrl()

  const {
    config: { playlists },
    addAudiosToConfig,
    addPlaylistToConfig,
    loadConfig,
  } = useAppStore()

  // Handle messages in effect to avoid React 18 concurrent mode issues
  useEffect(() => {
    if (messageToShow) {
      const { type, text } = messageToShow
      message[type](text)
      setSearchMessageToShow(null)
    }
  }, [messageToShow, message])

  // Clear search results when search text is empty
  useEffect(() => {
    if (!url.trim()) {
      clearSearchRuntimeData()
    }
  }, [url])

  // Download and cache cover image
  const downloadAndCacheCover = async (
    coverUrl: string | undefined,
    platform: string,
    audioId?: string,
  ): Promise<string | null> => {
    if (!coverUrl) return null

    try {
      // Download cover to local storage
      const localPath = await download_cover(coverUrl, platform)
      if (!localPath) return null

      // Convert local path to web accessible URL
      const webUrl = await get_web_url(localPath)

      // Cache the URL if audioId provided
      if (audioId) {
        setSearchCoverUrls({ ...coverUrls, [audioId]: webUrl })
      }

      return webUrl
    } catch (error) {
      console.error("Failed to download cover:", error)
      return null
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!url.trim()) {
      setSearchMessageToShow({ type: "warning", text: "Please enter a URL" })
      return
    }

    setSearchSearching(true)
    setSearchPlaylist(null)
    setSearchSelectedIds(new Set())
    setSearchCoverUrls({})
    setSearchPlaylistCoverUrl(null)

    try {
      const result = await extract_audios(url)

      // Ensure search wasn't cleared while waiting
      if (!useAppStore.getState().searchText.trim()) {
        return
      }

      setSearchPlaylist(result)
      setSearchMessageToShow({
        type: "success",
        text: `Found ${result.audios.length} tracks`,
      })

      // Check for existing audios and covers
      const existingLocalAudios: LocalAudio[] = []
      const updatedDownloadedIds = new Set(downloadedIds)

      const coverCache: Record<string, string> = {}
      for (const audio of result.audios) {
        const audioPath = await exists_audio(audio)
        if (audioPath) {
          let coverPath: string | null = null
          if (audio.cover) {
            coverPath = await exists_cover(audio.cover, audio.platform)
            if (coverPath) coverCache[audio.id] = await get_web_url(coverPath)
          }
          const localAudio: LocalAudio = {
            audio,
            path: audioPath,
            cover_path: coverPath,
          }
          existingLocalAudios.push(localAudio)
          updatedDownloadedIds.add(audio.id)
        }
      }
      setSearchCoverUrls({ ...coverUrls, ...coverCache })
      // Add existing audios to config ONLY if it's a single track
      if (existingLocalAudios.length > 0 && result.audios.length === 1) {
        await addAudiosToConfig(existingLocalAudios)
      }

      // Update downloaded ids - this is now handled by the store automatically
      // The downloadedIds state is derived from the searchDownloadedIds Set

      // Download playlist cover
      if (result.cover) {
        downloadAndCacheCover(result.cover, result.platform).then((webUrl) => {
          if (webUrl) {
            setSearchPlaylistCoverUrl(webUrl)
          }
        })
      }

      // Download audio covers in background for non-existing audios
      result.audios.forEach((audio) => {
        if (audio.cover && !updatedDownloadedIds.has(audio.id)) {
          downloadAndCacheCover(audio.cover, audio.platform, audio.id)
        }
      })
    } catch (error) {
      console.error("Search failed:", error)
      setSearchMessageToShow({
        type: "error",
        text: "Search failed. Please check the URL.",
      })
    } finally {
      setSearchSearching(false)
    }
  }

  // Handle select audio
  const handleSelect = (audioId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(audioId)
    } else {
      newSelected.delete(audioId)
    }
    setSearchSelectedIds(newSelected)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!playlist) return

    if (checked) {
      const allIds = new Set(
        playlist.audios
          .filter((a) => !downloadedIds.has(a.id))
          .map((a) => a.id),
      )
      setSearchSelectedIds(allIds)
    } else {
      setSearchSelectedIds(new Set())
    }
  }

  // Handle download single audio
  const handleDownloadSingle = async (audio: Audio) => {
    if (downloadingIds.has(audio.id) || downloadedIds.has(audio.id)) return

    addSearchDownloadingId(audio.id)

    try {
      const localAudios = await download_audio(audio)

      if (localAudios.length > 0) {
        await addAudiosToConfig(localAudios)
        localAudios.forEach((a) => addSearchDownloadedId(a.audio.id))
        setSearchMessageToShow({
          type: "success",
          text: `Downloaded: ${audio.title}`,
        })
      }
    } catch (error) {
      console.error("Download failed:", error)
      addSearchFailedId(audio.id)
      setSearchMessageToShow({
        type: "error",
        text: `Failed to download: ${audio.title}`,
      })
    } finally {
      removeSearchDownloadingId(audio.id)
    }
  }

  // Handle download all selected
  const handleDownloadAll = async () => {
    if (!playlist || selectedIds.size === 0) {
      setSearchMessageToShow({
        type: "warning",
        text: "Please select audio to download",
      })
      return
    }

    setSearchDownloadingAll(true)

    const selectedAudios = playlist.audios.filter((a) => selectedIds.has(a.id))
    let successCount = 0
    const downloadedLocalAudios: LocalAudio[] = []

    for (const audio of selectedAudios) {
      if (downloadedIds.has(audio.id)) continue

      addSearchDownloadingId(audio.id)

      try {
        const localAudios = await download_audio(audio)
        if (localAudios.length > 0) {
          downloadedLocalAudios.push(...localAudios)
          localAudios.forEach((a) => addSearchDownloadedId(a.audio.id))
          successCount++
        }
      } catch (error) {
        console.error(`Download failed for ${audio.title}:`, error)
        addSearchFailedId(audio.id)
      } finally {
        removeSearchDownloadingId(audio.id)
      }
    }

    // Determine if we should create a playlist
    const shouldCreatePlaylist =
      downloadedLocalAudios.length > 0 && playlist && playlist.audios.length > 1

    if (shouldCreatePlaylist) {
      // Download playlist cover if available
      let coverPath: string | null = null
      if (playlist.cover) {
        try {
          coverPath = await download_cover(playlist.cover, playlist.platform)
        } catch (error) {
          console.error("Failed to download playlist cover:", error)
        }
      }

      // Use playlist.id as the identifier if available, otherwise title
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()

      // Check if playlist already exists
      const existingPlaylist = playlists.find((p) => p.id === playlistId)

      let finalLocalAudios: LocalAudio[] = []

      if (existingPlaylist) {
        // Merge playlists: use new order, but keep existing LocalAudios and add new ones
        const existingAudioMap = new Map(
          existingPlaylist.audios.map((a) => [a.audio.id, a]),
        )

        finalLocalAudios = playlist.audios
          .map((audio) => {
            // Try to find in existing
            const existing = existingAudioMap.get(audio.id)
            if (existing) {
              return existing
            }
            // Try to find in newly downloaded
            const newDownloaded = downloadedLocalAudios.find(
              (a) => a.audio.id === audio.id,
            )
            if (newDownloaded) {
              return newDownloaded
            }
            // This shouldn't happen, but fallback
            return null
          })
          .filter(Boolean) as LocalAudio[]
      } else {
        // New playlist: use the order from playlist.audios, but only include downloaded ones
        const downloadedAudioMap = new Map(
          downloadedLocalAudios.map((a) => [a.audio.id, a]),
        )
        finalLocalAudios = playlist.audios
          .map((audio) => downloadedAudioMap.get(audio.id))
          .filter(Boolean) as LocalAudio[]
      }

      const localPlaylist: LocalPlaylist = {
        id: playlistId,
        cover_path: coverPath,
        cover: playlist.cover,
        audios: finalLocalAudios,
        platform: playlist.platform,
      }

      await addPlaylistToConfig(localPlaylist)
      setSearchMessageToShow({
        type: "success",
        text: `${existingPlaylist ? "Updated" : "Created"} playlist: ${playlistId}`,
      })
    } else {
      // Only add to Main Audios list if it's a single track download (not a playlist)
      if (
        downloadedLocalAudios.length > 0 &&
        playlist &&
        playlist.audios.length === 1
      ) {
        await addAudiosToConfig(downloadedLocalAudios)
      }
    }

    // Reload config to refresh UI
    await loadConfig()

    setSearchSelectedIds(new Set())
    setSearchMessageToShow({
      type: "success",
      text: `Downloaded ${successCount}/${selectedAudios.length} tracks`,
    })
    setSearchDownloadingAll(false)
  }

  const allSelected =
    playlist &&
    playlist.audios.filter((a) => !downloadedIds.has(a.id)).length > 0 &&
    playlist.audios
      .filter((a) => !downloadedIds.has(a.id))
      .every((a) => selectedIds.has(a.id))

  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <Flex vertical className="page search-page" gap="middle">
      <Space.Compact style={{ width: "100%" }}>
        <Search
          placeholder="Paste audio/playlist URL here"
          allowClear
          value={url}
          onChange={(e) => {
            setSearchText(e.target.value)
          }}
          onSearch={handleSearch}
          loading={searching}
        />
      </Space.Compact>

      {playlist && !searching && (
        <>
          <Flex vertical className="audio-list" gap="small">
            {/* List Header Info */}
            <Text type="secondary" className="search-result-info">
              Found {playlist.audios.length} tracks
            </Text>

            {/* Playlist Info Card */}
            {playlist.title && playlist.audios.length > 1 && (
              <Flex align="center" gap="middle" className="audio-card">
                <Avatar
                  src={playlistCoverUrl || DEFAULT_COVER_URL}
                  icon={<AudioOutlined />}
                  size={56}
                  shape="square"
                  alt={playlist.title}
                  className="audio-cover"
                />
                <Flex vertical flex={1} style={{ minWidth: 0 }}>
                  <Text
                    strong
                    ellipsis={{ tooltip: playlist.title }}
                    className="audio-title"
                  >
                    {playlist.title}
                  </Text>
                  <Text type="secondary" className="audio-platform">
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

          {/* Bottom Action Bar */}
          <Flex
            align="center"
            justify="space-between"
            className="search-bottom-bar"
          >
            <Checkbox
              checked={!!allSelected}
              indeterminate={someSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
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
              {(() => {
                const downloadedCount = Array.from(selectedIds).filter((id) =>
                  downloadedIds.has(id),
                ).length
                return `Download ${downloadedCount} / ${selectedIds.size}`
              })()}
            </Button>
          </Flex>
        </>
      )}

      {!playlist && !searching && (
        <Flex flex={1} align="center" justify="center" className="empty-state">
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
