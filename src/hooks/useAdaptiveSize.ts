import { useMemo } from "react"
import { useTheme } from "./useTheme"

export type AdaptiveSize = "small" | "medium" | "large" | "xlarge"

/**
 * Standard hook for calculating button and icon sizes consistently across components
 */
export const useAdaptiveSize = (
  size: AdaptiveSize = "medium",
  iconOverride?: number,
) => {
  const { theme } = useTheme()

  return useMemo(() => {
    const buttonSize = theme.custom.actionButtonSize[size]
    const iconSize = theme.custom.actionIconSize[size]

    let muiSize: "small" | "medium" | "large" = "small"
    if (size === "large") muiSize = "medium"
    if (size === "xlarge") muiSize = "large"

    return {
      buttonSize,
      iconSize: iconOverride ?? iconSize,
      muiSize,
    }
  }, [size, iconOverride, theme.custom.actionButtonSize, theme.custom.actionIconSize])
}

export default useAdaptiveSize
