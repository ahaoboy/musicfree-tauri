import { FC, memo, useCallback, ReactNode } from "react"
import { Flex, Typography, Avatar, Badge } from "antd"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import { DEFAULT_COVER_URL, LocalAudio, Audio } from "../../api"
import { useCoverUrl } from "../../hooks"

const { Text } = Typography

interface AudioCardProps {
  // Audio data
  audio: LocalAudio | Audio

  // Cover
  coverUrl?: string | null // External cover URL (overrides internal hook)

  // Click behavior
  onClick?: () => void

  // Badge configuration
  badge?: {
    show: boolean // Whether to show badge
    icon?: ReactNode // Custom badge icon (default: CheckOutlined)
    offset?: [number, number] // Badge position offset
  }

  // Info section (second row)
  extraInfo?: ReactNode // Extra info after platform (e.g., status text)

  // Actions section (right side)
  actions?: ReactNode // Custom action buttons
}

// Helper to check if audio is LocalAudio
const isLocalAudio = (audio: LocalAudio | Audio): audio is LocalAudio => {
  return "path" in audio
}

// Audio info display card - Highly customizable and reusable
export const AudioCard: FC<AudioCardProps> = memo(
  ({
    audio,
    coverUrl: externalCoverUrl,
    onClick,
    badge,
    extraInfo,
    actions,
  }) => {
    // Use external coverUrl if provided, otherwise use hook for LocalAudio
    const hookCoverUrl = useCoverUrl(
      isLocalAudio(audio) ? audio.cover_path : null,
      isLocalAudio(audio) ? audio.audio.cover : audio.cover,
    )
    const finalCoverUrl = externalCoverUrl ?? hookCoverUrl

    const audioData = isLocalAudio(audio) ? audio.audio : audio

    const handleCardClick = useCallback(
      (e: React.MouseEvent | React.KeyboardEvent) => {
        if ("key" in e && e.key !== "Enter" && e.key !== " ") return
        onClick?.()
      },
      [onClick],
    )

    // Avatar element
    const avatarElement = (
      <Avatar
        src={finalCoverUrl || DEFAULT_COVER_URL}
        icon={<AudioOutlined />}
        size={56}
        shape="square"
        alt={audioData.title}
        className="card-avatar"
      />
    )

    // Wrap avatar with badge if needed
    const avatarWithBadge = badge?.show ? (
      <Badge
        count={
          badge.icon ?? (
            <CheckOutlined
              style={{
                color: "#fff",
                backgroundColor: "#52c41a",
                borderRadius: "50%",
                padding: "4px",
                fontSize: "12px",
              }}
            />
          )
        }
        offset={badge.offset ?? [-48, 48]}
      >
        {avatarElement}
      </Badge>
    ) : (
      avatarElement
    )

    return (
      <Flex
        className={badge?.show ? "audio-card-selectable" : "audio-card"}
        onClick={onClick ? handleCardClick : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleCardClick : undefined}
        align="center"
        gap="middle"
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        {/* Left: Avatar with optional Badge */}
        {avatarWithBadge}

        {/* Center: Info section */}
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          {/* First row: Title */}
          <Text strong ellipsis>
            {audioData.title}
          </Text>

          {/* Second row: Platform + Extra info */}
          <Flex align="center" gap="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {audioData.platform}
            </Text>
            {extraInfo}
          </Flex>
        </Flex>

        {/* Right: Actions */}
        {actions}
      </Flex>
    )
  },
)

AudioCard.displayName = "AudioCard"

export default AudioCard
