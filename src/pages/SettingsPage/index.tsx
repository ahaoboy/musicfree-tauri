import { FC, useCallback, useMemo, useState } from "react"
import { Button, App, Typography, Flex, Select, Divider } from "antd"
import BulbOutlined from "@ant-design/icons/BulbOutlined"
import MoonOutlined from "@ant-design/icons/MoonOutlined"
import DesktopOutlined from "@ant-design/icons/DesktopOutlined"
import { useAppStore } from "../../store"
import {
  clear_all_data,
  ThemeMode,
  is_builtin,
  export_data,
  import_data,
} from "../../api"
import { useConfirm } from "../../hooks"
import { CopyButton } from "../../components"

const { Title, Text } = Typography

const REPO_URL = "https://github.com/ahaoboy/musicfree-tauri"

// Settings page - app configuration
export const SettingsPage: FC = () => {
  const theme = useAppStore((state) => state.theme)
  const setThemeMode = useAppStore((state) => state.setThemeMode)
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

  const { message } = App.useApp()
  const { showConfirm } = useConfirm()

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

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
          window.location.reload()
        } catch (e) {
          console.error(e)
          message.error("Failed to clear data")
        }
      },
    })
  }, [showConfirm, message])

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
    } catch (e: any) {
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

  const themeOptions = useMemo(
    () => [
      {
        value: "light" as ThemeMode,
        label: (
          <Flex align="center" gap={8}>
            <BulbOutlined />
            Light
          </Flex>
        ),
      },
      {
        value: "dark" as ThemeMode,
        label: (
          <Flex align="center" gap={8}>
            <MoonOutlined />
            Dark
          </Flex>
        ),
      },
      {
        value: "auto" as ThemeMode,
        label: (
          <Flex align="center" gap={8}>
            <DesktopOutlined />
            System
          </Flex>
        ),
      },
    ],
    [],
  )

  return (
    <Flex vertical gap="large" className="page settings-page">
      {/* Theme Section */}
      <Flex vertical gap="middle">
        <Title level={5} style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
          THEME
        </Title>
        <Select
          value={theme}
          onChange={setThemeMode}
          options={themeOptions}
          style={{ width: "100%" }}
          size="large"
        />
      </Flex>

      {/* Library Section */}
      <Flex vertical gap="middle">
        <Title level={5} style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
          LIBRARY
        </Title>
        <Flex
          vertical
          style={{
            background: "var(--bg-card)",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            padding: 16,
          }}
        >
          <Flex align="center" justify="space-between">
            <Text>Downloaded</Text>
            <Text type="secondary">
              ♪ {totalAudios} 🎶{userPlaylistsCount}
            </Text>
          </Flex>
        </Flex>
      </Flex>

      {/* About Section */}
      <Flex vertical gap="middle">
        <Title level={5} style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
          ABOUT
        </Title>
        <Flex
          vertical
          style={{
            background: "var(--bg-card)",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            padding: 16,
          }}
        >
          <Flex align="center" justify="space-between">
            <Text>Version</Text>
            <Text type="secondary">{version || "Loading..."}</Text>
          </Flex>
          <Divider style={{ margin: "16px 0" }} />
          <Flex align="center" justify="space-between">
            <Text>Repository</Text>
            <CopyButton
              text={REPO_URL}
              successMessage="Repository URL copied to clipboard"
              errorMessage="Failed to copy URL"
            />
          </Flex>
          <Divider style={{ margin: "16px 0" }} />
          <Flex align="center" justify="space-between">
            <Text>App Directory</Text>
            <CopyButton
              text={appDir || ""}
              successMessage="Path copied to clipboard"
              errorMessage="Failed to copy path"
              disabled={!appDir}
            />
          </Flex>
        </Flex>
      </Flex>

      {/* Data Management Section */}
      <Flex vertical gap="middle">
        <Title level={5} style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
          DATA MANAGEMENT
        </Title>
        <Flex
          vertical
          style={{
            background: "var(--bg-card)",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            padding: 16,
          }}
        >
          <Flex align="center" justify="space-between">
            <Flex vertical>
              <Text>Backup & Restore</Text>
            </Flex>
            <Flex gap="small">
              <Button onClick={handleExport} loading={exporting}>
                Export
              </Button>
              <Button onClick={handleImport} loading={importing}>
                Import
              </Button>
            </Flex>
          </Flex>
          <Divider style={{ margin: "16px 0" }} />
          <Flex align="center" justify="space-between">
            <Text>Clear All Data</Text>
            <Button danger type="primary" onClick={handleClearData}>
              Clear
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default SettingsPage
