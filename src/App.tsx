import { FC } from "react"
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

const App: FC = () => {
  const { theme } = useTheme()

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
