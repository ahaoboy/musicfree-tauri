import { FC, memo, useCallback, ReactNode } from "react"
import { Flex, Typography, Avatar, Badge } from "antd"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"
import { PlatformIcon } from "../PlatformIcon"
import { isLongDuration } from "../../utils/audio"

const { Text } = Typography

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 * Uses spaces for padding instead of leading zeros for a cleaner look
 */
const formatDuration = (seconds?: number): string | null => {
  if (!seconds || seconds <= 0) return null

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    // Format: H:MM:SS or HH:MM:SS (no leading zero for hours)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  // Format: M:SS or MM:SS (no leading zero for minutes)
  // Pad with spaces to maintain consistent width (5 chars: "MM:SS")
  const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`
  return timeStr.padStart(5, " ")
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
  showPlatformIcon?: boolean // Show platform icon instead of text (default: true)

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
    showPlatformIcon = true,
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

    // Check if duration is too long using utility
    const isLongDurationValue = warnLongDuration && isLongDuration(duration)

    // Avatar element
    const avatarElement = (
      <Avatar
        src={finalCoverUrl}
        icon={icon}
        size={60}
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
          padding: "4px",
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

          {/* Second row: Platform Icon + Subtitle + Duration + Extra info */}
          <Flex align="center" gap="small">
            {/* Platform icon */}
            {showPlatformIcon && <PlatformIcon platform={platform} size={14} />}

            {subtitle && (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  fontFamily: "monospace", // Use monospace for consistent spacing
                  whiteSpace: "pre", // Preserve spaces
                }}
              >
                {subtitle}
              </Text>
            )}
            {formattedDuration && (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  color: isLongDurationValue ? "#faad14" : undefined,
                  fontFamily: "monospace", // Use monospace for consistent spacing
                  whiteSpace: "pre", // Preserve spaces
                }}
              >
                {formattedDuration}
              </Text>
            )}
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
