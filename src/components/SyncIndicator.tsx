import { FC, memo } from "react"
import { Box, Tooltip, Fade, useTheme } from "@mui/material"
import { useAppStore } from "../store"

/**
 * SyncIndicator component displays a pulsing indicator when synchronization is in progress.
 * It automatically adjusts its position to accommodate mobile safe areas (e.g., status bar).
 */
export const SyncIndicator: FC = memo(() => {
  const isSyncing = useAppStore((state) => state.isSyncing)
  const theme = useTheme()

  return (
    <Fade in={isSyncing} unmountOnExit>
      <Tooltip title="Syncing to GitHub..." placement="right" arrow>
        <Box
          sx={{
            position: "fixed",
            // offset by 16px plus the safe area top (status bar height on mobile)
            top: `calc(16px + ${theme.custom.safeAreaTop})`,
            left: 16,
            width: 10,
            height: 10,
            bgcolor: "success.main",
            borderRadius: "50%",
            zIndex: (theme) => theme.zIndex.tooltip + 1,
            cursor: "help",
            animation: "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
              bgcolor: "success.main",
              animation: "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
