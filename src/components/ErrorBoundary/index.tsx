import { Component, ReactNode, ErrorInfo } from "react"
import { Box, Typography, Container, Paper } from "@mui/material"
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined"
import { Button } from "@mui/material"

interface FallbackProps {
  error: Error | null
  onReset: () => void
}

interface Props {
  children: ReactNode
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode)
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch rendering errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback({
            error: this.state.error,
            onReset: this.handleReset,
          })
        }
        return this.props.fallback
      }

      return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
          <Paper
            sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <ErrorOutlineOutlinedIcon color="error" sx={{ fontSize: 64 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {this.state.error?.message || "An unexpected error occurred"}
            </Typography>
            <Box>
              <Button variant="contained" color="primary" onClick={this.handleReset}>
                Try Again
              </Button>
            </Box>
          </Paper>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
