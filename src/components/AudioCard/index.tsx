import { FC, memo, useCallback, ReactNode } from "react"
import { Flex, Typography, Avatar, Badge } from "antd"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"

const { Text } = Typography

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
const formatDuration = (seconds?: number): string | null => {
  if (!seconds || seconds <= 0) return null

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

interface AudioCardProps {
  // Cover
  coverPath?: string | null // Local cover path
  coverUrl?: string // Remote cover URL
  platform: string // Platform name (required)

  // Display info
  title: string
  subtitle?: string // Secondary info (e.g., "Platform · Extra info")
  icon?: ReactNode // Avatar icon (default: AudioOutlined)
  duration?: number // Audio duration in seconds (optional)
  warnLongDuration?: boolean // Show warning color for long duration (>30min)

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
    duration,
    warnLongDuration = false,
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

    // Format duration
    const formattedDuration = formatDuration(duration)

    // Check if duration is too long (>30 minutes = 1800 seconds)
    const isLongDuration = warnLongDuration && duration && duration > 1800

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
        // FIXME: Displayed in the bottom left corner of the image, perhaps a responsive layout should be used.
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

          {/* Second row: Subtitle + Duration + Extra info */}
          {(subtitle || formattedDuration || extraInfo) && (
            <Flex align="center" gap="small">
              {subtitle && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {subtitle}
                </Text>
              )}
              {formattedDuration && (
                <>
                  {subtitle && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ·
                    </Text>
                  )}
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                      color: isLongDuration ? "#faad14" : undefined,
                    }}
                  >
                    {formattedDuration}
                  </Text>
                </>
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
