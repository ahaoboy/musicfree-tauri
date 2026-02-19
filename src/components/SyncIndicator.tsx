import { FC, memo, useMemo } from "react"
import { Box, Tooltip, Fade, useTheme } from "@mui/material"
import { useAppStore, useSyncStatus } from "../store"
import type { SyncStatus } from "../store"

/**
 * Maps SyncStatus to visual properties for the indicator dot.
 *
 * - **syncing**: green pulsing dot — sync in progress
 * - **success**: green solid dot — sync completed (auto-clears after 3s)
 * - **offline**: yellow/amber dot — GitHub API unreachable, local-only save
 * - **error**: red dot — sync failed while GitHub was reachable
 * - **idle**: hidden
 */
function getStatusConfig(status: SyncStatus): {
  visible: boolean
  color: string
  tooltip: string
  animate: boolean
} {
  switch (status) {
    case "syncing":
      return {
        visible: true,
        color: "success.main",
        tooltip: "Syncing to GitHub...",
        animate: true,
      }
    case "success":
      return {
        visible: true,
        color: "success.main",
        tooltip: "Sync completed",
        animate: false,
      }
    case "offline":
      return {
        visible: true,
        color: "warning.main",
        tooltip: "GitHub unreachable — saved locally",
        animate: false,
      }
    case "error":
      return {
        visible: true,
        color: "error.main",
        tooltip: "Sync failed",
        animate: false,
      }
    default:
      return {
        visible: false,
        color: "success.main",
        tooltip: "",
        animate: false,
      }
  }
}

/**
 * SyncIndicator component displays a status indicator for synchronization.
 *
 * Colors:
 * - **Green (pulsing)**: Sync in progress
 * - **Green (solid)**: Sync completed successfully (fades after 3s)
 * - **Yellow**: GitHub API unreachable – changes saved locally
 * - **Red**: Sync failed while GitHub was reachable
 */
export const SyncIndicator: FC = memo(() => {
  const isSyncing = useAppStore((state) => state.isSyncing)
  const syncStatus = useSyncStatus()
  const theme = useTheme()

  // Also show during active syncing even if syncStatus hasn't updated yet
  const effectiveStatus: SyncStatus = isSyncing ? "syncing" : syncStatus
  const { visible, color, tooltip, animate } = useMemo(
    () => getStatusConfig(effectiveStatus),
    [effectiveStatus],
  )

  return (
    <Fade in={visible} unmountOnExit>
      <Tooltip title={tooltip} placement="right" arrow>
        <Box
          sx={{
            position: "fixed",
            // offset by 16px plus the safe area top (status bar height on mobile)
            top: `calc(16px + ${theme.custom.safeAreaTop})`,
            left: 16,
            width: 10,
            height: 10,
            bgcolor: color,
            borderRadius: "50%",
            zIndex: (theme) => theme.zIndex.tooltip + 1,
            cursor: "help",
            // Only pulse when actively syncing
            ...(animate && {
              animation: "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }),
            "@keyframes pulse-ring": {
              "0%": {
                transform: "scale(0.8)",
                boxShadow: (theme) => `0 0 0 0 ${theme.palette.success.main}66`,
              },
              "70%": {
                transform: "scale(1)",
                boxShadow: (theme) =>
                  `0 0 0 10px ${theme.palette.success.main}00`,
              },
              "100%": {
                transform: "scale(0.8)",
                boxShadow: (theme) => `0 0 0 0 ${theme.palette.success.main}00`,
              },
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              bgcolor: color,
              ...(animate && {
                animation: "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }),
            },
            "@keyframes pulse-dot": {
              "0%": { transform: "scale(0.95)", opacity: 0.8 },
              "50%": { transform: "scale(1)", opacity: 1 },
              "100%": { transform: "scale(0.95)", opacity: 0.8 },
            },
          }}
        />
      </Tooltip>
    </Fade>
  )
})

SyncIndicator.displayName = "SyncIndicator"
