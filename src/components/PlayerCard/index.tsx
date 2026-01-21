import { FC, useState, useEffect, memo } from "react"
import { useNavigate } from "react-router-dom"
import {
  HeartFilled,
  HeartOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  AudioOutlined,
} from "@ant-design/icons"
import { Button, Flex, Typography, Avatar } from "antd"
import {
  DEFAULT_COVER_URL,
  FAVORITE_PLAYLIST_ID,
  get_web_url,
  LocalAudio,
} from "../../api"
import { useAppStore } from "../../store"

const { Text } = Typography

interface PlayerCardProps {
  audio: LocalAudio | null
}

// Mini player card showing current audio with play/pause controls
export const PlayerCard: FC<PlayerCardProps> = memo(({ audio }) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const {
    isPlaying,
    togglePlay,
    toggleFavorite,
    config: { playlists },
  } = useAppStore()

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
    <Flex
      className="mini-player clickable"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick()
        }
      }}
      align="center"
      gap="middle"
    >
      <Avatar
        src={coverUrl || DEFAULT_COVER_URL}
        icon={<AudioOutlined />}
        size={48}
        shape="square"
        alt={audio.audio.title}
        className="player-cover"
      />
      <Flex vertical flex={1} style={{ minWidth: 0 }}>
        <Text
          strong
          ellipsis={{ tooltip: audio.audio.title }}
          className="player-title"
        >
          {audio.audio.title}
        </Text>
        <Text
          type="secondary"
          ellipsis={{ tooltip: audio.audio.platform }}
          className="player-artist"
        >
          {audio.audio.platform}
        </Text>
      </Flex>
      <Flex className="player-controls" align="center" gap="small">
        <Button
          type="text"
          icon={
            isFavorited ? (
              <HeartFilled style={{ color: "#ff4d4f" }} />
            ) : (
              <HeartOutlined />
            )
          }
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(audio)
          }}
          className="action-btn secondary"
        />
        <Button
          type="text"
          icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
          onClick={handlePlayClick}
          className="control-btn"
        />
      </Flex>
    </Flex>
  )
})

export default PlayerCard
