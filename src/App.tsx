import {
  FC,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  useState,
  Suspense,
  lazy,
} from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom"
import { ConfigProvider, theme, App as AntApp, Spin } from "antd"
import { TopNav, PlayerCard, Tab } from "./components"
import { useAppStore } from "./store"
import { useSwipe, SwipeDirection } from "./hooks"
import "./styles/index.less"

const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"))
const MusicPage = lazy(() => import("./pages/MusicPage"))
const SearchPage = lazy(() => import("./pages/SearchPage"))
const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const PlayerPage = lazy(() => import("./pages/PlayerPage"))

// Route to Tab mapping
const ROUTE_TO_TAB: Record<string, Tab> = {
  "/playlists": "playlists",
  "/music": "music",
  "/search": "search",
  "/settings": "settings",
}

const TAB_TO_ROUTE: Record<Tab, string> = {
  playlists: "/playlists",
  music: "/music",
  search: "/search",
  settings: "/settings",
}

// Tab order for swipe navigation
const TAB_ORDER: Tab[] = ["playlists", "music", "search", "settings"]

// Navigation context for child pages to report their state
interface NavigationContextType {
  isInDetailView: boolean
  setIsInDetailView: (value: boolean) => void
  onBackFromDetail: (() => void) | null
  setOnBackFromDetail: (callback: (() => void) | null) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider")
  }
  return context
}

// Main layout component with navigation
const AppLayout: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const audioRef = useRef<HTMLAudioElement>(null)

  // Navigation state for detail views
  const [isInDetailView, setIsInDetailView] = useState(false)
  const [onBackFromDetail, setOnBackFromDetail] = useState<(() => void) | null>(
    null,
  )

  const {
    loadConfig,
    setAudioElement,
    currentAudio,
    themeMode,
    isConfigLoading,
  } = useAppStore()

  // Get current tab from route
  const currentTab = ROUTE_TO_TAB[location.pathname] || "playlists"

  // Initialize app - load config
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Set audio element reference
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
    }
    return () => {
      setAudioElement(null)
    }
  }, [setAudioElement])

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: Tab) => {
      navigate(TAB_TO_ROUTE[tab])
    },
    [navigate],
  )

  // Handle swipe gesture for tab switching or back navigation
  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (direction !== "left" && direction !== "right") return

      // If in detail view, swipe right to go back
      if (isInDetailView && direction === "right") {
        if (onBackFromDetail) {
          onBackFromDetail()
        }
        return
      }

      // Normal tab switching
      const currentIndex = TAB_ORDER.indexOf(currentTab)

      if (direction === "left" && currentIndex < TAB_ORDER.length - 1) {
        // Swipe left - go to next tab
        navigate(TAB_TO_ROUTE[TAB_ORDER[currentIndex + 1]])
      } else if (direction === "right" && currentIndex > 0) {
        // Swipe right - go to previous tab
        navigate(TAB_TO_ROUTE[TAB_ORDER[currentIndex - 1]])
      }
    },
    [currentTab, isInDetailView, onBackFromDetail, navigate],
  )

  // Get swipe handlers
  const swipeHandlers = useSwipe(handleSwipe, { threshold: 50 })

  // Determine if dark mode
  const isDark = (() => {
    if (themeMode === "dark") return true
    if (themeMode === "light") return false
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return false
  })()

  // Navigation context value
  const navigationContextValue: NavigationContextType = {
    isInDetailView,
    setIsInDetailView,
    onBackFromDetail,
    setOnBackFromDetail,
  }

  // Loading state
  if (isConfigLoading) {
    return (
      <div className="app">
        <div className="loading-container" style={{ flex: 1 }}>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#6366f1",
          borderRadius: 12,
        },
      }}
    >
      <AntApp>
        <NavigationContext.Provider value={navigationContextValue}>
          <div className="app" {...swipeHandlers}>
            <TopNav activeTab={currentTab} onChange={handleTabChange} />
            <main className="main-content">
              <div className="page-transition">
                <Suspense
                  fallback={
                    <div className="loading-container">
                      <Spin size="large" />
                    </div>
                  }
                >
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/music" replace />}
                    />
                    <Route path="/playlists/*" element={<PlaylistsPage />} />
                    <Route path="/music" element={<MusicPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/player" element={<PlayerPage />} />
                  </Routes>
                </Suspense>
              </div>
            </main>
            <PlayerCard audio={currentAudio} />
            {/* biome-ignore lint/a11y/useMediaCaption: Music player does not need captions */}
            <audio ref={audioRef} />
          </div>
        </NavigationContext.Provider>
      </AntApp>
    </ConfigProvider>
  )
}

// App entry with Router
const App: FC = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
