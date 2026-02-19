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
  Switch,
} from "@mui/material"
import LightMode from "@mui/icons-material/LightMode"
import DarkMode from "@mui/icons-material/DarkMode"
import SettingsSystemDaydream from "@mui/icons-material/SettingsSystemDaydream"
import GitHub from "@mui/icons-material/GitHub"
import FolderOpen from "@mui/icons-material/FolderOpen"
import DeleteIcon from "@mui/icons-material/Delete"
import SyncIcon from "@mui/icons-material/Sync"
import BackupIcon from "@mui/icons-material/Backup"
import CloudDownloadIcon from "@mui/icons-material/CloudDownload"
import SettingsIcon from "@mui/icons-material/Settings"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
} from "@mui/material"
import { openUrl, openPath, revealItemInDir } from "@tauri-apps/plugin-opener"
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
  GistConfig,
  get_log_size,
  clear_log,
  get_log_path,
} from "../../api"
import { useConfirm } from "../../hooks"
import { useMessage } from "../../contexts/MessageContext"
import { CopyButton } from "../../components"
import prettyBytes from "pretty-bytes"
import { useTheme } from "../../hooks/useTheme"
import { setSaveToFile, getSaveToFile } from "../../utils/logger"

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
  const [openSyncDialog, setOpenSyncDialog] = useState(false)
  const [saveLogsToFile, setSaveLogsToFile] = useState(getSaveToFile())
  const [logSize, setLogSize] = useState<number>(0)

  const gistConfig = useAppStore((state) => state.gistConfig)
  const setGistConfig = useAppStore((state) => state.setGistConfig)
  const syncGist = useAppStore((state) => state.syncGist)
  const isSyncing = useAppStore((state) => state.isSyncing)

  // Load storage size
  const loadStorageSize = useCallback(async () => {
    setLoadingStorage(true)
    setLoadingCache(true)
    try {
      const [storage, cache, log] = await Promise.all([
        get_storage_size(),
        get_cache_size(),
        get_log_size(),
      ])
      setStorageSize(storage)
      setCacheSize(cache)
      setLogSize(log)
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
      const path = await export_data()
      message.success(`Data exported to\n${path}`)
      revealItemInDir(path)
    } catch (e) {
      console.error(e)
      message.error(`Failed to export data ${e}`)
    } finally {
      setExporting(false)
    }
  }, [message])

  const importConfig = useAppStore((state) => state.importConfig)

  const handleImport = useCallback(async () => {
    setImporting(true)
    try {
      const { config: importedConfig, filename } = await import_data()

      await importConfig(importedConfig)

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
  }, [message, loadConfig, importConfig])

  const handleToggleSaveLogs = useCallback(
    (checked: boolean) => {
      setSaveLogsToFile(checked)
      setSaveToFile(checked)
      if (checked) {
        message.success("Logs will be saved to file")
      } else {
        message.info("Logs will not be saved to file")
      }
    },
    [message],
  )

  const handleClearLog = useCallback(() => {
    showConfirm({
      title: "Clear Log",
      content: "This will delete the log file. This action cannot be undone.",
      okText: "Clear",
      okType: "danger",
      onOk: async () => {
        try {
          await clear_log()
          await loadStorageSize()
          message.success("Log cleared successfully")
        } catch (e) {
          console.error(e)
          message.error("Failed to clear log")
        }
      },
    })
  }, [showConfirm, message, loadStorageSize])

  const handleOpenLog = useCallback(async () => {
    try {
      const logPath = await get_log_path()
      revealItemInDir(logPath)
    } catch (e) {
      console.error(e)
      message.error("Failed to open log file")
    }
  }, [message])

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

      {/* Log Section */}
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>Log</Typography>
                <Typography color="text.secondary" variant="body2">
                  ({prettyBytes(logSize)})
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {CurrentPlatform !== "android" && (
                <IconButton
                  onClick={handleOpenLog}
                  disabled={logSize === 0}
                  aria-label="Open Log"
                  size="small"
                >
                  <FolderOpen />
                </IconButton>
              )}
              <Switch
                checked={saveLogsToFile}
                onChange={(e) => handleToggleSaveLogs(e.target.checked)}
              />
              <IconButton
                color="error"
                onClick={handleClearLog}
                size="small"
                disabled={logSize === 0}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      {/* Sync Section */}
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography>
                Sync
                {gistConfig?.lastSyncTime && (
                  <Typography
                    component="span"
                    color="text.secondary"
                    variant="body2"
                  >
                    {" "}
                    ({new Date(gistConfig.lastSyncTime).toLocaleString()})
                  </Typography>
                )}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOpenSyncDialog(true)}
              disabled={isSyncing}
              aria-label="Configure Sync"
              size="small"
            >
              <SettingsIcon />
            </IconButton>
          </Stack>
        </Paper>
      </Stack>

      <SyncDialog
        open={openSyncDialog}
        onClose={() => setOpenSyncDialog(false)}
        config={gistConfig}
        isSyncing={isSyncing}
        syncGist={syncGist}
        onSave={(config) => {
          setGistConfig(config)
          setOpenSyncDialog(false)
        }}
      />
    </Stack>
  )
}

interface SyncDialogProps {
  open: boolean
  onClose: () => void
  config: GistConfig | null
  onSave: (config: GistConfig) => void
  isSyncing: boolean
  syncGist: (
    manual?: boolean,
    forcePush?: boolean,
    forcePull?: boolean,
  ) => Promise<void>
}

const SyncDialog: FC<SyncDialogProps> = ({
  open,
  onClose,
  config,
  onSave,
  isSyncing,
  syncGist,
}) => {
  const [repoUrl, setRepoUrl] = useState(config?.repoUrl || "")
  const [token, setToken] = useState(config?.githubToken || "")
  const [interval, setIntervalValue] = useState(config?.syncInterval || 60)
  const [loading, setLoading] = useState(false)

  const message = useMessage()
  const { showConfirm } = useConfirm()

  useEffect(() => {
    if (open && config) {
      setRepoUrl(config.repoUrl)
      setToken(config.githubToken)
      setIntervalValue(config.syncInterval)
    }
  }, [open, config])

  const handleSave = async () => {
    if (!repoUrl || !token) return
    setLoading(true)
    try {
      const newConfig = {
        repoUrl,
        githubToken: token,
        syncInterval: interval,
        lastSyncTime: config?.lastSyncTime,
      }
      onSave(newConfig)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNow = async () => {
    try {
      await syncGist(true, false, false)
      message.success("Sync completed successfully")
    } catch (error) {
      console.error("Sync error:", error)

      if (
        error instanceof Error &&
        error.message.includes("corrupted or in an incompatible format")
      ) {
        showConfirm({
          title: "Remote Data Corrupted",
          content:
            "The remote sync data is corrupted or in an incompatible format.\n\n" +
            "This may happen if:\n" +
            "• The remote file was created with an older version\n" +
            "• The file was manually edited\n" +
            "• The file is corrupted\n\n" +
            "Recommended action:\n" +
            "Delete the 'musicfree.yjs' file from your GitHub repository and try syncing again to upload fresh data.",
          okText: "OK",
          onOk: () => {},
        })
      } else {
        message.error(
          `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  const handleForcePush = async () => {
    showConfirm({
      title: "Force Push",
      content:
        "This will overwrite the remote data with your local data. Remote changes will be lost.\n\n" +
        "Use this option if:\n" +
        "• The remote data is corrupted\n" +
        "• You want to replace remote data with local data\n\n" +
        "This action cannot be undone.",
      okText: "Force Push",
      okType: "danger",
      onOk: async () => {
        try {
          await syncGist(true, true, false)
          message.success("Force push completed successfully")
        } catch (error) {
          console.error("Force push error:", error)
          message.error(
            `Force push failed: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      },
    })
  }

  const handleForcePull = async () => {
    showConfirm({
      title: "Force Pull",
      content:
        "This will overwrite your local data with the remote data. Local changes will be lost.\n\n" +
        "Use this option if:\n" +
        "• Your local data is corrupted\n" +
        "• You want to replace local data with remote data\n\n" +
        "This action cannot be undone.",
      okText: "Force Pull",
      okType: "danger",
      onOk: async () => {
        try {
          await syncGist(true, false, true)
          message.success("Force pull completed successfully")
          window.location.reload()
        } catch (error) {
          console.error("Force pull error:", error)
          message.error(
            `Force pull failed: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>GitHub Repository Sync</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            placeholder="owner/repo or https://github.com/owner/repo"
          />
          <TextField
            label="GitHub Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Sync Interval</InputLabel>
            <Select
              value={interval}
              label="Sync Interval"
              onChange={(e) => setIntervalValue(Number(e.target.value))}
            >
              <MenuItem value={0}>Manual Only</MenuItem>
              <MenuItem value={10}>10 Minutes</MenuItem>
              <MenuItem value={60}>1 Hour</MenuItem>
              <MenuItem value={1440}>1 Day</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1, display: "flex", gap: 1 }}>
          <IconButton
            color="success"
            onClick={handleSyncNow}
            disabled={isSyncing || !repoUrl || !token}
            size="small"
            aria-label="Sync"
          >
            {isSyncing ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SyncIcon />
            )}
          </IconButton>
          <IconButton
            color="warning"
            onClick={handleForcePush}
            disabled={isSyncing || !repoUrl || !token}
            size="small"
            aria-label="Force Push"
          >
            <BackupIcon />
          </IconButton>
          <IconButton
            color="info"
            onClick={handleForcePull}
            disabled={isSyncing || !repoUrl || !token}
            size="small"
            aria-label="Force Pull"
          >
            <CloudDownloadIcon />
          </IconButton>
        </Box>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!repoUrl || !token || loading}
        >
          {loading ? <CircularProgress size={24} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsPage
