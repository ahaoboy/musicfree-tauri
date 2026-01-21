import { FC, useState, useEffect } from "react"
import { Button, Input, Checkbox, App, Space } from "antd"
import { DownloadOutlined } from "@ant-design/icons"
import {
  extract_audios,
  download_audio,
  download_cover,
  get_loacl_url,
  Audio,
  Playlist,
  LocalAudio,
  LocalPlaylist,
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

  // Cover URL cache: audio id -> web accessible URL
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({})
  const [playlistCoverUrl, setPlaylistCoverUrl] = useState<string | null>(null)

  const { audios, addAudiosToConfig, addPlaylistToConfig, loadConfig } =
    useAppStore()

  // Mark already downloaded audios
  useEffect(() => {
    const downloaded = new Set(audios.map((a) => a.audio.id))
    setDownloadedIds(downloaded)
  }, [audios])

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
      message.warning("Please enter a URL")
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
      message.success(`Found ${result.audios.length} tracks`)

      // Download playlist cover
      if (result.cover) {
        downloadAndCacheCover(result.cover, result.platform).then((webUrl) => {
          if (webUrl) {
            setPlaylistCoverUrl(webUrl)
          }
        })
      }

      // Download audio covers in background
      result.audios.forEach((audio) => {
        if (audio.cover) {
          downloadAndCacheCover(audio.cover, audio.platform, audio.id)
        }
      })
    } catch (error) {
      console.error("Search failed:", error)
      message.error("Search failed. Please check the URL.")
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
        message.success(`Downloaded: ${audio.title}`)
      }
    } catch (error) {
      console.error("Download failed:", error)
      message.error(`Failed to download: ${audio.title}`)
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
      message.warning("Please select audio to download")
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

      // Create local playlist
      // Use playlist.id as the identifier if available, otherwise title
      const playlistId =
        playlist.id || playlist.title || new Date().toISOString()

      const localPlaylist: LocalPlaylist = {
        id: playlistId,
        cover_path: coverPath,
        cover: playlist.cover,
        audios: downloadedLocalAudios,
        platform: playlist.platform,
      }

      await addPlaylistToConfig(localPlaylist)
      message.success(`Created playlist: ${playlistId}`)
    } else {
      // Only add to Main Audios list if we didn't create a playlist
      if (downloadedLocalAudios.length > 0) {
        await addAudiosToConfig(downloadedLocalAudios)
      }
    }

    // Reload config to refresh UI
    await loadConfig()

    setSelectedIds(new Set())
    message.success(
      `Downloaded ${successCount}/${selectedAudios.length} tracks`,
    )
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
