import { FC, useCallback, MouseEvent } from "react"
import { Button } from "antd"
import StepBackwardOutlined from "@ant-design/icons/StepBackwardOutlined"
import StepForwardOutlined from "@ant-design/icons/StepForwardOutlined"
import { useAppStore } from "../../store"

interface SkipButtonProps {
  /** Direction to skip */
  direction: "prev" | "next"
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Stop event propagation (useful when inside clickable containers) */
  stopPropagation?: boolean
  /** Custom onClick handler (called after skip) */
  onClick?: (e: MouseEvent, direction: "prev" | "next") => void
  /** Disabled state (overrides auto-disable for prev) */
  disabled?: boolean
}

/**
 * SkipButton - A reusable button for skipping to previous/next track
 *
 * @example
 * // Previous track
 * <SkipButton direction="prev" />
 *
 * @example
 * // Next track
 * <SkipButton direction="next" />
 *
 * @example
 * // In player controls
 * <SkipButton
 *   direction="prev"
 *   className="player-control-btn"
 * />
 */
export const SkipButton: FC<SkipButtonProps> = ({
  direction,
  type = "text",
  className,
  size,
  stopPropagation = false,
  onClick,
  disabled,
}) => {
  const playNext = useAppStore((state) => state.playNext)
  const playPrev = useAppStore((state) => state.playPrev)
  const canPlayPrev = useAppStore((state) => state.canPlayPrev)

  // Auto-disable prev button if can't play previous
  // const isDisabled = disabled || (direction === "prev" && !canPlayPrev())

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        e.stopPropagation()
      }

      if (direction === "prev") {
        if (canPlayPrev()) {
          playPrev()
        }
      } else {
        playNext()
      }
      onClick?.(e, direction)
    },
    [stopPropagation, direction, playPrev, playNext, onClick],
  )

  return (
    <Button
      type={type}
      icon={
        direction === "prev" ? (
          <StepBackwardOutlined />
        ) : (
          <StepForwardOutlined />
        )
      }
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous track" : "Next track"}
    />
  )
}

export default SkipButton
