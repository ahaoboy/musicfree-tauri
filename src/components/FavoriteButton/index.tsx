import { FC, useCallback, MouseEvent } from "react"
import { Button } from "antd"
import HeartOutlined from "@ant-design/icons/HeartOutlined"
import HeartFilled from "@ant-design/icons/HeartFilled"
import { LocalAudio } from "../../api"
import { useAppStore } from "../../store"

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
  /** Stop event propagation (useful when inside clickable containers) */
  stopPropagation?: boolean
  /** Custom onClick handler (called after toggle) */
  onClick?: (e: MouseEvent, isFavorited: boolean) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * FavoriteButton - A reusable button for favoriting/unfavoriting audio
 *
 * @example
 * // Basic usage
 * <FavoriteButton audio={currentAudio} />
 *
 * @example
 * // In a card (stop propagation)
 * <FavoriteButton
 *   audio={audio}
 *   stopPropagation
 *   className="mini-player-btn"
 * />
 *
 * @example
 * // Custom handler
 * <FavoriteButton
 *   audio={audio}
 *   onClick={(e, isFavorited) => {
 *     console.log('Favorited:', isFavorited)
 *   }}
 * />
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
      if (stopPropagation) {
        e.stopPropagation()
      }

      if (audio && !disabled) {
        toggleFavorite(audio)
        onClick?.(e, !isFavorited)
      }
    },
    [audio, disabled, stopPropagation, toggleFavorite, isFavorited, onClick],
  )

  if (!audio) {
    return null
  }

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  return (
    <Button
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
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    />
  )
}

export default FavoriteButton
