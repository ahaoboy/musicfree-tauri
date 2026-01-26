import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "./AppLayout"
// Note: Pages are imported in AppLayout for persistent rendering

export type Tab = "playlists" | "music" | "search" | "settings"

// Route configuration with metadata
export const routes = [
  {
    path: "playlists",
    handle: { isTab: true, tabKey: "playlists" as Tab },
    element: null, // Rendered via Activity in AppLayout
  },
  {
    path: "playlist-detail",
    handle: { isDetail: true, parentTab: "playlists" as Tab },
    element: null, // Rendered via Activity in AppLayout
  },
  {
    path: "music",
    handle: { isTab: true, tabKey: "music" as Tab },
    element: null, // Rendered via Activity in AppLayout
  },
  {
    path: "search",
    handle: { isTab: true, tabKey: "search" as Tab },
    element: null, // Rendered via Activity in AppLayout
  },
  {
    path: "settings",
    handle: { isTab: true, tabKey: "settings" as Tab },
    element: null, // Rendered via Activity in AppLayout
  },
  {
    path: "player",
    handle: { isSpecial: true },
    element: null, // Rendered via Activity in AppLayout
  },
]

// Create router
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/playlists" replace />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: routes,
  },
])

// Tab configuration
export const TAB_TO_ROUTE: Record<Tab, string> = {
  playlists: "/playlists",
  music: "/music",
  search: "/search",
  settings: "/settings",
}

export const TAB_ORDER: Tab[] = ["playlists", "music", "search", "settings"]
