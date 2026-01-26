import { FC, useCallback, useMemo } from "react"
import { Button, App, Typography, Flex, Select, Divider } from "antd"
import BulbOutlined from "@ant-design/icons/BulbOutlined"
import MoonOutlined from "@ant-design/icons/MoonOutlined"
import DesktopOutlined from "@ant-design/icons/DesktopOutlined"
import { useAppStore } from "../../store"
import { clear_all_data, ThemeMode, is_builtin } from "../../api"
import { useConfirm } from "../../hooks"
import { CopyButton } from "../../components"

const { Title, Text } = Typography

const REPO_URL = "https://github.com/ahaoboy/musicfree-tauri"

// Settings page - app configuration
export const SettingsPage: FC = () => {
  const theme = useAppStore((state) => state.theme)
  const setThemeMode = useAppStore((state) => state.setThemeMode)

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
            <Text>Downloaded ♪</Text>
            <Text type="secondary">{totalAudios}</Text>
          </Flex>
          <Divider style={{ margin: "16px 0" }} />
          <Flex align="center" justify="space-between">
            <Text>Playlists</Text>
            <Text type="secondary">{userPlaylistsCount}</Text>
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
