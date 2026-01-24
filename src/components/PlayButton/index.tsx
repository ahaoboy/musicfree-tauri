import { FC, useCallback, MouseEvent } from "react"
import { Button } from "antd"
import PlayCircleFilled from "@ant-design/icons/PlayCircleFilled"
import PauseCircleFilled from "@ant-design/icons/PauseCircleFilled"
import { useAppStore } from "../../store"

interface PlayButtonProps {
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Stop event propagation (useful when inside clickable containers) */
  stopPropagation?: boolean
  /** Custom onClick handler (called after toggle) */
  onClick?: (e: MouseEvent, isPlaying: boolean) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * PlayButton - A reusable button for play/pause control
 *
 * @example
 * // Basic usage
 * <PlayButton />
 *
 * @example
 * // In a card (stop propagation)
 * <PlayButton
 *   stopPropagation
 *   className="mini-player-btn play"
 * />
 *
 * @example
 * // Large play button
 * <PlayButton
 *   className="player-control-btn play"
 *   size="large"
 * />
 */
export const PlayButton: FC<PlayButtonProps> = ({
  type = "text",
  className,
  size,
  stopPropagation = false,
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

      if (!disabled) {
        togglePlay()
        onClick?.(e, !isPlaying)
      }
    },
    [stopPropagation, disabled, togglePlay, isPlaying, onClick],
  )

  return (
    <Button
      type={type}
      icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      aria-label={isPlaying ? "Pause" : "Play"}
    />
  )
}

export default PlayButton
