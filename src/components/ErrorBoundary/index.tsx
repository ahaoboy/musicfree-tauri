import { Component, ReactNode, ErrorInfo } from "react"
import { Box, Typography, Container, Paper } from "@mui/material"
import { ErrorOutline } from "@mui/icons-material"
import { Button } from "@mui/material"

interface Props {
  children: ReactNode
  fallback?: ReactNode
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
            <ErrorOutline color="error" sx={{ fontSize: 64 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {this.state.error?.message || "An unexpected error occurred"}
            </Typography>
            <Box>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReset}
              >
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
