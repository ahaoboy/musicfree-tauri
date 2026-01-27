import { createTheme } from "@mui/material/styles"

// Define custom colors matching the existing design
const lightPalette = {
  primary: {
    main: "#6366f1",
    light: "#818cf8",
    dark: "#4f46e5", // darker shade of #6366f1
    contrastText: "#ffffff",
  },
  background: {
    default: "#f1f5f9", // Reduced brightness from #f8fafc
    paper: "#f8fafc", // Reduced brightness from #ffffff
  },
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
  },
  error: {
    main: "#ff4d4f",
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
    main: "#ff4d4f",
  },
}

export const getTheme = (mode: "light" | "dark") => {
  return createTheme({
    palette: {
      mode,
      ...(mode === "light" ? lightPalette : darkPalette),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          },
          containedPrimary: {
            "&:hover": {
              backgroundColor: mode === "light" ? "#818cf8" : "#a5b4fc",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: "none",
          },
        },
      },
    },
    typography: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif",
    },
  })
}
