import { FC } from "react"
import { Box, Typography, Button } from "@mui/material"
import { ErrorOutline, Refresh, Home } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { ErrorBoundary } from "../ErrorBoundary"

interface PageErrorFallbackProps {
  error: Error
  onReset: () => void
}

const PageErrorFallback: FC<PageErrorFallbackProps> = ({ error, onReset }) => {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        height: "100%",
        textAlign: "center",
      }}
      className="page"
    >
      <ErrorOutline color="error" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Page Error
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        paragraph
        sx={{ mb: 4 }}
      >
        {error.message || "Failed to load this page"}
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          key="retry"
          variant="contained"
          color="primary"
          startIcon={<Refresh />}
          onClick={onReset}
        >
          Retry
        </Button>
        <Button
          key="home"
          variant="outlined"
          startIcon={<Home />}
          onClick={() => navigate("/playlists")}
        >
          Go Home
        </Button>
      </Box>
    </Box>
  )
}

interface PageErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}

/**
 * Page-level Error Boundary with navigation options
 */
export const PageErrorBoundary: FC<PageErrorBoundaryProps> = ({
  children,
  onReset,
}) => {
  return (
    <ErrorBoundary
      fallback={
        <PageErrorFallback
          error={new Error("Page failed to load")}
          onReset={onReset || (() => window.location.reload())}
        />
      }
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  )
}

export default PageErrorBoundary
