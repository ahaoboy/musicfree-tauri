import { FC, memo, useCallback, ReactNode } from "react"
import { Flex, Typography, Avatar, Badge } from "antd"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"

const { Text } = Typography

interface AudioCardProps {
  // Cover
  coverPath?: string | null // Local cover path
  coverUrl?: string // Remote cover URL
  platform: string // Platform name (required)

  // Display info
  title: string
  subtitle?: string // Secondary info (e.g., "Platform · Extra info")
  icon?: ReactNode // Avatar icon (default: AudioOutlined)

  // Click behavior
  onClick?: () => void

  // State
  active?: boolean // Whether the card is active/selected/highlighted

  // Badge configuration
  badge?: {
    show: boolean // Whether to show badge
    icon?: ReactNode // Custom badge icon (default: CheckOutlined)
    offset?: [number, number] // Badge position offset
  }

  // Extra info section (after subtitle)
  extraInfo?: ReactNode

  // Actions section (right side)
  actions?: ReactNode
}

/**
 * Generic card component for displaying audio/playlist items
 * Highly customizable and reusable across different contexts
 */
export const AudioCard: FC<AudioCardProps> = memo(
  ({
    coverPath,
    coverUrl,
    platform,
    title,
    subtitle,
    icon = <AudioOutlined />,
    onClick,
    active = false,
    badge,
    extraInfo,
    actions,
  }) => {
    // Auto-download and cache cover
    const autoCoverUrl = useCoverUrl(coverPath, coverUrl, platform)
    const finalCoverUrl = autoCoverUrl || DEFAULT_COVER_URL

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
        src={finalCoverUrl}
        icon={icon}
        size={56}
        shape="square"
        alt={title}
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
        offset={badge.offset ?? [8, 48]}
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
        style={{
          cursor: onClick ? "pointer" : "default",
          border: active ? "2px solid #1890ff" : "2px solid transparent",
          borderRadius: "8px",
          padding: "10px",
          boxSizing: "border-box",
          transition: "all 0.3s ease",
        }}
      >
        {/* Left: Avatar with optional Badge */}
        {avatarWithBadge}

        {/* Center: Info section */}
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          {/* First row: Title */}
          <Text strong ellipsis>
            {title}
          </Text>

          {/* Second row: Subtitle + Extra info */}
          {(subtitle || extraInfo) && (
            <Flex align="center" gap="small">
              {subtitle && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {subtitle}
                </Text>
              )}
              {extraInfo}
            </Flex>
          )}
        </Flex>

        {/* Right: Actions */}
        {actions}
      </Flex>
    )
  },
)

AudioCard.displayName = "AudioCard"

export default AudioCard
