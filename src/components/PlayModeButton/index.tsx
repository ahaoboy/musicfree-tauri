import { FC, useCallback, useMemo, MouseEvent } from "react"
import { Button } from "@mui/material"
import { Repeat, RepeatOne, Shuffle, QueueMusic } from "@mui/icons-material"
import { useAppStore } from "../../store"
import type { PlayMode } from "../../api"
import { useAdaptiveSize, AdaptiveSize } from "../../hooks"

interface PlayModeButtonProps {
  /** Button variant */
  variant?: "text" | "outlined" | "contained"
  /** Button color */
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
  size?: AdaptiveSize
  /** Icon font size */
  iconSize?: number
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Custom onClick handler */
  onClick?: (e: MouseEvent, newMode: PlayMode) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * PlayModeButton - Uses AdaptiveButton for consistent interaction.
 */
export const PlayModeButton: FC<PlayModeButtonProps> = ({
  variant = "text",
  color = "inherit",
  className,
  size,
  iconSize,
  stopPropagation = false,
  onClick,
  disabled,
}) => {
  const currentPlayMode = useAppStore((state) => state.currentPlayMode)
  const togglePlayMode = useAppStore((state) => state.togglePlayMode)

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        e.stopPropagation()
      }

      togglePlayMode()

      const modes: PlayMode[] = [
        "sequence",
        "list-loop",
        "single-loop",
        "shuffle",
      ]
      const currentMode = currentPlayMode || "sequence"
      const currentIndex = modes.indexOf(currentMode)
      const newMode = modes[(currentIndex + 1) % modes.length]
      onClick?.(e, newMode)
    },
    [togglePlayMode, currentPlayMode, onClick, stopPropagation],
  )

  const {
    buttonSize,
    iconSize: finalIconSize,
    muiSize,
  } = useAdaptiveSize(size, iconSize)

  const iconStyle = { fontSize: finalIconSize }

  const modeIcon = useMemo(() => {
    switch (currentPlayMode) {
      case "sequence":
        return <QueueMusic style={iconStyle} />
      case "list-loop":
        return <Repeat style={iconStyle} />
      case "single-loop":
        return <RepeatOne style={iconStyle} />
      case "shuffle":
        return <Shuffle style={iconStyle} />
      default:
        return <QueueMusic style={iconStyle} />
    }
  }, [currentPlayMode, iconStyle])

  const ariaLabel = useMemo(() => {
    switch (currentPlayMode) {
      case "sequence":
        return "Play mode: Sequence"
      case "list-loop":
        return "Play mode: Loop playlist"
      case "single-loop":
        return "Play mode: Loop single track"
      case "shuffle":
        return "Play mode: Shuffle"
      default:
        return "Play mode"
    }
  }, [currentPlayMode])

  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleClick}
      className={className}
      size={muiSize}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{
        minWidth: 0,
        p: 0,
        width: buttonSize,
        height: buttonSize,
        borderRadius: 2,
      }}
    >
      {modeIcon}
    </Button>
  )
}

export default PlayModeButton
