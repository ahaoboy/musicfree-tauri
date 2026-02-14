import { FC } from "react"
import { Box, Typography, CircularProgress } from "@mui/material"

interface LoadingFallbackProps {
  tip?: string
  fullscreen?: boolean
}

/**
 * Loading fallback component for Suspense boundaries
 */
export const LoadingFallback: FC<LoadingFallbackProps> = ({
  tip = "Loading...",
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
          zIndex: 9999,
        }}
      >
        <Box
          component="img"
          src="/icon.png"
          alt="App Icon"
          sx={{
            width: 96,
            height: 96,
            borderRadius: "20%",
            mb: 3,
          }}
        />
        {tip && (
          <Typography variant="body1" color="text.secondary">
            {tip}
          </Typography>
        )}
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
      {tip && <Typography color="text.secondary">{tip}</Typography>}
    </Box>
  )
}

export default LoadingFallback
