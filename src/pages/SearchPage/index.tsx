import { DownloadOutlined, AudioOutlined } from "@ant-design/icons"
import {
  App,
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

interface AudioItemProps {
  audio: Audio
  coverUrl: string | null
  selected: boolean
  downloading: boolean
  downloaded: boolean
  onSelect: (checked: boolean) => void
  onDownload: () => void
}

// Memoized AudioItem component to prevent unnecessary re-renders
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

    const handleCheckboxChange = useCallback(
      (e: any) => {
        onSelect(e.target.checked)
      },
      [onSelect],
    )

    const handleDownloadClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onDownload()
      },
      [onDownload],
    )

    return (
      <Flex className="audio-card-selectable" align="center" gap="middle">
        <Checkbox
          checked={selected}
          onChange={handleCheckboxChange}
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
          onClick={handleDownloadClick}
        />
      </Flex>
    )
  },
)

AudioItem.displayName = "AudioItem"

// Search page - search and download audio content
export const SearchPage: FC = () => {
  const { message } = App.useApp()

  // Selective store subscriptions
  const url = useAppStore((state) => state.searchText)
  const playlist = useAppStore((state) => state.searchPlaylist)
  const selectedIds = useAppStore((state) => state.searchSelectedIds)
  const downloadingIds = useAppStore((state) => state.searchDownloadingIds)
  const downloadedIds = useAppStore((state) => state.searchDownloadedIds)
  const searching = useAppStore((state) => state.searchSearching)
  const downloadingAll = useAppStore((state) => state.searchDownloadingAll)
  const messageToShow = useAppStore((state) => state.searchMessageToShow)
  const coverUrls = useAppStore((state) => state.searchCoverUrls)
  const playlistCoverUrl = useAppStore((state) => state.searchPlaylistCoverUrl)
  const playlists = useAppStore((state) => state.config.playlists)

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
  const setSearchSearching = useAppStore((state) => state.setSearchSearching)
  const setSearchDownloadingAll = useAppStore(
    (state) => state.setSearchDownloadingAll,
  )
  const setSearchMessageToShow = useAppStore(
    (state) => state.setSearchMessageToShow,
  )
  const setSearchCoverUrls = useAppStore((state) => state.setSearchCoverUrls)
  const addSearchCoverUrl = useAppStore((state) => state.addSearchCoverUrl)
  const setSearchPlaylistCoverUrl = useAppStore(
    (state) => state.setSearchPlaylistCoverUrl,
  )
  const clearSearchRuntimeData = useAppStore(
    (state) => state.clearSearchRuntimeData,
  )
  const addAudiosToConfig = useAppStore((state) => state.addAudiosToConfig)
  const addPlaylistToConfig = useAppStore((state) => state.addPlaylistToConfig)
  const loadConfig = useAppStore((state) => state.loadConfig)

  // Handle messages
  useEffect(() => {
    if (messageToShow) {
      const { type, text } = messageToShow
      message[type](text)
      setSearchMessageToShow(null)
    }
  }, [messageToShow, message, setSearchMessageToShow])

  // Clear search results when URL is empty
  useEffect(() => {
    if (!url.trim()) {
      clearSearchRuntimeData()
    }
  }, [url, clearSearchRuntimeData])

  // Download and cache cover - Fixed to handle concurrent updates
  const downloadAndCacheCover = useCallback(
    async (
      coverUrl: string | undefined,
      platform: string,
      audioId?: string,
    ): Promise<string | null> => {
      if (!coverUrl) return null

      try {
        const localPath = await download_cover(coverUrl, platform)
        if (!localPath) return null

        const webUrl = await get_web_url(localPath)

        if (audioId) {
          // Use new method to avoid race conditions
          addSearchCoverUrl(audioId, webUrl)
        }

        return webUrl
      } catch (error) {
        console.error("Failed to download cover:", error)
        return null
      }
    },
    [addSearchCoverUrl],
  )

  // Handle search
  const handleSearch = useCallback(async () => {
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

      if (!useAppStore.getState().searchText.trim()) {
        return
      }

      setSearchPlaylist(result)
      setSearchMessageToShow({
        type: "success",
        text: `Found ${result.audios.length} tracks`,
      })

      // Check existing audios
      const existingLocalAudios: LocalAudio[] = []

      for (const audio of result.audios) {
        const audioPath = await exists_audio(audio)
        if (audioPath) {
          let coverPath: string | null = null
          if (audio.cover) {
            coverPath = await exists_cover(audio.cover, audio.platform)
            if (coverPath) {
              const webUrl = await get_web_url(coverPath)
              addSearchCoverUrl(audio.id, webUrl)
            }
          }
          existingLocalAudios.push({
            audio,
            path: audioPath,
            cover_path: coverPath,
          })
          addSearchDownloadedId(audio.id)
        }
      }

      if (existingLocalAudios.length > 0 && result.audios.length === 1) {
        await addAudiosToConfig(existingLocalAudios)
      }

      // Download covers in background
      if (result.cover) {
        downloadAndCacheCover(result.cover, result.platform).then((webUrl) => {
          if (webUrl) setSearchPlaylistCoverUrl(webUrl)
        })
      }

      result.audios.forEach((audio) => {
        if (audio.cover && !downloadedIds.has(audio.id)) {
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
  }, [
    url,
    setSearchSearching,
    setSearchPlaylist,
    setSearchSelectedIds,
    setSearchCoverUrls,
    setSearchPlaylistCoverUrl,
    setSearchMessageToShow,
    addSearchDownloadedId,
    addSearchCoverUrl,
    downloadAndCacheCover,
    addAudiosToConfig,
    downloadedIds,
  ])

  // Handle select audio
  const handleSelect = useCallback(
    (audioId: string, checked: boolean) => {
      const newSelected = new Set(selectedIds)
      if (checked) {
        newSelected.add(audioId)
      } else {
        newSelected.delete(audioId)
      }
      setSearchSelectedIds(newSelected)
    },
    [selectedIds, setSearchSelectedIds],
  )

  // Handle select all
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!playlist) return

      if (checked) {
        // Select all audios (including downloaded ones)
        const allIds = new Set(playlist.audios.map((a) => a.id))
        setSearchSelectedIds(allIds)
      } else {
        setSearchSelectedIds(new Set())
      }
    },
    [playlist, setSearchSelectedIds],
  )

  // Handle download single
  const handleDownloadSingle = useCallback(
    async (audio: Audio) => {
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
    },
    [
      downloadingIds,
      downloadedIds,
      addSearchDownloadingId,
      removeSearchDownloadingId,
      addSearchDownloadedId,
      addSearchFailedId,
      setSearchMessageToShow,
      addAudiosToConfig,
    ],
  )

  // Handle download all
  const handleDownloadAll = useCallback(async () => {
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
    let skippedCount = 0
    const downloadedLocalAudios: LocalAudio[] = []
    const alreadyDownloadedAudios: LocalAudio[] = []

    // Collect already downloaded audios from config
    const configAudios = useAppStore.getState().config.audios

    for (const audio of selectedAudios) {
      if (downloadedIds.has(audio.id)) {
        // Find the already downloaded audio in config
        const existingAudio = configAudios.find((a) => a.audio.id === audio.id)
        if (existingAudio) {
          alreadyDownloadedAudios.push(existingAudio)
          skippedCount++
        }
        continue
      }

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

    // Combine newly downloaded and already downloaded audios
    const allLocalAudios = [
      ...downloadedLocalAudios,
      ...alreadyDownloadedAudios,
    ]

    const shouldCreatePlaylist =
      allLocalAudios.length > 0 && playlist && playlist.audios.length > 1

    if (shouldCreatePlaylist) {
      let coverPath: string | null = null
      if (playlist.cover) {
        try {
          coverPath = await download_cover(playlist.cover, playlist.platform)
        } catch (error) {
          console.error("Failed to download playlist cover:", error)
        }
      }

      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()

      const existingPlaylist = playlists.find((p) => p.id === playlistId)

      let finalLocalAudios: LocalAudio[] = []

      if (existingPlaylist) {
        const existingAudioMap = new Map(
          existingPlaylist.audios.map((a) => [a.audio.id, a]),
        )

        finalLocalAudios = playlist.audios
          .map((audio) => {
            const existing = existingAudioMap.get(audio.id)
            if (existing) return existing

            const newDownloaded = allLocalAudios.find(
              (a) => a.audio.id === audio.id,
            )
            if (newDownloaded) return newDownloaded

            return null
          })
          .filter(Boolean) as LocalAudio[]
      } else {
        const allAudioMap = new Map(allLocalAudios.map((a) => [a.audio.id, a]))
        finalLocalAudios = playlist.audios
          .map((audio) => allAudioMap.get(audio.id))
          .filter(Boolean) as LocalAudio[]
      }

      const localPlaylist: LocalPlaylist = {
        id: playlistId,
        title: playlist.title,
        cover_path: coverPath,
        cover: playlist.cover,
        audios: finalLocalAudios,
        platform: playlist.platform,
      }

      await addPlaylistToConfig(localPlaylist)
    } else if (
      downloadedLocalAudios.length > 0 &&
      playlist &&
      playlist.audios.length === 1
    ) {
      await addAudiosToConfig(downloadedLocalAudios)
    }

    await loadConfig()

    setSearchSelectedIds(new Set())

    // Show single consolidated success message
    const playlistName = playlist.title || playlist.id || "playlist"
    if (shouldCreatePlaylist) {
      const action = playlists.find(
        (p) =>
          p.id === (playlist.id || playlist.title || new Date().toISOString()),
      )
        ? "Updated"
        : "Created"
      const parts = []
      if (successCount > 0) parts.push(`${successCount} new`)
      if (skippedCount > 0) parts.push(`${skippedCount} existing`)
      const summary = parts.length > 0 ? ` (${parts.join(", ")})` : ""
      setSearchMessageToShow({
        type: "success",
        text: `${action} playlist "${playlistName}"${summary}`,
      })
    } else {
      setSearchMessageToShow({
        type: "success",
        text: `Downloaded ${successCount} track${successCount !== 1 ? "s" : ""}`,
      })
    }

    setSearchDownloadingAll(false)
  }, [
    playlist,
    selectedIds,
    downloadedIds,
    playlists,
    setSearchDownloadingAll,
    setSearchMessageToShow,
    setSearchSelectedIds,
    addSearchDownloadingId,
    removeSearchDownloadingId,
    addSearchDownloadedId,
    addSearchFailedId,
    addAudiosToConfig,
    addPlaylistToConfig,
    loadConfig,
  ])

  // Memoize selection state
  const { allSelected, someSelected, downloadButtonText } = useMemo(() => {
    const allAudios = playlist ? playlist.audios : []

    const all =
      allAudios.length > 0 && allAudios.every((a) => selectedIds.has(a.id))

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

    return {
      allSelected: all,
      someSelected: some,
      downloadButtonText: text,
    }
  }, [playlist, selectedIds, downloadedIds])

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
