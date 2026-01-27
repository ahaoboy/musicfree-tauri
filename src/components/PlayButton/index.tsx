import { FC, useCallback, MouseEvent } from "react"
import PlayCircleFilled from "@ant-design/icons/PlayCircleFilled"
import PauseCircleFilled from "@ant-design/icons/PauseCircleFilled"
import { useAppStore } from "../../store"
import { AdaptiveButton } from "../AdaptiveButton"

interface PlayButtonProps {
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Icon font size */
  iconSize?: number
  /** Custom onClick handler */
  onClick?: (e: MouseEvent, isisPlaying: boolean) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * PlayButton - Uses AdaptiveButton for cross-platform reliability.
 */
export const PlayButton: FC<PlayButtonProps> = ({
  type = "text",
  className,
  size,
  stopPropagation = false,
  iconSize,
  onClick,
  disabled,
}) => {
  const isPlaying = useAppStore((state) => state.isPlaying)
  const togglePlay = useAppStore((state) => state.togglePlay)

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      togglePlay()
      onClick?.(e as any, !isPlaying)
    },
    [togglePlay, isPlaying, onClick],
  )

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  return (
    <AdaptiveButton
      type={type}
      icon={
        isPlaying ? (
          <PauseCircleFilled style={iconStyle} />
        ) : (
          <PlayCircleFilled style={iconStyle} />
        )
      }
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      stopPropagation={stopPropagation}
      iconSize={iconSize}
      aria-label={isPlaying ? "Pause" : "Play"}
    />
  )
}

export default PlayButton
