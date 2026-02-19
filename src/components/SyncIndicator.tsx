import { FC, memo, useMemo } from "react"
import { Box, Tooltip, Fade } from "@mui/material"
import { useAppStore, useSyncStatus } from "../store"
import type { SyncStatus } from "../store"

/**
 * Maps SyncStatus to visual properties for the indicator dot.
 *
 * - **syncing**: green pulsing dot — sync in progress
 * - **success**: green solid dot — sync completed (briefly visible, then fades out)
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
 * SyncIndicator component displays an inline status dot for synchronization.
 *
 * Placed next to the Sync settings button on the Settings page.
 *
 * Colors:
 * - **Green (pulsing)**: Sync in progress
 * - **Green (solid)**: Sync completed successfully (smoothly fades out)
 * - **Yellow**: GitHub API unreachable – changes saved locally
 * - **Red**: Sync failed while GitHub was reachable
 */
export const SyncIndicator: FC = memo(() => {
  const isSyncing = useAppStore((state) => state.isSyncing)
  const syncStatus = useSyncStatus()

  // Also show during active syncing even if syncStatus hasn't updated yet
  const effectiveStatus: SyncStatus = isSyncing ? "syncing" : syncStatus
  const { visible, color, tooltip, animate } = useMemo(
    () => getStatusConfig(effectiveStatus),
    [effectiveStatus],
  )

  return (
    <Fade in={visible} timeout={{ enter: 300, exit: 800 }} unmountOnExit>
      <Tooltip title={tooltip} placement="top" arrow>
        <Box
          sx={{
            display: "inline-block",
            width: 8,
            height: 8,
            bgcolor: color,
            borderRadius: "50%",
            cursor: "help",
            flexShrink: 0,
            transition: "background-color 0.3s ease, box-shadow 0.3s ease",
            // Only pulse when actively syncing
            ...(animate && {
              animation: "sync-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }),
            "@keyframes sync-pulse": {
              "0%": {
                transform: "scale(0.85)",
                boxShadow: (theme: any) =>
                  `0 0 0 0 ${theme.palette.success.main}80`,
              },
              "50%": {
                transform: "scale(1.1)",
                boxShadow: (theme: any) =>
                  `0 0 0 6px ${theme.palette.success.main}00`,
              },
              "100%": {
                transform: "scale(0.85)",
                boxShadow: (theme: any) =>
                  `0 0 0 0 ${theme.palette.success.main}00`,
              },
            },
          }}
        />
      </Tooltip>
    </Fade>
  )
})

SyncIndicator.displayName = "SyncIndicator"
