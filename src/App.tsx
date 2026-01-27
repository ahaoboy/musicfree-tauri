import { FC, useMemo, useState, useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { ConfirmProvider } from "./components/ConfirmProvider"
import { MessageProvider } from "./components/MessageProvider"
import { router } from "./router"
import { getTheme } from "./theme"
import { useAppStore } from "./store"

const App: FC = () => {
  const themeMode = useAppStore((state) => state.theme)
  const [systemMode, setSystemMode] = useState<"light" | "dark">("light")

  useEffect(() => {
    const matcher = window.matchMedia("(prefers-color-scheme: dark)")
    const currentMode = matcher.matches ? "dark" : "light"
    setSystemMode(currentMode)

    const handler = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? "dark" : "light")
    }
    matcher.addEventListener("change", handler)
    return () => matcher.removeEventListener("change", handler)
  }, [])

  const mode: "light" | "dark" = useMemo(
    () => (themeMode === "auto" ? systemMode : themeMode),
    [themeMode, systemMode],
  )

  const theme = useMemo(() => getTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MessageProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </MessageProvider>
    </ThemeProvider>
  )
}

export default App
