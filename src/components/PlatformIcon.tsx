import { FC, useMemo } from "react"
import { useTheme } from "@mui/material/styles"
import { YouTube, Public, Help, LiveTv } from "@mui/icons-material"

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
  size,
}) => {
  const theme = useTheme()

  const iconStyle = useMemo(
    () => ({
      fontSize: size ?? "inherit",
      verticalAlign: "middle",
      ...style,
    }),
    [size, style],
  )

  switch (platform.toLowerCase()) {
    case "bilibili":
      return (
        <LiveTv
          className={className}
          style={{ ...iconStyle, color: "#00a1d6" }}
          titleAccess="Bilibili"
        />
      )
    case "youtube":
      return (
        <YouTube
          className={className}
          style={{ ...iconStyle, color: "#ff0000" }}
          titleAccess="YouTube"
        />
      )
    case "file":
      return (
        <Public
          className={className}
          style={{
            ...iconStyle,
            color: theme.palette.text.secondary,
          }}
          titleAccess={platform}
        />
      )
    default:
      return (
        <Help
          className={className}
          style={{
            ...iconStyle,
            color: theme.palette.text.secondary,
          }}
          titleAccess={platform || "Unknown"}
        />
      )
  }
}
