import { FC, ReactNode, MouseEvent } from "react"
import { Button as AntButton, ButtonProps as AntButtonProps } from "antd"
import {
  Button as MobileButton,
  ButtonProps as MobileButtonProps,
} from "antd-mobile"
import { is_android } from "../../api"

export interface AdaptiveButtonProps {
  children?: ReactNode
  icon?: ReactNode
  onClick?: (e: MouseEvent<HTMLElement>) => void
  disabled?: boolean
  className?: string
  /** Ant Design type which will be mapped to Ant Mobile fill/color */
  type?: AntButtonProps["type"]
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Stop event propagation */
  stopPropagation?: boolean
  /** Aria label for accessibility */
  "aria-label"?: string
  /** Additional styles */
  style?: React.CSSProperties
  /** Icon size override */
  iconSize?: number
  /** Loading state */
  loading?: boolean
}

/**
 * AdaptiveButton - A bridge component that uses antd-mobile on Android
 * and antd on other platforms to resolve interaction issues.
 */
export const AdaptiveButton: FC<AdaptiveButtonProps> = ({
  children,
  icon,
  onClick,
  disabled,
  className,
  type = "default",
  size = "middle",
  stopPropagation,
  "aria-label": ariaLabel,
  style,
  iconSize,
  loading,
}) => {
  const isAndroid = is_android()

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (stopPropagation) {
      e.stopPropagation()
    }
    if (!disabled) {
      onClick?.(e)
    }
  }

  // Ant Design Implementation (Desktop)
  if (!isAndroid) {
    return (
      <AntButton
        type={type}
        icon={icon}
        onClick={handleClick}
        disabled={disabled}
        className={className}
        size={size}
        aria-label={ariaLabel}
        style={style}
        loading={loading}
      >
        {children}
      </AntButton>
    )
  }

  // Ant Design Mobile Implementation (Android)
  // Mapping logic:
  // type="text" -> fill="none"
  // type="primary" -> color="primary" fill="solid"
  // type="link" -> fill="none"

  // mapping:
  // dangerously set type="primary" to danger color if type is "primary" AND color is danger?
  // No, let's keep it simple as per user request.

  const mobileFill: MobileButtonProps["fill"] =
    type === "text" || type === "link" ? "none" : "solid"

  let mobileColor: MobileButtonProps["color"] = "default"
  if (type === "primary") mobileColor = "primary"

  const mobileSize: MobileButtonProps["size"] =
    size === "small" ? "mini" : size === "large" ? "large" : "middle"

  return (
    <MobileButton
      color={mobileColor}
      fill={mobileFill}
      disabled={disabled || loading}
      loading={loading}
      onClick={handleClick as any}
      className={className}
      size={mobileSize}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon && !loading && (
        <span
          style={{
            marginRight: children ? 8 : 0,
            display: "inline-flex",
            fontSize: iconSize,
          }}
        >
          {icon}
        </span>
      )}
      {children}
    </MobileButton>
  )
}

export default AdaptiveButton
