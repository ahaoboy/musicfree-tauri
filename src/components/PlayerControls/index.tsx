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
          />
        )}
        <PlayButton stopPropagation className={`${buttonClassName} play`} />
      </Flex>
    )
  }

  // Full layout: all controls
  return (
    <Flex align="center" justify={align} gap={gap} className={className}>
      {showPlayMode && <PlayModeButton className={buttonClassName} />}

      {showSkip && <SkipButton direction="prev" className={buttonClassName} />}

      <PlayButton className={`${buttonClassName} play`} />

      {showSkip && <SkipButton direction="next" className={buttonClassName} />}

      {showFavorite && (
        <FavoriteButton audio={audio} className={buttonClassName} />
      )}
    </Flex>
  )
}

export default PlayerControls
