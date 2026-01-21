import { FC, useEffect, useState } from "react"
import { Button, App, Tooltip } from "antd"
import {
  BulbOutlined,
  MoonOutlined,
  DesktopOutlined,
  CopyOutlined,
} from "@ant-design/icons"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { useAppStore, ThemeMode } from "../../store"
import { clear_all_data, app_dir, app_version } from "../../api"

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
    <div
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
      <span className="option-label">{label}</span>
    </div>
  )
}

// Settings page - app configuration
export const SettingsPage: FC = () => {
  const { themeMode, setThemeMode, audios, playlists } = useAppStore()
  const [appDirPath, setAppDirPath] = useState<string>("")
  const { modal, message } = App.useApp()
  const [version, setVersion] = useState<string>("")

  useEffect(() => {
    app_dir().then(setAppDirPath).catch(console.error)
    app_version().then(setVersion).catch(console.error)
  }, [])

  return (
    <div className="page settings-page">
      {/* ... previous content ... */}

      {/* This is just setting up the context variables, the rest of the render is below */}
      {/* Actually I should replace the whole start of the component to insert the hook */}
      {/* But since I can't do partial renders in replacement, let's just do a tailored replace */}
      {/* <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure app preferences</p>
      </div> */}

      <div className="settings-section">
        <div className="section-title">Theme</div>
        <div className="theme-options">
          <ThemeOption
            mode="light"
            icon={<BulbOutlined />}
            label="Light"
            active={themeMode === "light"}
            onClick={() => setThemeMode("light")}
          />
          <ThemeOption
            mode="dark"
            icon={<MoonOutlined />}
            label="Dark"
            active={themeMode === "dark"}
            onClick={() => setThemeMode("dark")}
          />
          <ThemeOption
            mode="auto"
            icon={<DesktopOutlined />}
            label="System"
            active={themeMode === "auto"}
            onClick={() => setThemeMode("auto")}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">Library</div>
        <div className="section-content">
          <div className="settings-item">
            <span className="item-label">Downloaded Tracks</span>
            <span className="item-value">{audios.length}</span>
          </div>
          <div className="settings-item">
            <span className="item-label">Playlists</span>
            <span className="item-value">{playlists.length}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">About</div>
        <div className="section-content">
          <div className="settings-item">
            <span className="item-label">Version</span>
            <span className="item-value">{version || "Loading..."}</span>
          </div>
          <div className="settings-item">
            <span className="item-label">App Directory</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* <span className="item-value" style={{
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                direction: 'rtl',
                textAlign: 'left'
              }}>
                {appDirPath || 'Loading...'}
              </span> */}
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
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-title">Data Management</div>
        <div className="section-content">
          <div className="settings-item">
            <span className="item-label">Clear All Data</span>
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
