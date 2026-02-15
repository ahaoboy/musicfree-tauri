import { FC, useCallback, MouseEvent } from "react"
import { Button } from "@mui/material"
import { SkipPrevious, SkipNext } from "@mui/icons-material"
import { useAppStore } from "../../store"
import { useAdaptiveSize, AdaptiveSize } from "../../hooks"

interface SkipButtonProps {
  /** Direction to skip */
  direction: "next" | "prev"
  /** Additional className */
  className?: string
  /** Button size */
  size?: AdaptiveSize
  /** Icon font size */
  iconSize?: number
  /** Stop event propagation */
  stopPropagation?: boolean
  variant?: "text" | "outlined" | "contained"
  color?:
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning"
  /** Custom onClick handler */
  onClick?: (e: MouseEvent, direction: "next" | "prev") => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * SkipButton - Uses AdaptiveButton for consistent skip behavior.
 */
export const SkipButton: FC<SkipButtonProps> = ({
  direction,
  variant = "text",
  color = "inherit",
  className,
  size,
  iconSize,
  stopPropagation = false,
  onClick,
  disabled,
}) => {
  const playNext = useAppStore((state) => state.playNext)
  const playPrev = useAppStore((state) => state.playPrev)
  const canPlayPrevValue = useAppStore((state) => state.canPlayPrev())

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      if (direction === "prev") {
        if (canPlayPrevValue) {
          playPrev()
        }
      } else {
        playNext()
      }
      onClick?.(e, direction)
    },
    [direction, playPrev, playNext, canPlayPrevValue, onClick, stopPropagation],
  )

  const {
    buttonSize,
    iconSize: finalIconSize,
    muiSize,
  } = useAdaptiveSize(size, iconSize)

  const iconStyle = { fontSize: finalIconSize }

  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleClick}
      className={className}
      size={muiSize}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous track" : "Next track"}
      sx={{
        minWidth: 0,
        p: 0,
        width: buttonSize,
        height: buttonSize,
        borderRadius: 2,
      }}
    >
      {direction === "prev" ? (
        <SkipPrevious style={iconStyle} />
      ) : (
        <SkipNext style={iconStyle} />
      )}
    </Button>
  )
}

export default SkipButton
