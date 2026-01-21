import { DownloadOutlined } from "@ant-design/icons"
import { App, Button, Checkbox, Input, Space } from "antd"
import { FC, useEffect, useState } from "react"
import {
  Audio,
  download_audio,
  download_cover,
  exists_audio,
  exists_cover,
  extract_audios,
  get_loacl_url,
  LocalAudio,
  LocalPlaylist,
  Playlist,
} from "../../api"
import { useAppStore } from "../../store"
import "./index.less"

const { Search } = Input

interface AudioItemProps {
  audio: Audio
  coverUrl: string | null
  selected: boolean
  downloading: boolean
  downloaded: boolean
  onSelect: (checked: boolean) => void
  onDownload: () => void
}

// Audio item component with checkbox and download button
const AudioItem: FC<AudioItemProps> = ({
  audio,
  coverUrl,
  selected,
  downloading,
  downloaded,
  onSelect,
  onDownload,
}) => {
  return (
    <div className="audio-card-selectable">
      <div className="checkbox-wrapper">
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={downloaded || downloading}
        />
      </div>
      <div className="audio-cover">
        {coverUrl ? (
          <img src={coverUrl} alt={audio.title} />
        ) : (
          <div className="cover-placeholder">
            {audio.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="audio-info">
        <div className="audio-title">{audio.title}</div>
        <div className="audio-meta">
          <span className="audio-platform">{audio.platform}</span>
          {downloaded && (
            <span style={{ color: "#10b981" }}> · Downloaded</span>
          )}
        </div>
      </div>
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
    </div>
  )
}

// Search page - search and download audio
export const SearchPage: FC = () => {
  const { message } = App.useApp()
  const [url, setUrl] = useState("")
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [messageToShow, setMessageToShow] = useState<{
    type: "success" | "error" | "warning"
    text: string
  } | null>(null)

  // Cover URL cache: audio id -> web accessible URL
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({})
  const [playlistCoverUrl, setPlaylistCoverUrl] = useState<string | null>(null)

  const {
    audios,
    playlists,
    addAudiosToConfig,
    addPlaylistToConfig,
    loadConfig,
  } = useAppStore()

  // Mark already downloaded audios
  useEffect(() => {
    const downloaded = new Set(audios.map((a) => a.audio.id))
    setDownloadedIds(downloaded)
  }, [audios])

  // Handle messages in effect to avoid React 18 concurrent mode issues
  useEffect(() => {
    if (messageToShow) {
      const { type, text } = messageToShow
      message[type](text)
      setMessageToShow(null)
    }
  }, [messageToShow, message])

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
      const webUrl = await get_loacl_url(localPath)

      // Cache the URL if audioId provided
      if (audioId) {
        setCoverUrls((prev) => ({ ...prev, [audioId]: webUrl }))
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
      setMessageToShow({ type: "warning", text: "Please enter a URL" })
      return
    }

    setSearching(true)
    setPlaylist(null)
    setSelectedIds(new Set())
    setCoverUrls({})
    setPlaylistCoverUrl(null)

    try {
      const result = await extract_audios(url)
      setPlaylist(result)
      setMessageToShow({
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
            if (coverPath) coverCache[audio.id] = await get_loacl_url(coverPath)
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
      setCoverUrls((prev) => ({ ...prev, ...coverCache }))
      // Add existing audios to config
      if (existingLocalAudios.length > 0) {
        await addAudiosToConfig(existingLocalAudios)
      }

      // Update downloaded ids
      setDownloadedIds(updatedDownloadedIds)

      // Download playlist cover
      if (result.cover) {
        downloadAndCacheCover(result.cover, result.platform).then((webUrl) => {
          if (webUrl) {
            setPlaylistCoverUrl(webUrl)
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
      setMessageToShow({
        type: "error",
        text: "Search failed. Please check the URL.",
      })
    } finally {
      setSearching(false)
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
    setSelectedIds(newSelected)
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
      setSelectedIds(allIds)
    } else {
      setSelectedIds(new Set())
    }
  }

  // Handle download single audio
  const handleDownloadSingle = async (audio: Audio) => {
    if (downloadingIds.has(audio.id) || downloadedIds.has(audio.id)) return

    setDownloadingIds((prev) => new Set(prev).add(audio.id))

    try {
      const localAudios = await download_audio(audio)

      if (localAudios.length > 0) {
        await addAudiosToConfig(localAudios)
        setDownloadedIds((prev) => {
          const newSet = new Set(prev)
          localAudios.forEach((a) => newSet.add(a.audio.id))
          return newSet
        })
        setMessageToShow({
          type: "success",
          text: `Downloaded: ${audio.title}`,
        })
      }
    } catch (error) {
      console.error("Download failed:", error)
      setMessageToShow({
        type: "error",
        text: `Failed to download: ${audio.title}`,
      })
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(audio.id)
        return newSet
      })
    }
  }

  // Handle download all selected
  const handleDownloadAll = async () => {
    if (!playlist || selectedIds.size === 0) {
      setMessageToShow({
        type: "warning",
        text: "Please select audio to download",
      })
      return
    }

    setDownloadingAll(true)

    const selectedAudios = playlist.audios.filter((a) => selectedIds.has(a.id))
    let successCount = 0
    const downloadedLocalAudios: LocalAudio[] = []

    for (const audio of selectedAudios) {
      if (downloadedIds.has(audio.id)) continue

      setDownloadingIds((prev) => new Set(prev).add(audio.id))

      try {
        const localAudios = await download_audio(audio)
        if (localAudios.length > 0) {
          downloadedLocalAudios.push(...localAudios)
          setDownloadedIds((prev) => {
            const newSet = new Set(prev)
            localAudios.forEach((a) => newSet.add(a.audio.id))
            return newSet
          })
          successCount++
        }
      } catch (error) {
        console.error(`Download failed for ${audio.title}:`, error)
      } finally {
        setDownloadingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(audio.id)
          return newSet
        })
      }
    }

    // Determine if we should create a playlist
    const shouldCreatePlaylist =
      downloadedLocalAudios.length > 0 &&
      playlist &&
      !!playlist.id &&
      playlist.audios.length > 1

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
      setMessageToShow({
        type: "success",
        text: `${existingPlaylist ? "Updated" : "Created"} playlist: ${playlistId}`,
      })
    } else {
      // Only add to Main Audios list if we didn't create a playlist
      if (downloadedLocalAudios.length > 0) {
        await addAudiosToConfig(downloadedLocalAudios)
      }
    }

    // Reload config to refresh UI
    await loadConfig()

    setSelectedIds(new Set())
    setMessageToShow({
      type: "success",
      text: `Downloaded ${successCount}/${selectedAudios.length} tracks`,
    })
    setDownloadingAll(false)
  }

  const allSelected =
    playlist &&
    playlist.audios.filter((a) => !downloadedIds.has(a.id)).length > 0 &&
    playlist.audios
      .filter((a) => !downloadedIds.has(a.id))
      .every((a) => selectedIds.has(a.id))

  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="page search-page">
      <div className="search-container">
        <Space.Compact style={{ width: "100%" }}>
          <Search
            placeholder="Paste audio/playlist URL here"
            allowClear
            value={url}
            onChange={(e) => {
              const val = e.target.value
              setUrl(val)
              if (!val) {
                setPlaylist(null)
                setSelectedIds(new Set())
                setCoverUrls({})
                setPlaylistCoverUrl(null)
              }
            }}
            onSearch={handleSearch}
            loading={searching}
          />
        </Space.Compact>
      </div>

      {playlist && !searching && (
        <>
          <div className="audio-list">
            {/* List Header Info */}
            <div className="search-result-info">
              Found {playlist.audios.length} tracks
            </div>

            {/* Playlist Info Card (Optional, keeping it simple for now or usage above) */}
            {/* If it's a playlist search, maybe show some info? */}
            {playlist.title && playlist.audios.length > 1 && (
              <div className="audio-card" style={{ marginBottom: 16 }}>
                <div className="audio-cover">
                  {playlistCoverUrl ? (
                    <img src={playlistCoverUrl} alt={playlist.title} />
                  ) : (
                    <div className="cover-placeholder">
                      {playlist.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="audio-info">
                  <div className="audio-title">{playlist.title}</div>
                  <div className="audio-meta">
                    <span className="audio-platform">{playlist.platform}</span>
                  </div>
                </div>
              </div>
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
          </div>

          {/* Bottom Action Bar */}
          <div className="search-bottom-bar">
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
              Download ({selectedIds.size})
            </Button>
          </div>
        </>
      )}

      {!playlist && !searching && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
        </div>
      )}
    </div>
  )
}

export default SearchPage
