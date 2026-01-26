import {
  FC,
  useCallback,
  useState,
  useEffect,
  useMemo,
  Activity,
  memo,
  useRef,
  Suspense,
} from "react"
import { useNavigate, useLocation, useMatches } from "react-router-dom"
import {
  ConfigProvider,
  theme as antdTheme,
  App as AntApp,
  Tabs,
  Flex,
} from "antd"
import UnorderedListOutlined from "@ant-design/icons/UnorderedListOutlined"
import CustomerServiceOutlined from "@ant-design/icons/CustomerServiceOutlined"
import SearchOutlined from "@ant-design/icons/SearchOutlined"
import SettingOutlined from "@ant-design/icons/SettingOutlined"

import {
  PlayerCard,
  ErrorBoundary,
  PageErrorBoundary,
  LoadingFallback,
} from "../components"
import { NavigationContext, NavigationContextType } from "../contexts"
import { useAppStore } from "../store"
import { useSwipe, SwipeDirection } from "../hooks"
import { Tab, TAB_TO_ROUTE, TAB_ORDER } from "./index"

// Page imports for Keep-Alive
import PlaylistsPage from "../pages/PlaylistsPage"
import MusicPage from "../pages/MusicPage"
import SearchPage from "../pages/SearchPage"
import SettingsPage from "../pages/SettingsPage"
import PlayerPage from "../pages/PlayerPage"
import { PlaylistDetail } from "../pages/PlaylistsPage/PlaylistDetail"

import "../styles/index.less"

// Tab items configuration
const TAB_ITEMS = [
  {
    key: "playlists",
    label: <UnorderedListOutlined style={{ fontSize: 24 }} />,
  },
  { key: "music", label: <CustomerServiceOutlined style={{ fontSize: 24 }} /> },
  { key: "search", label: <SearchOutlined style={{ fontSize: 24 }} /> },
  { key: "settings", label: <SettingOutlined style={{ fontSize: 24 }} /> },
]

export const AppLayout: FC = memo(() => {
  const navigate = useNavigate()
  const location = useLocation()
  const matches = useMatches()

  // Navigation state
  const [isInDetailView, setIsInDetailView] = useState(false)
  const [onBackFromDetail, setOnBackFromDetail] = useState<(() => void) | null>(
    null,
  )

  // Scroll restoration refs
  const scrollPositions = useRef<Map<string, number>>(new Map())
  const isRestoringScroll = useRef(false)

  // Store subscriptions
  const currentAudio = useAppStore((state) => state.currentAudio)
  const isConfigLoading = useAppStore((state) => state.isConfigLoading)
  const loadConfig = useAppStore((state) => state.loadConfig)
  const isDark = useAppStore((state) => state.isDark())

  // Get route metadata
  const routeHandle = useMemo(() => {
    const match = matches[matches.length - 1]
    return (match?.handle || {}) as {
      isTab?: boolean
      tabKey?: Tab
      isDetail?: boolean
      parentTab?: Tab
      isSpecial?: boolean
    }
  }, [matches])

  // Current tab
  const currentTab = useMemo(() => {
    if (routeHandle.isTab) return routeHandle.tabKey
    if (routeHandle.isDetail) return routeHandle.parentTab
    return "playlists" as Tab
  }, [routeHandle])

  // Show player card on tab pages and detail pages
  const showPlayerCard = useMemo(() => {
    return !routeHandle.isSpecial
  }, [routeHandle])

  // Handle scroll saving before route change
  useEffect(() => {
    const saveScroll = () => {
      const el = document.querySelector(".page")
      if (el && !isRestoringScroll.current) {
        scrollPositions.current.set(location.pathname, el.scrollTop)
      }
    }
    return () => saveScroll()
  }, [location.pathname])

  // Handle scroll restoration after route change
  useEffect(() => {
    const restoreScroll = () => {
      const el = document.querySelector(".page")
      if (el) {
        const saved = scrollPositions.current.get(location.pathname)
        if (saved !== undefined) {
          isRestoringScroll.current = true
          requestAnimationFrame(() => {
            el.scrollTop = saved
            setTimeout(() => {
              isRestoringScroll.current = false
            }, 100)
          })
        } else {
          el.scrollTop = 0
        }
      }
    }
    // Wait for next tick to ensure component is updated
    const timer = setTimeout(restoreScroll, 0)
    return () => clearTimeout(timer)
  }, [location.pathname])

  // Update detail view state
  useEffect(() => {
    if (!routeHandle.isDetail && location.pathname !== "/player") {
      setIsInDetailView(false)
      setOnBackFromDetail(null)
    }
  }, [routeHandle.isDetail, location.pathname])

  // Load config on mount
  useEffect(() => {
    loadConfig()

    const handleDeviceChange = () => {
      const { isPlaying, pauseAudio } = useAppStore.getState()
      if (isPlaying) pauseAudio()
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      )
    }
  }, [loadConfig])

  // Tab change handler
  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(TAB_TO_ROUTE[tab as Tab])
    },
    [navigate],
  )

  // Swipe gesture handler
  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (direction !== "left" && direction !== "right") return
      // Don't handle swipe on player page for tab switching, but allow back navigation
      if (location.pathname === "/player") {
        if (direction === "right") {
          navigate(-1)
        }
        return
      }

      // Detail view back navigation
      if (isInDetailView && direction === "right") {
        if (onBackFromDetail) onBackFromDetail()
        return
      }

      // Tab switching
      const currentIndex = TAB_ORDER.indexOf(currentTab || "playlists")
      if (direction === "left" && currentIndex < TAB_ORDER.length - 1) {
        navigate(TAB_TO_ROUTE[TAB_ORDER[currentIndex + 1]])
      } else if (direction === "right" && currentIndex > 0) {
        navigate(TAB_TO_ROUTE[TAB_ORDER[currentIndex - 1]])
      }
    },
    [currentTab, isInDetailView, onBackFromDetail, navigate, location.pathname],
  )

  const swipeHandlers = useSwipe(handleSwipe, {
    threshold: 50,
    excludeSelectors: [
      ".ant-slider",
      ".player-controls-container",
      ".progress-bar",
      "button",
      "input",
      ".ant-checkbox",
    ],
  })

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
                {/* Tab bar - hide on special pages */}
                {!routeHandle.isSpecial && (
                  <Tabs
                    activeKey={currentTab || "playlists"}
                    onChange={handleTabChange}
                    centered
                    tabBarGutter={0}
                    className="top-tabs"
                    items={TAB_ITEMS}
                  />
                )}

                <Flex
                  vertical
                  flex={1}
                  component="main"
                  className={`main-content ${showPlayerCard ? "has-player-card" : ""}`}
                  style={{ overflow: "hidden" }}
                >
                  <Suspense fallback={<LoadingFallback />}>
                    <PageErrorBoundary>
                      {/* Persistent tab pages */}
                      <Activity
                        mode={
                          currentTab === "playlists" && !routeHandle.isDetail
                            ? "visible"
                            : "hidden"
                        }
                      >
                        <PlaylistsPage />
                      </Activity>
                      <Activity
                        mode={currentTab === "music" ? "visible" : "hidden"}
                      >
                        <MusicPage />
                      </Activity>
                      <Activity
                        mode={currentTab === "search" ? "visible" : "hidden"}
                      >
                        <SearchPage />
                      </Activity>
                      <Activity
                        mode={currentTab === "settings" ? "visible" : "hidden"}
                      >
                        <SettingsPage />
                      </Activity>

                      <Activity
                        mode={routeHandle.isDetail ? "visible" : "hidden"}
                      >
                        <PlaylistDetail />
                      </Activity>

                      <Activity
                        mode={routeHandle.isSpecial ? "visible" : "hidden"}
                      >
                        <PlayerPage />
                      </Activity>
                    </PageErrorBoundary>
                  </Suspense>
                </Flex>

                {/* Player card */}
                {showPlayerCard && (
                  <Activity mode="visible">
                    <PlayerCard audio={currentAudio} />
                  </Activity>
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
