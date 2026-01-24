import { FC, memo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import { Flex, Typography, Avatar } from "antd"
import { DEFAULT_COVER_URL, LocalAudio } from "../../api"
import { useCoverUrl } from "../../hooks"
import { PlayerControls } from "../PlayerControls"

const { Text } = Typography

interface PlayerCardProps {
  audio: LocalAudio | null
}

// Mini player card - Optimized with memo and selective subscriptions
export const PlayerCard: FC<PlayerCardProps> = memo(({ audio }) => {
  const navigate = useNavigate()
  const coverUrl = useCoverUrl(
    audio?.cover_path,
    audio?.audio.cover,
    audio?.audio.platform,
  )

  const handleCardClick = useCallback(() => {
    navigate("/player")
  }, [navigate])

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
        <Text strong ellipsis>
          {audio.audio.title}
        </Text>
        <Text type="secondary" ellipsis>
          {audio.audio.platform}
        </Text>
      </Flex>
      <PlayerControls
        audio={audio}
        layout="mini"
        buttonClassName="mini-player-btn"
        gap="small"
      />
    </Flex>
  )
})

PlayerCard.displayName = "PlayerCard"

export default PlayerCard
