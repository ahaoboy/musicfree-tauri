import { FC, useCallback, MouseEvent, useMemo } from "react"
import { Button } from "@mui/material"
import { PlayCircle, PauseCircle } from "@mui/icons-material"
import { useAppStore } from "../../store"

interface PlayButtonProps {
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
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Icon font size */
  iconSize?: number
  /** Override button box size (width/height) in px */
  boxSize?: number
  /** Custom onClick handler */
  onClick?: (e: MouseEvent, isisPlaying: boolean) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * PlayButton - Uses AdaptiveButton for cross-platform reliability.
 */
export const PlayButton: FC<PlayButtonProps> = ({
  variant = "text",
  color = "inherit",
  className,
  size,
  stopPropagation = false,
  iconSize,
  boxSize,
  onClick,
  disabled,
}) => {
  const isPlaying = useAppStore((state) => state.isPlaying)
  const togglePlay = useAppStore((state) => state.togglePlay)

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      togglePlay()
      onClick?.(e, !isPlaying)
    },
    [togglePlay, isPlaying, onClick, stopPropagation],
  )

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  const buttonSize = useMemo(() => {
    if (size === "small") return 28
    if (size === "large") return 40
    return 32
  }, [size])

  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      aria-label={isPlaying ? "Pause" : "Play"}
      sx={{
        minWidth: 0,
        p: 0,
        width: boxSize ?? buttonSize,
        height: boxSize ?? buttonSize,
        borderRadius: 1,
      }}
    >
      {isPlaying ? (
        <PauseCircle style={iconStyle} />
      ) : (
        <PlayCircle style={iconStyle} />
      )}
    </Button>
  )
}

export default PlayButton
