import { FC, useEffect, useState } from "react"
import { Button, App, Tooltip, Typography, Flex } from "antd"
import {
  BulbOutlined,
  MoonOutlined,
  DesktopOutlined,
  CopyOutlined,
} from "@ant-design/icons"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { useAppStore } from "../../store"
import { clear_all_data, app_dir, app_version, ThemeMode } from "../../api"

const { Title, Text } = Typography

interface ThemeOptionProps {
  mode: ThemeMode
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}

// Theme option button component
const ThemeOption: FC<ThemeOptionProps> = ({
  icon,
  label,
  active,
  onClick,
}) => {
  return (
    <Flex
      align="center"
      gap="middle"
      className={`theme-option ${active ? "active" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick()
        }
      }}
    >
      <span className="option-icon">{icon}</span>
      <Text className="option-label">{label}</Text>
    </Flex>
  )
}

// Settings page - app configuration
export const SettingsPage: FC = () => {
  const {
    setThemeMode,
    config: { audios, playlists, theme },
  } = useAppStore()
  const [appDirPath, setAppDirPath] = useState<string>("")
  const { modal, message } = App.useApp()
  const [version, setVersion] = useState<string>("")

  useEffect(() => {
    app_dir().then(setAppDirPath).catch(console.error)
    app_version().then(setVersion).catch(console.error)
  }, [])

  return (
    <Flex vertical gap="large" className="page settings-page">
      <Flex vertical gap="middle" className="settings-section">
        <Title level={5} className="section-title">
          Theme
        </Title>
        <Flex vertical gap="small" className="theme-options">
          <ThemeOption
            mode="light"
            icon={<BulbOutlined />}
            label="Light"
            active={theme === "light"}
            onClick={() => setThemeMode("light")}
          />
          <ThemeOption
            mode="dark"
            icon={<MoonOutlined />}
            label="Dark"
            active={theme === "dark"}
            onClick={() => setThemeMode("dark")}
          />
          <ThemeOption
            mode="auto"
            icon={<DesktopOutlined />}
            label="System"
            active={theme === "auto"}
            onClick={() => setThemeMode("auto")}
          />
        </Flex>
      </Flex>

      <Flex vertical gap="middle" className="settings-section">
        <Title level={5} className="section-title">
          Library
        </Title>
        <Flex vertical className="section-content">
          <Flex
            align="center"
            justify="space-between"
            className="settings-item"
          >
            <Text className="item-label">Downloaded Tracks</Text>
            <Text type="secondary" className="item-value">
              {audios.length}
            </Text>
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="settings-item"
          >
            <Text className="item-label">Playlists</Text>
            <Text type="secondary" className="item-value">
              {playlists.length}
            </Text>
          </Flex>
        </Flex>
      </Flex>

      <Flex vertical gap="middle" className="settings-section">
        <Title level={5} className="section-title">
          About
        </Title>
        <Flex vertical className="section-content">
          <Flex
            align="center"
            justify="space-between"
            className="settings-item"
          >
            <Text className="item-label">Version</Text>
            <Text type="secondary" className="item-value">
              {version || "Loading..."}
            </Text>
          </Flex>
          <Flex
            align="center"
            justify="space-between"
            className="settings-item"
          >
            <Text className="item-label">App Directory</Text>
            <Tooltip title="Copy Path">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={async () => {
                  if (appDirPath) {
                    try {
                      await writeText(appDirPath)
                      message.success("Path copied to clipboard")
                    } catch (e) {
                      console.error(e)
                      message.error("Failed to copy path")
                    }
                  }
                }}
              />
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>

      <Flex vertical gap="middle" className="settings-section">
        <Title level={5} className="section-title">
          Data Management
        </Title>
        <Flex vertical className="section-content">
          <Flex
            align="center"
            justify="space-between"
            className="settings-item"
          >
            <Text className="item-label">Clear All Data</Text>
            <Button
              danger
              type="primary"
              onClick={() => {
                modal.confirm({
                  title: "Clear All Data",
                  content:
                    "This will delete all downloaded music and reset your configuration. This action cannot be undone.",
                  okText: "Clear",
                  okType: "danger",
                  cancelText: "Cancel",
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
              }}
            >
              Clear
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default SettingsPage
