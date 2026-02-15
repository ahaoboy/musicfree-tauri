import { FC, ReactNode } from "react"
import React from "react"
import { Checkbox, Typography, Stack, Box, Button } from "@mui/material"
import Clear from "@mui/icons-material/Clear"
import { AudioCard } from "../../components"
import { Platform, Audio } from "../../api"
import { useAdaptiveSize } from "../../hooks"

interface SearchBottomBarProps {
  playlist: {
    title?: string
    platform: Platform
    audios: Audio[]
  }
  playlistCoverUrl?: string | null
  isAllSelected: boolean
  isSomeSelected: boolean
  onToggleSelectAll: (checked: boolean) => void
  showClearButton: boolean
  longPendingCount: number
  onClear: () => void
  downloadButtonIcon: ReactNode
  downloadButtonText: string
  isDownloadingAll: boolean
  isSelectedEmpty: boolean
  onDownloadAll: () => void
}

export const SearchBottomBar: FC<SearchBottomBarProps> = ({
  playlist,
  playlistCoverUrl,
  isAllSelected,
  isSomeSelected,
  onToggleSelectAll,
  showClearButton,
  longPendingCount,
  onClear,
  downloadButtonIcon,
  downloadButtonText,
  isDownloadingAll,
  isSelectedEmpty,
  onDownloadAll,
}) => {
  const audioCount = playlist.audios?.length || 0
  const { buttonSize, iconSize, muiSize } = useAdaptiveSize("medium")
  const iconStyle = { fontSize: iconSize }

  return (
    <Box>
      <AudioCard
        coverPath={null}
        coverUrl={playlistCoverUrl || undefined}
        platform={playlist.platform}
        title={playlist.title || "Search Result"}
        subtitle={audioCount.toString()}
        active={false}
        actions={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={(e) => onToggleSelectAll(e.target.checked)}
              disabled={isDownloadingAll}
            />

            {showClearButton && (
              <Button
                variant="text"
                color="inherit"
                onClick={onClear}
                disabled={isDownloadingAll}
                aria-label="Clear failed/long pending"
                size={muiSize}
                sx={{
                  minWidth: 0,
                  p: 0,
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clear style={iconStyle} />
                {longPendingCount > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      color: "warning.main",
                      ml: 0.2,
                      fontSize: 12,
                    }}
                  >
                    {longPendingCount}
                  </Typography>
                )}
              </Button>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={onDownloadAll}
              disabled={isSelectedEmpty || isDownloadingAll}
              size={muiSize}
              sx={{
                borderRadius: 1.5,
              }}
            >
              {React.cloneElement(downloadButtonIcon as React.ReactElement, {
                // @ts-expect-error
                style: { ...iconStyle, ...downloadButtonIcon.props.style },
              })}
              <Typography component="span" sx={{ ml: 0.5 }}>
                {downloadButtonText}
              </Typography>
            </Button>
          </Stack>
        }
      />
    </Box>
  )
}
