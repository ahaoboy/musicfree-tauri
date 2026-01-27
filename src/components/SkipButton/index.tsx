import { FC, useCallback, MouseEvent } from "react"
import StepBackwardOutlined from "@ant-design/icons/StepBackwardOutlined"
import StepForwardOutlined from "@ant-design/icons/StepForwardOutlined"
import { useAppStore } from "../../store"
import { AdaptiveButton } from "../AdaptiveButton"

interface SkipButtonProps {
  /** Direction to skip */
  direction: "next" | "prev"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Icon font size */
  iconSize?: number
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
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
  type = "text",
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
      if (direction === "prev") {
        if (canPlayPrevValue) {
          playPrev()
        }
      } else {
        playNext()
      }
      onClick?.(e as any, direction)
    },
    [direction, playPrev, playNext, canPlayPrevValue, onClick],
  )

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  return (
    <AdaptiveButton
      type={type}
      icon={
        direction === "prev" ? (
          <StepBackwardOutlined style={iconStyle} />
        ) : (
          <StepForwardOutlined style={iconStyle} />
        )
      }
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      stopPropagation={stopPropagation}
      iconSize={iconSize}
      aria-label={direction === "prev" ? "Previous track" : "Next track"}
    />
  )
}

export default SkipButton
