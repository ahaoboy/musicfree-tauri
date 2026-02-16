import { FC } from "react"
import { Box, CircularProgress } from "@mui/material"
import { splashIconSx } from "../../hooks/useTheme"

interface LoadingFallbackProps {
  tip?: string
  fullscreen?: boolean
}

/**
 * Loading fallback component for Suspense boundaries
 */
export const LoadingFallback: FC<LoadingFallbackProps> = ({
  fullscreen = false,
}) => {
  if (fullscreen) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          zIndex: (theme) => theme.custom.zIndex.loading,
        }}
      >
        <Box component="img" src="/icon.png" alt="App Icon" sx={splashIconSx} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 2,
      }}
      className="page"
    >
      <CircularProgress />
    </Box>
  )
}

export default LoadingFallback
