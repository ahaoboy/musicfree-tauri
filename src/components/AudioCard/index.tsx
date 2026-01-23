import { FC, memo, useCallback } from "react"
import { Flex, Typography, Avatar, Button } from "antd"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
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

    const handleClick = useCallback(
      (e: React.MouseEvent | React.KeyboardEvent) => {
        if ("key" in e && e.key !== "Enter" && e.key !== " ") return
        onClick?.()
      },
      [onClick],
    )

    const handleActionClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onAction?.()
      },
      [onAction],
    )

    return (
      <Flex
        className="audio-card"
        onClick={onClick ? handleClick : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleClick : undefined}
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
          className="card-avatar"
        />
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Text strong ellipsis>
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
            onClick={onAction ? handleActionClick : undefined}
            style={{ flexShrink: 0 }}
          />
        )}
      </Flex>
    )
  },
)

AudioCard.displayName = "AudioCard"

export default AudioCard
