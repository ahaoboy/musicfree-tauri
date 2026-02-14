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
  SyntheticEvent,
} from "react"
import { useNavigate, useLocation, useMatches } from "react-router-dom"
import { Box, Tabs, Tab as MuiTab, Paper } from "@mui/material"
import { QueueMusic, LibraryMusic, Search, Settings } from "@mui/icons-material"

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
import { SearchPage } from "../pages/SearchPage"
import SettingsPage from "../pages/SettingsPage"
import PlayerPage from "../pages/PlayerPage"
import { PlaylistDetail } from "../pages/PlaylistsPage/PlaylistDetail"

import "../styles/index.less"

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
  // const isDark = useAppStore((state) => state.isDark()) // Theme is handled by MUI ThemeProvider in App.tsx

  // Loading state with minimum display time
  const [showLoading, setShowLoading] = useState(true)
  const loadingStartTime = useRef<number>(Date.now())

  useEffect(() => {
    if (!isConfigLoading) {
      const elapsed = Date.now() - loadingStartTime.current
      const remaining = Math.max(0, 1000 - elapsed)

      const timer = setTimeout(() => {
        setShowLoading(false)
      }, remaining)

      return () => clearTimeout(timer)
    }
  }, [isConfigLoading])

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

  // Show player card only on specific pages
  const showPlayerCard = useMemo(() => {
    return (
      routeHandle.tabKey === "playlists" ||
      routeHandle.tabKey === "music" ||
      routeHandle.isDetail
    )
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
    (_event: SyntheticEvent, newValue: string) => {
      navigate(TAB_TO_ROUTE[newValue as Tab])
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
      ".MuiSlider-root",
      ".player-controls-container",
      ".progress-bar",
      "button",
      "input",
      ".MuiCheckbox-root",
    ],
  })

  const navigationContextValue: NavigationContextType = {
    isInDetailView,
    setIsInDetailView,
    onBackFromDetail,
    setOnBackFromDetail,
  }

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <NavigationContext.Provider value={navigationContextValue}>
        {showLoading ? (
          <LoadingFallback fullscreen tip="Loading..." />
        ) : (
          <Box
            className="app"
            sx={{
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              bgcolor: "background.default",
              color: "text.primary",
            }}
            {...swipeHandlers}
          >
            {/* Tab bar - hide on special pages */}
            {!routeHandle.isSpecial && (
              <Paper
                elevation={0}
                square
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  zIndex: 1,
                  // paddingTop: "env(safe-area-inset-top)",
                }}
              >
                <Tabs
                  value={currentTab}
                  onChange={handleTabChange}
                  centered
                  variant="fullWidth"
                  indicatorColor="primary"
                  textColor="primary"
                  sx={{ minHeight: 48 }}
                >
                  <MuiTab
                    value="playlists"
                    icon={<QueueMusic sx={{ fontSize: 24 }} />}
                    aria-label="Playlists"
                    sx={{ minHeight: 48, p: 1 }}
                  />
                  <MuiTab
                    value="music"
                    icon={<LibraryMusic sx={{ fontSize: 24 }} />}
                    aria-label="Music"
                    sx={{ minHeight: 48, p: 1 }}
                  />
                  <MuiTab
                    value="search"
                    icon={<Search sx={{ fontSize: 24 }} />}
                    aria-label="Search"
                    sx={{ minHeight: 48, p: 1 }}
                  />
                  <MuiTab
                    value="settings"
                    icon={<Settings sx={{ fontSize: 24 }} />}
                    aria-label="Settings"
                    sx={{ minHeight: 48, p: 1 }}
                  />
                </Tabs>
              </Paper>
            )}

            <Box
              component="main"
              className={`main-content ${showPlayerCard ? "has-player-card" : ""}`}
              sx={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                // PlayerPage handles its own safe area padding
                // paddingTop: 0,
              }}
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

                  <Activity mode={routeHandle.isDetail ? "visible" : "hidden"}>
                    <PlaylistDetail />
                  </Activity>

                  <Activity mode={routeHandle.isSpecial ? "visible" : "hidden"}>
                    <PlayerPage />
                  </Activity>
                </PageErrorBoundary>
              </Suspense>
            </Box>

            {/* Player card */}
            {showPlayerCard && (
              <Activity mode="visible">
                <PlayerCard audio={currentAudio} />
              </Activity>
            )}
          </Box>
        )}
      </NavigationContext.Provider>
    </ErrorBoundary>
  )
})

AppLayout.displayName = "AppLayout"
