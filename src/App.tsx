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
import { useMessage } from "./contexts/MessageContext"

/** Inner component that can use context providers for app initialization */
const AppInitializer: FC = () => {
  const message = useMessage()

  useEffect(() => {
    if (is_android()) {
      invoke<boolean>("request_storage_permission")
        .then((granted) => {
          if (!granted) {
            message.warning(
              "Storage permission denied. Some features may not work correctly.",
              5000,
            )
          }
        })
        .catch((err) => {
          message.error(`Storage permission request failed: ${String(err)}`, 5000)
        })
    }
  }, [message])

  return <RouterProvider router={router} />
}

const App: FC = () => {
  const { theme } = useTheme()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MessageProvider>
        <ConfirmProvider>
          <AppInitializer />
        </ConfirmProvider>
      </MessageProvider>
    </ThemeProvider>
  )
}

export default App
