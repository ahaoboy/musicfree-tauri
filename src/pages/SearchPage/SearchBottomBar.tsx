import { FC, ReactNode } from "react"
import { Checkbox, Typography, Stack, Box, Button } from "@mui/material"
import Clear from "@mui/icons-material/Clear"
import { AudioCard } from "../../components"
import { Platform } from "../../api"

interface SearchBottomBarProps {
  playlist: {
    title?: string
    platform: Platform
    audios: any[]
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
  return (
    <Box className="search-bottom-bar">
      <AudioCard
        coverPath={null}
        coverUrl={playlistCoverUrl || undefined}
        platform={playlist.platform}
        title={playlist.title || "Search Result"}
        subtitle={`${audioCount} ♪`}
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
                sx={{
                  minWidth: 0,
                  p: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clear />
                {longPendingCount > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      color: "warning.main",
                      ml: 0.5,
                      fontSize: "inherit",
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
              sx={{
                borderRadius: 1.5,
              }}
            >
              {downloadButtonIcon}
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
