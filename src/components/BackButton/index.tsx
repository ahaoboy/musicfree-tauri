import { FC, useCallback, MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@mui/material"
import { ChevronLeft } from "@mui/icons-material"
import { useAdaptiveSize, AdaptiveSize } from "../../hooks"

interface BackButtonProps {
  /** Custom navigation path (default: go back -1) */
  to?: string | number
  variant?: "text" | "outlined" | "contained"
  color?:
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning"
  /** Additional className */
  className?: string
  /** Button size */
  size?: AdaptiveSize
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
  variant = "text",
  color = "inherit",
  className,
  size,
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
        navigate(to as number)
      }
    },
    [onClick, to, navigate],
  )

  const { buttonSize, iconSize, muiSize } = useAdaptiveSize(size)
  const iconStyle = { fontSize: iconSize }

  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleClick}
      className={className}
      size={muiSize}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{
        minWidth: 0,
        p: 0,
        width: buttonSize,
        height: buttonSize,
        borderRadius: 1,
      }}
    >
      <ChevronLeft style={iconStyle} />
    </Button>
  )
}

export default BackButton
