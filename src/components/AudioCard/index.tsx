import { FC, memo, useMemo } from "react"
import { Flex, Typography, Avatar, Button } from "antd"
import { AudioOutlined } from "@ant-design/icons"
import { DEFAULT_COVER_URL, LocalAudio } from "../../api"
import { useCoverUrl } from "../../hooks"

const { Text } = Typography

interface AudioCardProps {
  audio: LocalAudio
  onClick?: () => void
  showAction?: boolean
  actionIcon?: React.ReactNode
  onAction?: () => void
}

// Audio info display card - Optimized with memo and hooks
export const AudioCard: FC<AudioCardProps> = memo(
  ({ audio, onClick, showAction = false, actionIcon, onAction }) => {
    const coverUrl = useCoverUrl(audio.cover_path, audio.audio.cover)

    const handleClick = useMemo(
      () =>
        onClick
          ? (e: React.MouseEvent | React.KeyboardEvent) => {
              if ("key" in e && e.key !== "Enter" && e.key !== " ") return
              onClick()
            }
          : undefined,
      [onClick],
    )

    const handleActionClick = useMemo(
      () =>
        onAction
          ? (e: React.MouseEvent) => {
              e.stopPropagation()
              onAction()
            }
          : undefined,
      [onAction],
    )

    return (
      <Flex
        className="audio-card"
        onClick={handleClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={handleClick}
        align="center"
        gap="middle"
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <Avatar
          src={coverUrl || DEFAULT_COVER_URL}
          icon={<AudioOutlined />}
          size={56}
          shape="square"
          alt={audio.audio.title}
        />
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Text strong ellipsis={{ tooltip: audio.audio.title }}>
            {audio.audio.title}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {audio.audio.platform}
          </Text>
        </Flex>
        {showAction && actionIcon && (
          <Button
            type="text"
            icon={actionIcon}
            onClick={handleActionClick}
            style={{ flexShrink: 0 }}
          />
        )}
      </Flex>
    )
  },
)

AudioCard.displayName = "AudioCard"

export default AudioCard
