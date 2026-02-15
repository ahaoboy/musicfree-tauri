import { FC, useState, useCallback } from "react"
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Button,
} from "@mui/material"
import { MoreVert, ContentCopy, Delete, Source } from "@mui/icons-material"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener"
import { join } from "@tauri-apps/api/path"
import { CurrentPlatform } from "../../api"
import { useAdaptiveSize, AdaptiveSize } from "../../hooks"
import { useAppStore } from "../../store"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"

export interface MoreActionsDropdownProps {
  url?: string
  filePath?: string
  onDelete?: () => void
  disabled?: boolean
  className?: string
  size?: AdaptiveSize
}

export const MoreActionsDropdown: FC<MoreActionsDropdownProps> = ({
  url,
  filePath,
  onDelete,
  disabled = false,
  className,
  size = "medium",
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  )

  const appDir = useAppStore((state) => state.app_dir)
  const isAndroid = CurrentPlatform === "android"
  const showFileOption = !isAndroid && !!filePath && !!appDir

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
      ;(event as React.BaseSyntheticEvent).stopPropagation()
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

  const handleShowInFolder = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!appDir || !filePath) return

      try {
        // Convert relative path to absolute path
        const fullPath = await join(appDir, filePath)

        // Use revealItemInDir to open the file location
        await revealItemInDir(fullPath)
      } catch (error) {
        console.error("Failed to open file location:", error)
        showMessage("Failed to open file location", "error")
      }
      handleClose()
    },
    [filePath, appDir],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.()
      handleClose()
    },
    [onDelete],
  )

  const { buttonSize, iconSize, muiSize } = useAdaptiveSize(size)
  const iconStyle = { fontSize: iconSize }

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        onClick={handleClick}
        className={className}
        disabled={disabled}
        size={muiSize}
        sx={{
          minWidth: 0,
          p: 0,
          width: buttonSize,
          height: buttonSize,
          borderRadius: 2,
        }}
      >
        <MoreVert style={iconStyle} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          list: {
            dense: true,
            sx: { py: 0.5 },
          },
        }}
      >
        <MenuItem onClick={handleCopyUrl} disabled={!url}>
          <ListItemIcon>
            <ContentCopy />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenInBrowser} disabled={!url}>
          <ListItemIcon>
            <OpenInNewIcon />
          </ListItemIcon>
          <ListItemText>Open</ListItemText>
        </MenuItem>
        {showFileOption && (
          <MenuItem onClick={handleShowInFolder}>
            <ListItemIcon>
              <Source />
            </ListItemIcon>
            <ListItemText>File</ListItemText>
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <Delete color="error" />
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
