import { FC, useState, useCallback } from "react"
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Divider,
  Button,
} from "@mui/material"
import {
  MoreVert,
  ContentCopy,
  OpenInBrowser,
  Delete,
} from "@mui/icons-material"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { openUrl } from "@tauri-apps/plugin-opener"

export interface MoreActionsDropdownProps {
  url?: string
  onDelete?: () => void
  disabled?: boolean
  className?: string
}

export const MoreActionsDropdown: FC<MoreActionsDropdownProps> = ({
  url,
  onDelete,
  disabled = false,
  className,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  )

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (
    event?: {},
    _reason?: "backdropClick" | "escapeKeyDown",
  ) => {
    if (event && "stopPropagation" in event) {
      ;(event as any).stopPropagation()
    }
    setAnchorEl(null)
  }

  const showMessage = (
    msg: string,
    severity: "success" | "error" = "success",
  ) => {
    setSnackbarMessage(msg)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handleCopyUrl = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!url) return

      try {
        await writeText(url)
        showMessage("URL copied to clipboard")
      } catch (error) {
        console.error("Failed to copy URL:", error)
        showMessage("Failed to copy URL", "error")
      }
      handleClose()
    },
    [url],
  )

  const handleOpenInBrowser = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!url) return

      try {
        await openUrl(url)
      } catch (error) {
        console.error("Failed to open URL:", error)
        showMessage("Failed to open URL in browser", "error")
      }
      handleClose()
    },
    [url],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.()
      handleClose()
    },
    [onDelete],
  )

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        onClick={handleClick}
        className={className}
        disabled={disabled}
        sx={{
          minWidth: 0,
          p: 0,
          width: 32,
          height: 32,
          borderRadius: 1,
        }}
      >
        <MoreVert />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleCopyUrl} disabled={!url}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenInBrowser} disabled={!url}>
          <ListItemIcon>
            <OpenInBrowser fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open</ListItemText>
        </MenuItem>
        {onDelete && <Divider />}
        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}

export default MoreActionsDropdown
