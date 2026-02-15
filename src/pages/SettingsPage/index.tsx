import { FC, useCallback, useState, useEffect } from "react"
import {
  Typography,
  Box,
  Stack,
  Select,
  MenuItem,
  Divider,
  Paper,
  CircularProgress,
  Button,
  IconButton,
} from "@mui/material"
import LightMode from "@mui/icons-material/LightMode"
import DarkMode from "@mui/icons-material/DarkMode"
import SettingsSystemDaydream from "@mui/icons-material/SettingsSystemDaydream"
import GitHub from "@mui/icons-material/GitHub"
import FolderOpen from "@mui/icons-material/FolderOpen"
import DeleteIcon from "@mui/icons-material/Delete"
import { openUrl, openPath } from "@tauri-apps/plugin-opener"
import { useAppStore } from "../../store"
import {
  clear_all_data,
  get_storage_size,
  get_cache_size,
  clear_cache,
  is_builtin,
  export_data,
  import_data,
  CurrentPlatform,
} from "../../api"
import { useConfirm } from "../../hooks"
import { useMessage } from "../../contexts/MessageContext"
import { CopyButton } from "../../components"
import prettyBytes from "pretty-bytes"
import { useTheme } from "../../hooks/useTheme"

const REPO_URL = "https://github.com/ahaoboy/musicfree-tauri"

// Settings page - app configuration
export const SettingsPage: FC = () => {
  const { mode, setMode } = useTheme()
  // const setThemeMode = useAppStore((state) => state.setThemeMode)
  const loadConfig = useAppStore((state) => state.loadConfig)

  // Calculate total audios across all playlists (excluding duplicates)
  const totalAudios = useAppStore((state) => state.getTotalAudios().length)

  // Count user playlists (excluding special playlists)
  const userPlaylistsCount = useAppStore(
    (state) =>
      state.config.playlists.filter(({ id }) => !is_builtin(id)).length,
  )

  const appDir = useAppStore((state) => state.app_dir)
  const version = useAppStore((state) => state.app_version)

  const message = useMessage()
  const { showConfirm } = useConfirm()

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [storageSize, setStorageSize] = useState<number>(0)
  const [loadingStorage, setLoadingStorage] = useState(false)
  const [cacheSize, setCacheSize] = useState<number>(0)
  const [loadingCache, setLoadingCache] = useState(false)

  // Load storage size
  const loadStorageSize = useCallback(async () => {
    setLoadingStorage(true)
    setLoadingCache(true)
    try {
      const [storage, cache] = await Promise.all([
        get_storage_size(),
        get_cache_size(),
      ])
      setStorageSize(storage)
      setCacheSize(cache)
    } catch (error) {
      console.error("Failed to get storage size:", error)
    } finally {
      setLoadingStorage(false)
      setLoadingCache(false)
    }
  }, [])

  // Load storage size on mount
  useEffect(() => {
    loadStorageSize()
  }, [loadStorageSize])

  const handleClearCache = useCallback(() => {
    showConfirm({
      title: "Clear Cache",
      content:
        "This will delete all files that are not used by your playlists or audios. This action cannot be undone.",
      okText: "Clear",
      okType: "danger",
      onOk: async () => {
        try {
          await clear_cache()
          await loadStorageSize()
          message.success("Cache cleared successfully")
        } catch (e) {
          console.error(e)
          message.error("Failed to clear cache")
        }
      },
    })
  }, [showConfirm, message, loadStorageSize])

  const handleClearData = useCallback(() => {
    showConfirm({
      title: "Clear All Data",
      content:
        "This will delete all downloaded music and reset your configuration. This action cannot be undone.",
      okText: "Clear",
      okType: "danger",
      onOk: async () => {
        try {
          await clear_all_data()
          await loadStorageSize() // Reload storage size after clearing
          window.location.reload()
        } catch (e) {
          console.error(e)
          message.error("Failed to clear data")
        }
      },
    })
  }, [showConfirm, message, loadStorageSize])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const filename = await export_data()
      message.success(`Data exported to Downloads/${filename}`)
    } catch (e) {
      console.error(e)
      message.error(`Failed to export data ${e}`)
    } finally {
      setExporting(false)
    }
  }, [message])

  const handleImport = useCallback(async () => {
    setImporting(true)
    try {
      const filename = await import_data()
      message.success(`Successfully imported data from ${filename}`)
      await loadConfig()
    } catch (e: unknown) {
      console.error(e)
      if (typeof e === "string" && e.includes("No backup")) {
        message.warning("No backup file found in Downloads")
      } else {
        message.error(`Failed to import data: ${e}`)
      }
    } finally {
      setImporting(false)
    }
  }, [message, loadConfig])

  return (
    <Stack
      spacing={3}
      sx={{
        p: 1,
        height: "100%",
        overflowY: "overlay",
      }}
    >
      {/* Theme Section */}
      <Stack spacing={2}>
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          fullWidth
        >
          <MenuItem value="light">
            <Stack direction="row" spacing={1} alignItems="center">
              <LightMode fontSize="small" />
              <Typography>Light</Typography>
            </Stack>
          </MenuItem>
          <MenuItem value="dark">
            <Stack direction="row" spacing={1} alignItems="center">
              <DarkMode fontSize="small" />
              <Typography>Dark</Typography>
            </Stack>
          </MenuItem>
          <MenuItem value="system">
            <Stack direction="row" spacing={1} alignItems="center">
              <SettingsSystemDaydream fontSize="small" />
              <Typography>System</Typography>
            </Stack>
          </MenuItem>
        </Select>
      </Stack>

      {/* Library Section */}
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography>Downloaded</Typography>
            <Typography color="text.secondary">
              ♪ {totalAudios} 🎶{userPlaylistsCount}
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      {/* About Section */}
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography>Version</Typography>
            <Typography color="text.secondary">
              {version || "Loading..."}
            </Typography>
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography>Repository</Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={() => openUrl(REPO_URL)}
                aria-label="Open in Browser"
                size="small"
              >
                <GitHub />
              </IconButton>
              <CopyButton
                text={REPO_URL}
                successMessage="Repository URL copied to clipboard"
                errorMessage="Failed to copy URL"
              />
            </Stack>
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography>App Directory</Typography>
            <Stack direction="row" spacing={1}>
              {CurrentPlatform !== "android" && (
                <IconButton
                  onClick={() => appDir && openPath(appDir)}
                  disabled={!appDir}
                  aria-label="Open Directory"
                  size="small"
                >
                  <FolderOpen />
                </IconButton>
              )}
              <CopyButton
                text={appDir || ""}
                successMessage="Path copied to clipboard"
                errorMessage="Failed to copy path"
                disabled={!appDir}
              />
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      {/* Data Management Section */}
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography>Backup & Restore</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={handleExport}
                disabled={exporting}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                onClick={handleImport}
                disabled={importing}
              >
                Import
              </Button>
            </Stack>
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>Clear Cache</Typography>
                <Typography color="text.secondary" variant="body2">
                  (
                  {loadingCache ? (
                    <CircularProgress
                      size={12}
                      sx={{ color: "text.secondary" }}
                    />
                  ) : (
                    prettyBytes(cacheSize)
                  )}
                  )
                </Typography>
              </Stack>
            </Box>
            <IconButton color="error" onClick={handleClearCache} size="small">
              <DeleteIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>Clear Storage</Typography>
                <Typography color="text.secondary" variant="body2">
                  (
                  {loadingStorage ? (
                    <CircularProgress
                      size={12}
                      sx={{ color: "text.secondary" }}
                    />
                  ) : (
                    prettyBytes(storageSize)
                  )}
                  )
                </Typography>
              </Stack>
            </Box>
            <IconButton color="error" onClick={handleClearData} size="small">
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  )
}

export default SettingsPage
