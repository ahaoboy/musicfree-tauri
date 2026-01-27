import { FC } from "react"
import { CircularProgress, Backdrop, Box, Typography } from "@mui/material"

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
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          gap: 2,
        }}
        open={true}
      >
        <CircularProgress color="inherit" />
        {tip && <Typography>{tip}</Typography>}
      </Backdrop>
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
