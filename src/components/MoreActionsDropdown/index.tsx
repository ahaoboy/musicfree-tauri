import { FC, useState, useCallback } from "react"
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material"
import { MoreVert, ContentCopy, Delete, Source, DriveFileRenameOutline } from "@mui/icons-material"
import SaveIcon from "@mui/icons-material/Save"
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener"
import { join } from "@tauri-apps/api/path"
import { CurrentPlatform, save_audio } from "../../api"
import { copyToClipboard } from "../../utils"
import { useAdaptiveSize, AdaptiveSize } from "../../hooks"
import { useAppStore } from "../../store"
import { useMessage } from "../../contexts/MessageContext"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"

export interface MoreActionsDropdownProps {
  url?: string
  filePath?: string
  onDelete?: () => void
  onRename?: (newName: string) => void
  currentTitle?: string
  showSave?: boolean
  playlistId?: string
  audioId?: string
  disabled?: boolean
  className?: string
  size?: AdaptiveSize
}

export const MoreActionsDropdown: FC<MoreActionsDropdownProps> = ({
  url,
  filePath,
  onDelete,
  onRename,
  currentTitle,
  showSave = false,
  playlistId,
  audioId,
  disabled = false,
  className,
  size = "medium",
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const open = Boolean(anchorEl)

  const message = useMessage()

  const appDir = useAppStore((state) => state.app_dir)
  const isAndroid = CurrentPlatform === "android"
  const showFileOption = !isAndroid && !!filePath && !!appDir

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (event?: React.SyntheticEvent) => {
    event?.stopPropagation()
    setAnchorEl(null)
  }

  const handleCopyUrl = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!url) return

      try {
        await copyToClipboard(url)
        message.success("URL copied to clipboard")
      } catch (error) {
        console.error("Failed to copy URL:", error)
        message.error("Failed to copy URL")
      }
      handleClose()
    },
    [url, message],
  )

  const handleOpenInBrowser = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!url) return

      try {
        await openUrl(url)
      } catch (error) {
        console.error("Failed to open URL:", error)
        message.error("Failed to open URL in browser")
      }
      handleClose()
    },
    [url, message],
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
        message.error("Failed to open file location")
      }
      handleClose()
    },
    [filePath, appDir, message],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.()
      handleClose()
    },
    [onDelete],
  )

  const handleSave = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!playlistId) return

      try {
        const savedPaths = await save_audio(playlistId, audioId)
        if (savedPaths.length === 1) {
          message.success(`Saved to\n${savedPaths[0]}`)
          copyToClipboard(savedPaths[0]).catch((e) =>
            console.error("Failed to copy to clipboard", e),
          )
        } else {
          message.success(`Saved ${savedPaths.length} files to\n${savedPaths[0]}`)
          // For multiple files, we can copy all paths separated by newlines
          copyToClipboard(savedPaths.join("\n")).catch((e) =>
            console.error("Failed to copy to clipboard", e),
          )
        }
      } catch (error) {
        console.error("Failed to save audio:", error)
        message.error(`Failed to save: ${error}`)
      }
      handleClose()
    },
    [playlistId, audioId, message],
  )

  const handleRenameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setRenameValue(currentTitle || "")
      setRenameOpen(true)
      handleClose()
    },
    [currentTitle],
  )

  const handleRenameConfirm = useCallback(() => {
    if (renameValue.trim() && renameValue !== currentTitle) {
      onRename?.(renameValue.trim())
    }
    setRenameOpen(false)
  }, [renameValue, currentTitle, onRename])

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
        {showSave && (
          <MenuItem onClick={handleSave} disabled={!playlistId}>
            <ListItemIcon>
              <SaveIcon />
            </ListItemIcon>
            <ListItemText>Save</ListItemText>
          </MenuItem>
        )}
        {onRename && (
          <MenuItem onClick={handleRenameClick}>
            <ListItemIcon>
              <DriveFileRenameOutline />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
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
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameConfirm()
            }}
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleRenameConfirm} variant="contained" disabled={!renameValue.trim()}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default MoreActionsDropdown
