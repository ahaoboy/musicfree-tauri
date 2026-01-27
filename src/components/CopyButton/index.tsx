import { FC, useState, useCallback, ReactNode } from "react"
import { App } from "antd"
import CopyOutlined from "@ant-design/icons/CopyOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { AdaptiveButton } from "../AdaptiveButton"

interface CopyButtonProps {
  /** Text to copy to clipboard */
  text: string
  /** Custom icon to display (default: CopyOutlined) */
  icon?: ReactNode
  /** Icon to show when copied (default: CheckOutlined) */
  copiedIcon?: ReactNode
  /** Success message (default: "Copied to clipboard") */
  successMessage?: string
  /** Error message (default: "Failed to copy") */
  errorMessage?: string
  /** Duration to show copied state in ms (default: 2000) */
  copiedDuration?: number
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Disabled state */
  disabled?: boolean
}

/**
 * CopyButton - Uses AdaptiveButton for reliable copy interaction.
 */
export const CopyButton: FC<CopyButtonProps> = ({
  text,
  icon = <CopyOutlined />,
  copiedIcon = <CheckOutlined />,
  successMessage = "Copied to clipboard",
  errorMessage = "Failed to copy",
  copiedDuration = 2000,
  type = "text",
  className,
  size,
  disabled,
}) => {
  const [copied, setCopied] = useState(false)
  const { message } = App.useApp()

  const handleCopy = useCallback(async () => {
    if (!text || disabled) return

    try {
      await writeText(text)
      setCopied(true)
      message.success(successMessage)
      setTimeout(() => setCopied(false), copiedDuration)
    } catch (e) {
      console.error("Copy failed:", e)
      message.error(errorMessage)
    }
  }, [text, disabled, successMessage, errorMessage, copiedDuration, message])

  return (
    <AdaptiveButton
      type={type}
      icon={copied ? copiedIcon : icon}
      onClick={handleCopy}
      className={className}
      size={size}
      disabled={disabled}
    />
  )
}

export default CopyButton
