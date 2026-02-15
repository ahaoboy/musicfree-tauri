import { FC, memo, useCallback, ReactNode } from "react"
import { Box, Typography, Avatar, Badge, Card } from "@mui/material"
import { Audiotrack, Check, Favorite } from "@mui/icons-material"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"
import { PlatformIcon } from "../PlatformIcon"
import { isLongDuration } from "../../utils/audio"
import { cardHoverEffect } from "../../hooks/useTheme"

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

  /** Additional sx */
  sx?: any
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
    icon = <Audiotrack />,
    duration,
    warnLongDuration = false,
    showPlatformIcon = true,
    avatarSize,
    showBorder = true,
    onClick,
    active = false,
    isFavorite = false,
    badge,
    extraInfo,
    actions,
    sx: extraSx,
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
        variant="rounded"
        sx={{
          width: avatarSize ?? ((theme: any) => theme.custom.avatarSize.md),
          height: avatarSize ?? ((theme: any) => theme.custom.avatarSize.md),
          flexShrink: 0,
          transition: (theme) => `transform ${theme.custom.transition.normal}`,
        }}
        alt={title}
      >
        {icon}
      </Avatar>
    )

    const avatarWithBadge = badge?.show ? (
      <Badge
        badgeContent={
          badge.icon ?? (
            <Box
              sx={{
                bgcolor: "success.main",
                borderRadius: "50%",
                p: 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
              }}
            >
              <Check sx={{ fontSize: 12, color: "success.contrastText" }} />
            </Box>
          )
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        sx={{
          "& .MuiBadge-badge": {
            transform: badge.offset
              ? `translate(${badge.offset[0]}px, ${badge.offset[1]}px)`
              : "translate(-8px, 0px)",
          },
        }}
      >
        {avatarElement}
      </Badge>
    ) : (
      avatarElement
    )

    return (
      <Card
        onClick={onClick ? handleCardClick : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleCardClick : undefined}
        elevation={0}
        sx={{
          cursor: onClick ? "pointer" : "default",
          border: (theme) =>
            showBorder
              ? active
                ? `2px solid ${theme.palette.primary.main}`
                : `1px solid ${theme.palette.divider}`
              : "none",
          borderRadius: 3,
          p: 0.8,
          boxSizing: "border-box",
          ...cardHoverEffect(),
          ...extraSx,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", minWidth: 0 }}>
          {avatarWithBadge}

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Typography variant="body1" fontWeight="bold" noWrap>
              {title}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 0.5,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              {isFavorite ? (
                <Favorite
                  sx={{
                    fontSize: 14,
                    color: "error.main",
                  }}
                />
              ) : (
                showPlatformIcon && <PlatformIcon platform={platform} />
              )}

              {subtitle && (
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    color: "text.secondary",
                  }}
                >
                  {subtitle}
                </Typography>
              )}
              {formattedDuration && (
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    color: isLongDurationValue
                      ? "warning.main"
                      : "text.secondary",
                  }}
                >
                  {formattedDuration}
                </Typography>
              )}
              {extraInfo}
            </Box>
          </Box>

          {actions && (
            <Box
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}
            >
              {actions}
            </Box>
          )}
        </Box>
      </Card>
    )
  },
)

AudioCard.displayName = "AudioCard"

export default AudioCard
