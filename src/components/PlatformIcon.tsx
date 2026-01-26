import { FC, useMemo } from "react"
import { theme } from "antd"
import BilibiliOutlined from "@ant-design/icons/BilibiliOutlined"
import YoutubeOutlined from "@ant-design/icons/YoutubeOutlined"
import GlobalOutlined from "@ant-design/icons/GlobalOutlined"
import QuestionOutlined from "@ant-design/icons/QuestionOutlined"

const { useToken } = theme

export interface PlatformIconProps {
  platform: string
  className?: string
  style?: React.CSSProperties
  size?: number
}

export const PlatformIcon: FC<PlatformIconProps> = ({
  platform,
  className,
  style,
  size = 14,
}) => {
  const { token } = useToken()
  const isDark =
    token.colorBgBase === "#000" || token.colorBgContainer.startsWith("#1")

  const iconStyle = useMemo(
    () => ({
      fontSize: size,
      ...style,
    }),
    [size, style],
  )

  switch (platform.toLowerCase()) {
    case "bilibili":
      return (
        <BilibiliOutlined
          className={className}
          style={{ ...iconStyle, color: "#00a1d6" }}
          title="Bilibili"
        />
      )
    case "youtube":
      return (
        <YoutubeOutlined
          className={className}
          style={{ ...iconStyle, color: "#ff0000" }}
          title="YouTube"
        />
      )
    case "file":
      return (
        <GlobalOutlined
          className={className}
          style={{
            ...iconStyle,
            color: isDark ? token.colorTextSecondary : token.colorTextTertiary,
          }}
          title={platform}
        />
      )
    default:
      return (
        <QuestionOutlined
          className={className}
          style={{
            ...iconStyle,
            color: isDark ? token.colorTextSecondary : token.colorTextTertiary,
          }}
          title={platform || "Unknown"}
        />
      )
  }
}
