import { FC, memo, useCallback, ReactNode } from "react"
import { Flex, Typography, Avatar, Badge } from "antd"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import HeartFilled from "@ant-design/icons/HeartFilled"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"
import { PlatformIcon } from "../PlatformIcon"
import { isLongDuration } from "../../utils/audio"

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
  const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`
  return timeStr.padStart(5, " ")
}

interface AudioCardProps {
  // Cover
  coverPath?: string | null
  coverUrl?: string
  platform: string

  // Display info
  title: string
  subtitle?: string
  icon?: ReactNode
  duration?: number
  warnLongDuration?: boolean
  showPlatformIcon?: boolean

  // Click behavior
  onClick?: () => void

  // State
  active?: boolean
  showBorder?: boolean
  isFavorite?: boolean

  // Badge configuration
  badge?: {
    show: boolean
    icon?: ReactNode
    offset?: [number, number]
  }

  // Size configuration
  avatarSize?: number

  // Extra info section
  extraInfo?: ReactNode

  // Actions section
  actions?: ReactNode

  /** Additional className */
  className?: string
}

/**
 * Generic card component for displaying audio/playlist items
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
    avatarSize = 60,
    showBorder = true,
    onClick,
    active = false,
    isFavorite = false,
    badge,
    extraInfo,
    actions,
    className,
  }) => {
    const autoCoverUrl = useCoverUrl(coverPath, coverUrl, platform)
    const finalCoverUrl = autoCoverUrl || DEFAULT_COVER_URL

    const handleCardClick = useCallback(
      (e: React.MouseEvent | React.KeyboardEvent) => {
        if ("key" in e && e.key !== "Enter" && e.key !== " ") return
        onClick?.()
      },
      [onClick],
    )

    const formattedDuration = formatDuration(duration)
    const isLongDurationValue = warnLongDuration && isLongDuration(duration)

    const avatarElement = (
      <Avatar
        src={finalCoverUrl}
        icon={icon}
        size={avatarSize}
        shape="square"
        alt={title}
        className="card-avatar"
      />
    )

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
        offset={badge.offset ?? [-56, 56]}
      >
        {avatarElement}
      </Badge>
    ) : (
      avatarElement
    )

    return (
      <Flex
        className={[
          badge?.show ? "audio-card-selectable" : "audio-card",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick ? handleCardClick : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleCardClick : undefined}
        align="center"
        gap="middle"
        style={{
          cursor: onClick ? "pointer" : "default",
          border: showBorder
            ? active
              ? "2px solid #1890ff"
              : "2px solid transparent"
            : "none",
          borderRadius: "8px",
          padding: "4px",
          boxSizing: "border-box",
          transition: "all 0.3s ease",
        }}
      >
        {avatarWithBadge}

        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Text strong ellipsis>
            {title}
          </Text>

          <Flex align="center" gap="small">
            {isFavorite ? (
              <HeartFilled style={{ fontSize: 14, color: "#ff4d4f" }} />
            ) : (
              showPlatformIcon && <PlatformIcon platform={platform} size={14} />
            )}

            {subtitle && (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  fontFamily: "monospace",
                  whiteSpace: "pre",
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
                  fontFamily: "monospace",
                  whiteSpace: "pre",
                }}
              >
                {formattedDuration}
              </Text>
            )}
            {extraInfo}
          </Flex>
        </Flex>

        {actions}
      </Flex>
    )
  },
)

AudioCard.displayName = "AudioCard"

export default AudioCard
