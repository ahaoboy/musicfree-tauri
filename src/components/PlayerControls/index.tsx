import { FC } from "react"
import { Stack } from "@mui/material"
import { LocalAudio } from "../../api"
import { PlayButton } from "../PlayButton"
import { FavoriteButton } from "../FavoriteButton"
import { SkipButton } from "../SkipButton"
import { PlayModeButton } from "../PlayModeButton"
import { AdaptiveSize } from "../../hooks"

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
  size?: AdaptiveSize
  /** Icon font size */
  iconSize?: number
  /** Emphasized play button size (only for full layout) */
  playButtonSize?: AdaptiveSize
  /** Emphasized play icon size (only for full layout) */
  playIconSize?: number
  /** Emphasized play button box size (px, only for play) */
  playBoxSize?: number
  /** Gap between buttons */
  gap?: number | string
  /** Alignment */
  align?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly"
}

/**
 * PlayerControls - A complete set of player control buttons
 */
export const PlayerControls: FC<PlayerControlsProps> = ({
  audio,
  showPlayMode = true,
  showSkip = true,
  showFavorite = true,
  layout = "full",
  className,
  buttonClassName,
  size = "medium",
  iconSize,
  playButtonSize,
  playIconSize,
  playBoxSize,
  gap = 1,
  align = "space-between",
}) => {
  // Mini layout: only play and favorite buttons
  if (layout === "mini") {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={gap}
        className={className}
      >
        <PlayButton
          stopPropagation
          className={`${buttonClassName} play`}
          size={playButtonSize || size}
          iconSize={playIconSize || iconSize}
          boxSize={playBoxSize}
        />
        {showFavorite && (
          <FavoriteButton
            audio={audio}
            stopPropagation
            className={buttonClassName}
            size={size}
            iconSize={iconSize}
          />
        )}
      </Stack>
    )
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={align}
      spacing={gap}
      className={className}
      sx={{ width: "100%" }}
    >
      {showPlayMode && (
        <PlayModeButton
          stopPropagation
          className={buttonClassName}
          size={size}
          iconSize={iconSize}
        />
      )}

      {showSkip && (
        <SkipButton
          direction="prev"
          stopPropagation
          className={buttonClassName}
          size={size}
          iconSize={iconSize}
        />
      )}

      <PlayButton
        stopPropagation
        className={`${buttonClassName} play`}
        size={playButtonSize || size}
        iconSize={playIconSize || iconSize}
        boxSize={playBoxSize}
      />

      {showSkip && (
        <SkipButton
          direction="next"
          stopPropagation
          className={buttonClassName}
          size={size}
          iconSize={iconSize}
        />
      )}

      {showFavorite && (
        <FavoriteButton
          audio={audio}
          stopPropagation
          className={buttonClassName}
          size={size}
          iconSize={iconSize}
        />
      )}
    </Stack>
  )
}

export default PlayerControls
