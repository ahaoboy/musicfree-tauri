import { FC, useState, useCallback, ReactNode } from "react"
import { Snackbar, Alert, Button } from "@mui/material"
import { ContentCopy, Check } from "@mui/icons-material"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { useAdaptiveSize, AdaptiveSize } from "../../hooks"

interface CopyButtonProps {
  /** Text to copy to clipboard */
  text: string
  /** Custom icon to display (default: ContentCopy) */
  icon?: ReactNode
  /** Icon to show when copied (default: Check) */
  copiedIcon?: ReactNode
  /** Success message (default: "Copied to clipboard") */
  successMessage?: string
  /** Error message (default: "Failed to copy") */
  errorMessage?: string
  /** Duration to show copied state in ms (default: 2000) */
  copiedDuration?: number
  variant?: "text" | "outlined" | "contained"
  color?:
  | "inherit"
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "info"
  | "warning"
  /** Additional className */
  className?: string
  /** Button size */
  size?: AdaptiveSize
  /** Disabled state */
  disabled?: boolean
}

/**
 * CopyButton - Uses AdaptiveButton for reliable copy interaction.
 */
export const CopyButton: FC<CopyButtonProps> = ({
  text,
  icon = <ContentCopy />,
  copiedIcon = <Check />,
  successMessage = "Copied to clipboard",
  errorMessage = "Failed to copy",
  copiedDuration = 2000,
  variant = "text",
  color = "inherit",
  className,
  size,
  disabled,
}) => {
  const [copied, setCopied] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  )

  const handleClose = () => {
    setSnackbarOpen(false)
  }

  const handleCopy = useCallback(async () => {
    if (!text || disabled) return

    try {
      await writeText(text)
      setCopied(true)
      setSnackbarMessage(successMessage)
      setSnackbarSeverity("success")
      setSnackbarOpen(true)
      setTimeout(() => setCopied(false), copiedDuration)
    } catch (e) {
      console.error("Copy failed:", e)
      setSnackbarMessage(errorMessage)
      setSnackbarSeverity("error")
      setSnackbarOpen(true)
    }
  }, [text, disabled, successMessage, errorMessage, copiedDuration])

  const { buttonSize, muiSize } = useAdaptiveSize(size)

  return (
    <>
      <Button
        variant={variant}
        color={color}
        onClick={handleCopy}
        className={className}
        size={muiSize}
        disabled={disabled}
        sx={{
          minWidth: 0,
          p: 0,
          width: buttonSize,
          height: buttonSize,
          borderRadius: 2,
        }}
      >
        {copied ? copiedIcon : icon}
      </Button>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={copiedDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}

export default CopyButton
