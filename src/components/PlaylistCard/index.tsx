import { FC, useState, useEffect } from "react"
import { DEFAULT_COVER_URL, get_web_url, LocalPlaylist } from "../../api"

interface PlaylistCardProps {
  playlist: LocalPlaylist
  onClick?: () => void
}

// Playlist card component showing cover and info
export const PlaylistCard: FC<PlaylistCardProps> = ({ playlist, onClick }) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadCover = async () => {
      if (playlist.cover_path) {
        try {
          const url = await get_web_url(playlist.cover_path)
          setCoverUrl(url)
        } catch (error) {
          console.error("Failed to load playlist cover:", error)
        }
      } else if (playlist.cover) {
        setCoverUrl(playlist.cover)
      }
    }
    loadCover()
  }, [playlist.cover_path, playlist.cover])

  const audioCount = playlist.audios?.length || 0

  return (
    <div
      className="playlist-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.()
        }
      }}
    >
      <div className="playlist-cover">
        <img src={coverUrl || DEFAULT_COVER_URL} alt={playlist.id} />
      </div>
      <div className="playlist-info">
        <div className="playlist-title">{playlist.id}</div>
        <div className="playlist-meta">
          {audioCount} tracks · {playlist.platform}
        </div>
      </div>
    </div>
  )
}

export default PlaylistCard
