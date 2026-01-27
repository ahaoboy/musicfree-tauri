import { FC, useCallback, useMemo, MouseEvent } from "react"
import { Typography, Flex } from "antd"
import RetweetOutlined from "@ant-design/icons/RetweetOutlined"
import QuestionOutlined from "@ant-design/icons/QuestionOutlined"
import BarsOutlined from "@ant-design/icons/BarsOutlined"
import { useAppStore } from "../../store"
import type { PlayMode } from "../../api"
import { AdaptiveButton } from "../AdaptiveButton"

const { Text } = Typography

interface PlayModeButtonProps {
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
  onClick?: (e: MouseEvent, newMode: PlayMode) => void
  /** Disabled state */
  disabled?: boolean
}

/**
 * PlayModeButton - Uses AdaptiveButton for consistent interaction.
 */
export const PlayModeButton: FC<PlayModeButtonProps> = ({
  type = "text",
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
      onClick?.(e as any, newMode)
    },
    [togglePlayMode, currentPlayMode, onClick],
  )

  const iconStyle = iconSize ? { fontSize: iconSize } : undefined

  const modeIcon = useMemo(() => {
    switch (currentPlayMode) {
      case "sequence":
        return <BarsOutlined style={iconStyle} />
      case "list-loop":
        return <RetweetOutlined style={iconStyle} />
      case "single-loop":
        return (
          <Flex
            style={{ position: "relative" }}
            align="center"
            justify="center"
          >
            <RetweetOutlined style={iconStyle} />
            <Text
              style={{
                position: "absolute",
                fontSize: iconSize ? iconSize * 0.3 : 10,
                right: iconSize ? -iconSize * 0.2 : -6,
                top: iconSize ? -iconSize * 0.1 : -4,
                fontWeight: "bold",
                color: "currentColor",
              }}
            >
              1
            </Text>
          </Flex>
        )
      case "shuffle":
        return <QuestionOutlined style={iconStyle} />
      default:
        return <BarsOutlined style={iconStyle} />
    }
  }, [currentPlayMode, iconStyle, iconSize])

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
    <AdaptiveButton
      type={type}
      icon={modeIcon}
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      stopPropagation={stopPropagation}
      iconSize={iconSize}
      aria-label={ariaLabel}
    />
  )
}

export default PlayModeButton
