import { useMemo } from "react"
import { useAppStore } from "../store"
import { ThemeMode } from "../api"

/**
 * Custom hook to get effective theme
 * Returns "auto" if theme is null or undefined
 */
export const useEffectiveTheme = (): ThemeMode => {
  const theme = useAppStore((state) => state.config.theme)

  return useMemo(() => {
    return theme || "auto"
  }, [theme])
}

/**
 * Custom hook to determine if dark mode is active
 * Handles null/undefined theme by defaulting to "auto"
 */
export const useIsDarkMode = (): boolean => {
  const theme = useAppStore((state) => state.config.theme)

  return useMemo(() => {
    const effectiveTheme = theme || "auto"

    if (effectiveTheme === "dark") {
      return true
    }

    if (effectiveTheme === "light") {
      return false
    }

    // "auto" - check system preference
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }

    return false
  }, [theme])
}
