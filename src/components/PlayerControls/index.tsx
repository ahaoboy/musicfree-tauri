import { FC } from "react"
import { Flex } from "antd"
import { LocalAudio } from "../../api"
import { PlayButton } from "../PlayButton"
import { FavoriteButton } from "../FavoriteButton"
import { SkipButton } from "../SkipButton"
import { PlayModeButton } from "../PlayModeButton"

interface PlayerControlsProps {
  /** Current audio (required for favorite button) */
  audio?: LocalAudio | null
  /** Show play mode button */
  showPlayMode?: boolean
  /** Show skip buttons */
  showSkip?: boolean
  /** Show favorite button */
  showFavorite?: boolean
  /** Layout: full (5 buttons) or mini (2 buttons) */
  layout?: "full" | "mini"
  /** Additional className */
  className?: string
  /** Button className */
  buttonClassName?: string
  /** Button size */
  buttonSize?: "small" | "middle" | "large"
  /** Icon font size */
  iconSize?: number
  /** Gap between buttons */
  gap?: "small" | "middle" | "large" | number
  /** Alignment */
  align?:
    | "start"
    | "center"
    | "end"
    | "space-between"
    | "space-around"
    | "space-evenly"
}

/**
 * PlayerControls - A complete set of player control buttons
 *
 * @example
 * // Full player controls
 * <PlayerControls
 *   audio={currentAudio}
 *   layout="full"
 *   className="main-controls"
 *   buttonClassName="player-control-btn"
 * />
 *
 * @example
 * // Mini player controls (play + favorite)
 * <PlayerControls
 *   audio={currentAudio}
 *   layout="mini"
 *   buttonClassName="mini-player-btn"
 * />
 *
 * @example
 * // Custom controls
 * <PlayerControls
 *   audio={currentAudio}
 *   showPlayMode={false}
 *   showSkip={true}
 *   showFavorite={true}
 * />
 */
export const PlayerControls: FC<PlayerControlsProps> = ({
  audio,
  showPlayMode = true,
  showSkip = true,
  showFavorite = true,
  layout = "full",
  className,
  buttonClassName,
  buttonSize,
  iconSize,
  gap = "small",
  align = "space-between",
}) => {
  // Mini layout: only play and favorite buttons
  if (layout === "mini") {
    return (
      <Flex align="center" gap={gap} className={className}>
        {showFavorite && (
          <FavoriteButton
            audio={audio}
            stopPropagation
            className={buttonClassName}
            size={buttonSize}
            iconSize={iconSize}
          />
        )}
        <PlayButton
          stopPropagation
          className={`${buttonClassName} play`}
          size={buttonSize}
          iconSize={iconSize}
        />
      </Flex>
    )
  }

  // Full layout: all controls
  return (
    <Flex align="center" justify={align} gap={gap} className={className}>
      {showPlayMode && (
        <PlayModeButton
          className={buttonClassName}
          size={buttonSize}
          iconSize={iconSize}
        />
      )}

      {showSkip && (
        <SkipButton
          direction="prev"
          className={buttonClassName}
          size={buttonSize}
          iconSize={iconSize}
        />
      )}

      <PlayButton
        className={`${buttonClassName} play`}
        size={buttonSize}
        iconSize={iconSize}
      />

      {showSkip && (
        <SkipButton
          direction="next"
          className={buttonClassName}
          size={buttonSize}
          iconSize={iconSize}
        />
      )}

      {showFavorite && (
        <FavoriteButton
          audio={audio}
          className={buttonClassName}
          size={buttonSize}
          iconSize={iconSize}
        />
      )}
    </Flex>
  )
}

export default PlayerControls
