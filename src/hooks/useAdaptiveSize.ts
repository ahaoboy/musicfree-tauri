import { useMemo } from "react"

export type AdaptiveSize = "small" | "medium" | "large" | "xlarge"

/**
 * Standard hook for calculating button and icon sizes consistently across components
 */
export const useAdaptiveSize = (
  size: AdaptiveSize = "medium",
  iconOverride?: number,
) => {
  return useMemo(() => {
    let buttonSize = 32
    let iconSize = 20
    let muiSize: "small" | "medium" | "large" = "small"

    switch (size) {
      case "small":
        buttonSize = 28
        iconSize = 18
        muiSize = "small"
        break
      case "medium":
        buttonSize = 32
        iconSize = 20
        muiSize = "small"
        break
      case "large":
        buttonSize = 40
        iconSize = 32 // Consistent with PlayerCard requirement
        muiSize = "medium"
        break
      case "xlarge":
        buttonSize = 80
        iconSize = 64 // For the large play/pause button
        muiSize = "large"
        break
    }

    return {
      buttonSize,
      iconSize: iconOverride ?? iconSize,
      muiSize,
    }
  }, [size, iconOverride])
}

export default useAdaptiveSize
