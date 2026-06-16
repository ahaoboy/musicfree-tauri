import { FC, useState, useCallback } from "react"
import { Box, Typography, Button, Collapse } from "@mui/material"
import { Refresh, Home, ExpandMore, ExpandLess, ContentCopy } from "@mui/icons-material"
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined"
import { useNavigate } from "react-router-dom"
import { ErrorBoundary } from "../ErrorBoundary"
import { copyToClipboard } from "../../utils"

interface PageErrorFallbackProps {
  error: Error | null
  onReset: () => void
}

const PageErrorFallback: FC<PageErrorFallbackProps> = ({ error, onReset }) => {
  const navigate = useNavigate()
  const [showStack, setShowStack] = useState(false)

  const errorMessage = error?.message || "Failed to load this page"
  const errorStack = error?.stack

  const handleCopyError = useCallback(async () => {
    const text = [errorMessage, errorStack].filter(Boolean).join("\n\n")
    await copyToClipboard(text)
  }, [errorMessage, errorStack])

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
      <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Page Error
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 480 }}>
        {errorMessage}
      </Typography>

      {errorStack && (
        <>
          <Button
            size="small"
            onClick={() => setShowStack(!showStack)}
            endIcon={showStack ? <ExpandLess /> : <ExpandMore />}
            sx={{ mb: 1, textTransform: "none" }}
          >
            {showStack ? "Hide" : "Show"} Details
          </Button>
          <Collapse in={showStack} sx={{ width: "100%", mb: 3 }}>
            <Box
              component="pre"
              sx={{
                p: 2,
                fontSize: 11,
                fontFamily: "monospace",
                bgcolor: "action.hover",
                borderRadius: 1,
                overflow: "auto",
                maxHeight: 200,
                maxWidth: 480,
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {errorStack}
            </Box>
          </Collapse>
        </>
      )}

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopyError}>
          Copy
        </Button>
        <Button variant="contained" color="primary" startIcon={<Refresh />} onClick={onReset}>
          Retry
        </Button>
        <Button variant="outlined" startIcon={<Home />} onClick={() => navigate("/playlists")}>
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
export const PageErrorBoundary: FC<PageErrorBoundaryProps> = ({ children, onReset }) => {
  return (
    <ErrorBoundary
      fallback={({ error, onReset: handleReset }) => (
        <PageErrorFallback
          error={error}
          onReset={onReset || handleReset || (() => window.location.reload())}
        />
      )}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  )
}

export default PageErrorBoundary
