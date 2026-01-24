import { FC, useCallback, MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "antd"
import LeftOutlined from "@ant-design/icons/LeftOutlined"

interface BackButtonProps {
  /** Custom navigation path (default: go back -1) */
  to?: string | number
  /** Button type */
  type?: "text" | "link" | "default" | "primary" | "dashed"
  /** Additional className */
  className?: string
  /** Button size */
  size?: "small" | "middle" | "large"
  /** Custom icon (default: LeftOutlined) */
  icon?: React.ReactNode
  /** Custom onClick handler (called before navigation) */
  onClick?: (e: MouseEvent<HTMLElement>) => undefined | boolean
  /** Disabled state */
  disabled?: boolean
  /** ARIA label */
  ariaLabel?: string
}

/**
 * BackButton - A reusable back navigation button
 *
 * @example
 * // Basic usage (go back)
 * <BackButton />
 *
 * @example
 * // Navigate to specific path
 * <BackButton to="/home" />
 *
 * @example
 * // Go back multiple steps
 * <BackButton to={-2} />
 *
 * @example
 * // Custom styling
 * <BackButton className="icon-btn" />
 *
 * @example
 * // Custom handler
 * <BackButton
 *   onClick={(e) => {
 *     console.log('Going back')
 *     // Return false to prevent navigation
 *     return true
 *   }}
 * />
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
      if (disabled) return

      // Call custom onClick handler if provided
      if (onClick) {
        const result = onClick(e)
        // If onClick returns false, prevent navigation
        if (result === false) return
      }

      // Navigate
      if (typeof to === "string") {
        navigate(to)
      } else {
        navigate(to)
      }
    },
    [disabled, onClick, to, navigate],
  )

  return (
    <Button
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
