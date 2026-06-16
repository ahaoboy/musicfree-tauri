import { FC, useState, useCallback } from "react"
import { Menu, MenuItem, ListItemIcon, ListItemText, Button } from "@mui/material"
import { MoreVert, ContentCopy, Delete, Source } from "@mui/icons-material"
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
  showSave = false,
  playlistId,
  audioId,
  disabled = false,
  className,
  size = "medium",
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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

  const handleClose = (event?: {}, _reason?: "backdropClick" | "escapeKeyDown") => {
    if (event && "stopPropagation" in event) {
      ;(event as React.BaseSyntheticEvent).stopPropagation()
    }

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
        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <Delete color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default MoreActionsDropdown
