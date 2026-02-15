import { createTheme, useColorScheme, Theme } from "@mui/material"
import { useMemo } from "react"

// Types for theme customization
declare module "@mui/material/styles" {
  interface Theme {
    custom: {
      playerBarHeight: number
      safeAreaBottom: string
      safeAreaTop: string
      radius: {
        sm: number
        md: number
        lg: number
        xl: number
      }
      buttonSize: {
        sm: number
        md: number
        lg: number
        xl: number
      }
      actionButtonSize: {
        small: number
        medium: number
        large: number
        xlarge: number
      }
      actionIconSize: {
        small: number
        medium: number
        large: number
        xlarge: number
      }
      avatarSize: {
        sm: number
        md: number
        lg: number
        player: number
      }
      zIndex: {
        miniPlayer: number
        loading: number
        header: number
        playerPage: number
      }
      transition: {
        fast: string
        normal: string
        slow: string
      }
      audioItemHeight: number
    }
  }
  interface ThemeOptions {
    custom?: {
      playerBarHeight?: number
      safeAreaBottom?: string
      safeAreaTop?: string
      radius?: {
        sm?: number
        md?: number
        lg?: number
        xl?: number
      }
      buttonSize?: {
        sm?: number
        md?: number
        lg?: number
        xl?: number
      }
      actionButtonSize?: {
        small?: number
        medium?: number
        large?: number
        xlarge?: number
      }
      actionIconSize?: {
        small?: number
        medium?: number
        large?: number
        xlarge?: number
      }
      avatarSize?: {
        sm?: number
        md?: number
        lg?: number
        player?: number
      }
      zIndex?: {
        miniPlayer?: number
        loading?: number
        header?: number
        playerPage?: number
      }
      transition?: {
        fast?: string
        normal?: string
        slow?: string
      }
      audioItemHeight?: number
    }
  }
}

// Design tokens from variables.less
const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

const BUTTON_SIZE = {
  sm: 40,
  md: 48,
  lg: 56,
  xl: 72,
}

const ACTION_BUTTON_SIZE = {
  small: 28,
  medium: 32,
  large: 40,
  xlarge: 80,
}

const ACTION_ICON_SIZE = {
  small: 18,
  medium: 20,
  large: 32,
  xlarge: 64,
}

const AVATAR_SIZE = {
  sm: 40,
  md: 60,
  lg: 80,
  player: 52,
}

const Z_INDEX = {
  miniPlayer: 100,
  loading: 9999,
  header: 10,
  playerPage: 20,
}

const TRANSITION = {
  fast: "150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  normal: "200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  slow: "300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
}

// Mixins
export const glassEffect = (theme: Theme, blur = 16) => ({
  background:
    theme.palette.mode === "light"
      ? "rgba(99, 102, 241, 0.08)"
      : "rgba(129, 140, 248, 0.12)",
  "@media (hover: hover) and (pointer: fine)": {
    backdropFilter: `blur(${blur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
  },
  "@media (hover: none)": {
    background: theme.palette.background.paper,
    opacity: 0.98,
  },
})

export const cardHoverEffect = () => ({
  transition: `all ${TRANSITION.normal}`,
  "@media (hover: hover)": {
    "&:hover": {
      borderColor: "primary.main",
      boxShadow: (theme: Theme) =>
        theme.palette.mode === "light"
          ? "0 4px 12px rgba(0, 0, 0, 0.06)"
          : "0 4px 12px rgba(0, 0, 0, 0.2)",
    },
  },
  "&:active": {
    transform: "scale(0.98)",
  },
})

const lightPalette = {
  primary: {
    main: "#6366f1",
    light: "#818cf8",
    dark: "#4f46e5",
    contrastText: "#ffffff",
  },
  background: {
    default: "#f1f5f9",
    paper: "#f8fafc",
  },
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
  },
  error: {
    main: "#ff4d4f",
  },
  warning: {
    main: "#f59e0b",
  },
  success: {
    main: "#10b981",
  },
  divider: "#e2e8f0",
  action: {
    hover: "rgba(99, 102, 241, 0.08)",
    selected: "rgba(99, 102, 241, 0.12)",
  },
}

const darkPalette = {
  primary: {
    main: "#818cf8",
    light: "#a5b4fc",
    dark: "#6366f1",
    contrastText: "#ffffff",
  },
  background: {
    default: "#0f172a",
    paper: "#1e293b",
  },
  text: {
    primary: "#f1f5f9",
    secondary: "#94a3b8",
  },
  error: {
    main: "#ef4444",
  },
  warning: {
    main: "#f59e0b",
  },
  success: {
    main: "#10b981",
  },
  divider: "rgba(255, 255, 255, 0.1)",
  action: {
    hover: "rgba(129, 140, 248, 0.12)",
    selected: "rgba(129, 140, 248, 0.16)",
  },
}

export const useTheme = () => {
  const { mode = "system", setMode } = useColorScheme()
  const theme = useMemo(() => {
    return createTheme({
      colorSchemes: {
        dark: true,
        light: true,
      },
      palette: {
        mode: mode === "light" ? "light" : "dark",
        ...(mode === "light" ? lightPalette : darkPalette),
      },
      shape: {
        borderRadius: 4,
      },
      custom: {
        playerBarHeight: 68,
        safeAreaBottom: "env(safe-area-inset-bottom, 0px)",
        safeAreaTop: "env(safe-area-inset-top, 0px)",
        radius: RADIUS,
        buttonSize: BUTTON_SIZE,
        actionButtonSize: ACTION_BUTTON_SIZE,
        actionIconSize: ACTION_ICON_SIZE,
        avatarSize: AVATAR_SIZE,
        zIndex: Z_INDEX,
        transition: TRANSITION,
        audioItemHeight: 84,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: (theme) => `
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-tap-highlight-color: transparent;
            }
            html, body, #root {
              height: 100%;
              overflow: hidden;
              touch-action: pan-x pan-y;
              user-select: none;
              -webkit-user-drag: none;
              -webkit-tap-highlight-color: transparent;
            }
            body {
              background-color: ${theme.palette.background.default};
              color: ${theme.palette.text.primary};
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
            }
            ::-webkit-scrollbar {
              width: 4px;
              height: 4px;
            }
            ::-webkit-scrollbar-track {
              background: transparent;
            }
            ::-webkit-scrollbar-thumb {
              background: ${theme.palette.divider};
              border-radius: 9999px;
              background-clip: padding-box;
              border: 1px solid transparent;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: ${theme.palette.text.secondary};
            }
          `,
        },
        MuiButton: {
          defaultProps: {
            disableRipple: true,
            disableFocusRipple: true,
            disableTouchRipple: true,
          },
          styleOverrides: {
            root: ({ theme }) => ({
              textTransform: "none",
              borderRadius: theme.custom.radius.sm / 4,
              boxShadow: "none",
              transition: `all ${theme.custom.transition.fast}`,
              "&:hover": {
                boxShadow: "none",
              },
              "&:active": {
                transform: "scale(0.96)",
              },
            }),
            containedPrimary: {
              "&:hover": {
                backgroundColor: mode === "light" ? "#818cf8" : "#a5b4fc",
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: theme.custom.radius.md / 4,
              backgroundImage: "none",
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }),
          },
        },
        MuiTabs: {
          styleOverrides: {
            root: ({ theme }) => ({
              minHeight: 48,
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }),
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              fontSize: "0.8125rem", // 13px
            },
          },
        },
        MuiListItemIcon: {
          styleOverrides: {
            root: {
              minWidth: "32px !important",
              "& .MuiSvgIcon-root": {
                fontSize: "1.125rem", // 18px
              },
            },
          },
        },
        MuiSlider: {
          styleOverrides: {
            thumb: { transition: "none" },
            track: { transition: "none" },
            rail: { transition: "none" },
            valueLabel: { transition: "none" },
          },
        },
      },
    })
  }, [mode])
  return { mode, setMode, theme }
}
