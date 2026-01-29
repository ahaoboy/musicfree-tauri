import { FC, useCallback, MouseEvent, useMemo } from "react"
import { Button } from "@mui/material"
import { Favorite, FavoriteBorder } from "@mui/icons-material"
import { LocalAudio } from "../../api"
import { useAppStore } from "../../store"

interface FavoriteButtonProps {
  /** Audio to favorite/unfavorite */
  audio: LocalAudio | null | undefined
  variant?: "text" | "outlined" | "contained"
  color?:
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "medium" | "large"
  /** Icon font size */
  iconSize?: number
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Custom onClick handler */
  onClick?: (e: MouseEvent, isFavorited: boolean) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * FavoriteButton - Uses AdaptiveButton for cross-platform reliability.
 */
export const FavoriteButton: FC<FavoriteButtonProps> = ({
  audio,
  variant = "text",
  color = "inherit",
  className,
  size,
  iconSize,
  stopPropagation = false,
  onClick,
  disabled,
}) => {
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)
  const isFavorited = useAppStore(
    (state) => audio && state.isFavoritedAudio(audio.audio.id),
  )

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      if (audio) {
        toggleFavorite(audio)
        onClick?.(e, !isFavorited)
      }
    },
    [audio, toggleFavorite, isFavorited, onClick, stopPropagation],
  )

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  const buttonSize = useMemo(() => {
    if (size === "small") return 28
    if (size === "large") return 40
    return 32
  }, [size])

  if (!audio) {
    return null
  }

  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      sx={{
        minWidth: 0,
        p: 0,
        width: buttonSize,
        height: buttonSize,
        borderRadius: 1,
      }}
    >
      {isFavorited ? (
        <Favorite style={{ ...iconStyle, color: "#ff4d4f" }} />
      ) : (
        <FavoriteBorder style={iconStyle} />
      )}
    </Button>
  )
}

export default FavoriteButton
