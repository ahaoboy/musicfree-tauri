import { FC, useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { ConfirmProvider } from "./components/ConfirmProvider"
import { MessageProvider } from "./components/MessageProvider"
import { router } from "./router"
import { useTheme } from "./hooks/useTheme"
import "@fontsource/roboto/300.css"
import "@fontsource/roboto/400.css"
import "@fontsource/roboto/500.css"
import "@fontsource/roboto/700.css"
import { is_android } from "./api"
import { invoke } from "@tauri-apps/api/core"

const App: FC = () => {
  const { theme } = useTheme()

  // Request Android storage permission on app startup (non-blocking)
  useEffect(() => {
    if (is_android()) {
      invoke<boolean>("request_storage_permission")
        .then((granted) => {
          console.log("Storage permission granted:", granted)
        })
        .catch((err) => {
          console.error("Failed to request storage permission:", err)
        })
    }
  }, [])

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
