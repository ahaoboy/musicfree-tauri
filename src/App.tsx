import {
  FC,
  useCallback,
  useState,
  Suspense,
  lazy,
  memo,
  useEffect,
  useMemo,
} from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom"
import {
  PlayerCard,
  ErrorBoundary,
  PageErrorBoundary,
  LoadingFallback,
} from "./components"
import { NavigationContext, NavigationContextType } from "./contexts"

type Tab = "playlists" | "music" | "search" | "settings"
import UnorderedListOutlined from "@ant-design/icons/UnorderedListOutlined"
import CustomerServiceOutlined from "@ant-design/icons/CustomerServiceOutlined"
import SearchOutlined from "@ant-design/icons/SearchOutlined"
import SettingOutlined from "@ant-design/icons/SettingOutlined"
import {
  ConfigProvider,
  theme as antdTheme,
  App as AntApp,
  Tabs,
  Flex,
} from "antd"
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

// Tab items configuration
const TAB_ITEMS = [
  {
    key: "playlists",
    label: <UnorderedListOutlined style={{ fontSize: 24 }} />,
  },
  {
    key: "music",
    label: <CustomerServiceOutlined style={{ fontSize: 24 }} />,
  },
  {
    key: "search",
    label: <SearchOutlined style={{ fontSize: 24 }} />,
  },
  {
    key: "settings",
    label: <SettingOutlined style={{ fontSize: 24 }} />,
  },
]

// Main layout component
const AppLayout: FC = memo(() => {
  const navigate = useNavigate()
  const location = useLocation()

  // Navigation state
  const [isInDetailView, setIsInDetailView] = useState(false)
  const [onBackFromDetail, setOnBackFromDetail] = useState<(() => void) | null>(
    null,
  )

  // Selective store subscriptions
  const currentAudio = useAppStore((state) => state.currentAudio)
  const isConfigLoading = useAppStore((state) => state.isConfigLoading)
  const loadConfig = useAppStore((state) => state.loadConfig)

  const isDark = useAppStore((state) => state.isDark())

  // Get current tab - memoize to avoid recalculation
  const currentTab = useMemo(
    () => ROUTE_TO_TAB[location.pathname] || "playlists",
    [location.pathname],
  )

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(TAB_TO_ROUTE[tab as Tab])
    },
    [navigate],
  )

  useEffect(() => {
    loadConfig()
  }, [])

  // Handle swipe gesture
  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (direction !== "left" && direction !== "right") return

      // Detail view back navigation
      if (isInDetailView && direction === "right") {
        if (onBackFromDetail) {
          onBackFromDetail()
        }
        return
      }

      // Tab switching
      const currentIndex = TAB_ORDER.indexOf(currentTab)

      if (direction === "left" && currentIndex < TAB_ORDER.length - 1) {
        navigate(TAB_TO_ROUTE[TAB_ORDER[currentIndex + 1]])
      } else if (direction === "right" && currentIndex > 0) {
        navigate(TAB_TO_ROUTE[TAB_ORDER[currentIndex - 1]])
      }
    },
    [currentTab, isInDetailView, onBackFromDetail, navigate],
  )

  const swipeHandlers = useSwipe(handleSwipe, {
    threshold: 50,
    excludeSelectors: [
      ".ant-slider", // Exclude Ant Design Slider
      ".player-controls-container", // Exclude player controls
      ".progress-bar", // Exclude progress bar
      "button", // Exclude all buttons
      "input", // Exclude inputs
      ".ant-checkbox", // Exclude checkboxes
    ],
  })

  // Navigation context value
  const navigationContextValue: NavigationContextType = {
    isInDetailView,
    setIsInDetailView,
    onBackFromDetail,
    setOnBackFromDetail,
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#6366f1",
          borderRadius: 12,
        },
      }}
    >
      <AntApp message={{ top: 100 }}>
        <ErrorBoundary onReset={() => window.location.reload()}>
          <NavigationContext.Provider value={navigationContextValue}>
            {isConfigLoading ? (
              <LoadingFallback fullscreen tip="Loading configuration..." />
            ) : (
              <Flex
                vertical
                className="app"
                style={{ height: "100vh" }}
                {...swipeHandlers}
              >
                <Tabs
                  activeKey={currentTab}
                  onChange={handleTabChange}
                  centered
                  tabBarGutter={0}
                  className="top-tabs"
                  items={TAB_ITEMS}
                />
                <Flex
                  vertical
                  flex={1}
                  component="main"
                  className="main-content"
                  style={{ overflow: "hidden" }}
                >
                  <Suspense fallback={<LoadingFallback />}>
                    <PageErrorBoundary>
                      <Routes>
                        <Route
                          path="/"
                          element={<Navigate to="/playlists" replace />}
                        />
                        <Route
                          path="/playlists/*"
                          element={<PlaylistsPage />}
                        />
                        <Route path="/music" element={<MusicPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/player" element={<PlayerPage />} />
                      </Routes>
                    </PageErrorBoundary>
                  </Suspense>
                </Flex>
                {!["search", "settings"].includes(currentTab) && (
                  <PlayerCard audio={currentAudio} />
                )}
              </Flex>
            )}
          </NavigationContext.Provider>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  )
})

AppLayout.displayName = "AppLayout"

// App entry
const App: FC = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
