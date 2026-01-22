import { FC, memo, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  HeartFilled,
  HeartOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  AudioOutlined,
} from "@ant-design/icons"
import { Button, Flex, Typography, Avatar } from "antd"
import { DEFAULT_COVER_URL, FAVORITE_PLAYLIST_ID, LocalAudio } from "../../api"
import { useAppStore } from "../../store"
import { useCoverUrl } from "../../hooks"

const { Text } = Typography

interface PlayerCardProps {
  audio: LocalAudio | null
}

// Mini player card - Optimized with memo and selective subscriptions
export const PlayerCard: FC<PlayerCardProps> = memo(({ audio }) => {
  const navigate = useNavigate()
  const coverUrl = useCoverUrl(audio?.cover_path, audio?.audio.cover)

  // Selective store subscriptions to avoid unnecessary re-renders
  const isPlaying = useAppStore((state) => state.isPlaying)
  const togglePlay = useAppStore((state) => state.togglePlay)
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)
  const playlists = useAppStore((state) => state.config.playlists)

  // Memoize favorite check
  const isFavorited = useMemo(
    () =>
      audio
        ? playlists
            .find((p) => p.id === FAVORITE_PLAYLIST_ID)
            ?.audios.some((a) => a.audio.id === audio.audio.id) || false
        : false,
    [audio, playlists],
  )

  const handleCardClick = useCallback(() => {
    navigate("/player")
  }, [navigate])

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      togglePlay()
    },
    [togglePlay],
  )

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (audio) {
        toggleFavorite(audio)
      }
    },
    [audio, toggleFavorite],
  )

  if (!audio) {
    return null
  }

  return (
    <Flex
      className="mini-player"
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
      style={{ cursor: "pointer" }}
    >
      <Avatar
        src={coverUrl || DEFAULT_COVER_URL}
        icon={<AudioOutlined />}
        size={48}
        shape="square"
        alt={audio.audio.title}
      />
      <Flex vertical flex={1} style={{ minWidth: 0 }}>
        <Text strong ellipsis={{ tooltip: audio.audio.title }}>
          {audio.audio.title}
        </Text>
        <Text type="secondary" ellipsis={{ tooltip: audio.audio.platform }}>
          {audio.audio.platform}
        </Text>
      </Flex>
      <Flex align="center" gap="small">
        <Button
          type="text"
          icon={
            isFavorited ? (
              <HeartFilled style={{ color: "#ff4d4f" }} />
            ) : (
              <HeartOutlined />
            )
          }
          onClick={handleFavoriteClick}
        />
        <Button
          type="primary"
          shape="circle"
          icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
          onClick={handlePlayClick}
          size="large"
        />
      </Flex>
    </Flex>
  )
})

PlayerCard.displayName = "PlayerCard"

export default PlayerCard
