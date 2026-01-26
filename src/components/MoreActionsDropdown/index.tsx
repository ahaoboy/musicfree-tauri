import { FC, useCallback, useMemo } from "react"
import { Button, Dropdown, App } from "antd"
import type { MenuProps } from "antd"
import MoreOutlined from "@ant-design/icons/MoreOutlined"
import SendOutlined from "@ant-design/icons/SendOutlined"
import ShareAltOutlined from "@ant-design/icons/ShareAltOutlined"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { openUrl } from "@tauri-apps/plugin-opener"

// MenuInfo type from Ant Design
interface MenuInfo {
  key: string
  keyPath: string[]
  domEvent: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
}

export interface MoreActionsDropdownProps {
  url?: string
  onDelete?: () => void // Made optional for PlayerPage use case
  disabled?: boolean
  className?: string // Allow custom styling
}

export const MoreActionsDropdown: FC<MoreActionsDropdownProps> = ({
  url,
  onDelete,
  disabled = false,
  className,
}) => {
  const { message } = App.useApp()

  const handleCopyUrl = useCallback(
    async (info: MenuInfo) => {
      // Stop event propagation to prevent triggering AudioCard click
      info.domEvent.stopPropagation()
      info.domEvent.preventDefault()

      if (!url) return

      try {
        await writeText(url)
        message.success("URL copied to clipboard")
      } catch (error) {
        console.error("Failed to copy URL:", error)
        message.error("Failed to copy URL")
      }
    },
    [url, message],
  )

  const handleOpenInBrowser = useCallback(
    async (info: MenuInfo) => {
      // Stop event propagation to prevent triggering AudioCard click
      info.domEvent.stopPropagation()
      info.domEvent.preventDefault()

      if (!url) return

      try {
        await openUrl(url)
      } catch (error) {
        console.error("Failed to open URL:", error)
        message.error("Failed to open URL in browser")
      }
    },
    [url, message],
  )

  const handleDelete = useCallback(
    (info: MenuInfo) => {
      // Stop event propagation to prevent triggering AudioCard click
      info.domEvent.stopPropagation()
      info.domEvent.preventDefault()

      onDelete?.()
    },
    [onDelete],
  )

  // Build menu items dynamically based on whether onDelete is provided
  const items: MenuProps["items"] = useMemo(() => {
    const baseItems: MenuProps["items"] = [
      {
        key: "copy",
        label: "Copy URL",
        icon: <SendOutlined />,
        disabled: !url,
        onClick: handleCopyUrl,
      },
      {
        key: "open",
        label: "Open in Browser",
        icon: <ShareAltOutlined />,
        disabled: !url,
        onClick: handleOpenInBrowser,
      },
    ]

    // Only add delete option if onDelete is provided
    if (onDelete) {
      baseItems.push(
        {
          type: "divider",
        },
        {
          key: "delete",
          label: "Delete",
          icon: <DeleteOutlined />,
          danger: true,
          onClick: handleDelete,
        },
      )
    }

    return baseItems
  }, [url, onDelete, handleCopyUrl, handleOpenInBrowser, handleDelete])

  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      placement="bottomRight"
      disabled={disabled}
      styles={{
        root: {
          zIndex: 30,
        },
      }}
    >
      <Button
        type="text"
        icon={<MoreOutlined />}
        className={className}
        onClick={(e) => {
          e.stopPropagation()
        }}
      />
    </Dropdown>
  )
}

export default MoreActionsDropdown
