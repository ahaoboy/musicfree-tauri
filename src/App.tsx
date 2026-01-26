import {
  FC,
  useCallback,
  useState,
  Suspense,
  memo,
  useEffect,
  useMemo,
  Activity,
} from "react"
import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
  useLocation,
  Navigate,
  Outlet,
  ScrollRestoration,
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

import PlaylistsPage from "./pages/PlaylistsPage"
import MusicPage from "./pages/MusicPage"
import SearchPage from "./pages/SearchPage"
import SettingsPage from "./pages/SettingsPage"
import PlayerPage from "./pages/PlayerPage"

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
  const currentTab = useMemo(() => {
    // Handle nested routes like /playlists/:id
    const basePath = `/${location.pathname.split("/")[1]}`
    return ROUTE_TO_TAB[basePath] || "playlists"
  }, [location.pathname])

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(TAB_TO_ROUTE[tab as Tab])
    },
    [navigate],
  )

  useEffect(() => {
    loadConfig()

    // Auto-pause on device change (e.g. bluetooth disconnect)
    const handleDeviceChange = () => {
      const { isPlaying, pauseAudio } = useAppStore.getState()
      if (isPlaying) {
        pauseAudio()
      }
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      )
    }
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
  const showPlayerCard = ["/playlists", "/music"].some((i) =>
    location.pathname.startsWith(i),
  )
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
            {/* ScrollRestoration for automatic scroll position restoration */}
            <ScrollRestoration />
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
                      {/* Use Activity for keep-alive on each tab */}
                      <Activity
                        mode={currentTab === "playlists" ? "visible" : "hidden"}
                      >
                        {currentTab === "playlists" && <Outlet />}
                      </Activity>
                      <Activity
                        mode={currentTab === "music" ? "visible" : "hidden"}
                      >
                        {(currentTab === "music" ||
                          location.pathname === "/music") && <MusicPage />}
                      </Activity>
                      <Activity
                        mode={currentTab === "search" ? "visible" : "hidden"}
                      >
                        {(currentTab === "search" ||
                          location.pathname === "/search") && <SearchPage />}
                      </Activity>
                      <Activity
                        mode={currentTab === "settings" ? "visible" : "hidden"}
                      >
                        {(currentTab === "settings" ||
                          location.pathname === "/settings") && (
                          <SettingsPage />
                        )}
                      </Activity>
                    </PageErrorBoundary>
                  </Suspense>
                </Flex>
                <Activity mode={showPlayerCard ? "visible" : "hidden"}>
                  <PlayerCard audio={currentAudio} />
                </Activity>
              </Flex>
            )}
          </NavigationContext.Provider>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  )
})

AppLayout.displayName = "AppLayout"

// Create router with DataRouter API
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/playlists" replace />,
      },
      {
        path: "playlists/*",
        element: <PlaylistsPage />,
      },
      {
        path: "music",
        element: null, // Rendered via Activity
      },
      {
        path: "search",
        element: null, // Rendered via Activity
      },
      {
        path: "settings",
        element: null, // Rendered via Activity
      },
      {
        path: "player",
        element: <PlayerPage />,
      },
    ],
  },
])

// App entry
const App: FC = () => {
  return <RouterProvider router={router} />
}

export default App
