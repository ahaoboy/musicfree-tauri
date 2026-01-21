import { FC } from "react"
import {
  UnorderedListOutlined,
  CustomerServiceOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons"

type Tab = "playlists" | "music" | "search" | "settings"

interface TopNavProps {
  activeTab: Tab
  onChange: (tab: Tab) => void
}

interface NavItem {
  key: Tab
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { key: "playlists", label: "Playlists", icon: <UnorderedListOutlined /> },
  { key: "music", label: "Music", icon: <CustomerServiceOutlined /> },
  { key: "search", label: "Search", icon: <SearchOutlined /> },
  { key: "settings", label: "Settings", icon: <SettingOutlined /> },
]

// Top navigation bar component
export const TopNav: FC<TopNavProps> = ({ activeTab, onChange }) => {
  return (
    <nav className="top-nav">
      {navItems.map((item) => (
        <div
          key={item.key}
          className={`nav-item ${activeTab === item.key ? "active" : ""}`}
          onClick={() => onChange(item.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onChange(item.key)
            }
          }}
        >
          <span className="nav-icon">{item.icon}</span>
          {/* <span className="nav-label">{item.label}</span> */}
        </div>
      ))}
    </nav>
  )
}

export type { Tab }
export default TopNav
