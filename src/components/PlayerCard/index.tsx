import { FC, useState, useEffect, memo } from "react"
import { useNavigate } from "react-router-dom"
import {
  HeartFilled,
  HeartOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
} from "@ant-design/icons"
import { FAVORITE_PLAYLIST_ID, get_web_url, LocalAudio } from "../../api"
import { useAppStore } from "../../store"

interface PlayerCardProps {
  audio: LocalAudio | null
}

// Mini player card showing current audio with play/pause controls
export const PlayerCard: FC<PlayerCardProps> = memo(({ audio }) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const { isPlaying, togglePlay, toggleFavorite, playlists } = useAppStore()
  const navigate = useNavigate()

  // Check if favorited
  const isFavorited = audio
    ? playlists
      .find((p) => p.id === FAVORITE_PLAYLIST_ID)
      ?.audios.some((a) => a.audio.id === audio.audio.id)
    : false

  useEffect(() => {
    const loadCover = async () => {
      if (!audio) {
        setCoverUrl(null)
        return
      }

      if (audio.cover_path) {
        try {
          const url = await get_web_url(audio.cover_path)
          setCoverUrl(url)
        } catch (error) {
          console.error("Failed to load cover:", error)
        }
      } else if (audio.audio.cover) {
        setCoverUrl(audio.audio.cover)
      }
    }
    loadCover()
  }, [audio?.cover_path, audio?.audio.cover])

  if (!audio) {
    return null
  }

  const handleCardClick = () => {
    navigate("/player")
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePlay()
  }

  return (
    <div
      className="mini-player clickable"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick()
        }
      }}
    >
      <div className="player-cover">
        {coverUrl ? (
          <img src={coverUrl} alt={audio.audio.title} />
        ) : (
          <div className="cover-placeholder">
            {audio.audio.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="player-info">
        <div className="player-title">{audio.audio.title}</div>
        <div className="player-artist">{audio.audio.platform}</div>
      </div>
      <div className="player-controls">
        <button
          className="action-btn secondary"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(audio)
          }}
        >
          {isFavorited ? (
            <HeartFilled style={{ color: "#ff4d4f" }} />
          ) : (
            <HeartOutlined />
          )}
        </button>
        <button className="control-btn" onClick={handlePlayClick}>
          {isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
        </button>
      </div>
    </div>
  )
})

export default PlayerCard
