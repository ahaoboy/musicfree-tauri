import { FC, useCallback, MouseEvent } from "react"
import HeartOutlined from "@ant-design/icons/HeartOutlined"
import HeartFilled from "@ant-design/icons/HeartFilled"
import { LocalAudio } from "../../api"
import { useAppStore } from "../../store"
import { AdaptiveButton } from "../AdaptiveButton"

interface FavoriteButtonProps {
  /** Audio to favorite/unfavorite */
  audio: LocalAudio | null | undefined
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
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
  type = "text",
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
      if (audio) {
        toggleFavorite(audio)
        onClick?.(e as any, !isFavorited)
      }
    },
    [audio, toggleFavorite, isFavorited, onClick],
  )

  if (!audio) {
    return null
  }

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  return (
    <AdaptiveButton
      type={type}
      icon={
        isFavorited ? (
          <HeartFilled style={{ ...iconStyle, color: "#ff4d4f" }} />
        ) : (
          <HeartOutlined style={iconStyle} />
        )
      }
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      stopPropagation={stopPropagation}
      iconSize={iconSize}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    />
  )
}

export default FavoriteButton
