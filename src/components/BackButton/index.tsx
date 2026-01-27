import { FC, useCallback, MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import LeftOutlined from "@ant-design/icons/LeftOutlined"
import { AdaptiveButton } from "../AdaptiveButton"

interface BackButtonProps {
  /** Custom navigation path (default: go back -1) */
  to?: string | number
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Custom icon */
  icon?: React.ReactNode
  /** Custom onClick handler */
  onClick?: (e: MouseEvent<HTMLElement>) => undefined | boolean
  /** Disabled state */
  disabled?: boolean
  /** ARIA label */
  ariaLabel?: string
}

/**
 * BackButton - USes AdaptiveButton for reliable navigation.
 */
export const BackButton: FC<BackButtonProps> = ({
  to = -1,
  type = "text",
  className,
  size,
  icon = <LeftOutlined />,
  onClick,
  disabled,
  ariaLabel = "Go back",
}) => {
  const navigate = useNavigate()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (onClick) {
        const result = onClick(e)
        if (result === false) return
      }

      if (typeof to === "string") {
        navigate(to)
      } else {
        navigate(to as any)
      }
    },
    [onClick, to, navigate],
  )

  return (
    <AdaptiveButton
      type={type}
      icon={icon}
      onClick={handleClick}
      className={className}
      size={size}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  )
}

export default BackButton
