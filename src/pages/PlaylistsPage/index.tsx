import { FC, useCallback, useEffect, useRef } from "react"
import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom"
import { Flex, Avatar, Button } from "antd"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import FolderOutlined from "@ant-design/icons/FolderOutlined"
import { useAppStore, usePlaylistsPageData } from "../../store"
import {
  LocalPlaylist,
  FAVORITE_PLAYLIST_ID,
  DEFAULT_COVER_URL,
} from "../../api"
import { AudioCard } from "../../components"
import { useNavigation } from "../../contexts"
import { useConfirm } from "../../hooks"
import { PlaylistDetail } from "./PlaylistDetail"

// Playlists list view
const PlaylistsList: FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const playlists = usePlaylistsPageData()
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const deletePlaylist = useAppStore((state) => state.deletePlaylist)
  const { setIsInDetailView } = useNavigation()
  const { showConfirm } = useConfirm()

  // Get highlight ID from URL params
  const highlightId = searchParams.get("highlight")

  // Ref to store playlist card elements
  const playlistRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Scroll to highlighted playlist when highlight param changes
  useEffect(() => {
    if (highlightId && playlistRefs.current.has(highlightId)) {
      const element = playlistRefs.current.get(highlightId)
      if (element) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          element?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }, 100)
      }
    }
  }, [highlightId])

  // Clear detail view state when on list view
  useEffect(() => {
    setIsInDetailView(false)
    return () => {
      setIsInDetailView(false)
    }
  }, [setIsInDetailView])

  const handlePlaylistClick = useCallback(
    (playlist: LocalPlaylist) => {
      // Clear highlight param when user clicks to navigate
      if (highlightId) {
        setSearchParams({}, { replace: true })
      }
      navigate(`/playlists/${encodeURIComponent(playlist.id)}`)
    },
    [navigate, highlightId, setSearchParams],
  )

  const handleDeletePlaylist = useCallback(
    (playlistId: string, playlistTitle?: string) => {
      const displayName = playlistTitle || playlistId
      showConfirm({
        title: "Delete Playlist",
        content: `Are you sure you want to delete "${displayName}"?`,
        onOk: () => deletePlaylist(playlistId),
      })
    },
    [showConfirm, deletePlaylist],
  )

  if (playlists.length === 0) {
    return (
      <Flex vertical className="page" flex={1}>
        <Flex flex={1} align="center" justify="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="No Playlists"
          />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex vertical className="page audio-list" gap="small">
      {playlists.map((playlist, index) => {
        const audioCount = playlist.audios?.length || 0
        const displayName = playlist.title || playlist.id
        const canDelete = playlist.id !== FAVORITE_PLAYLIST_ID

        // Priority: highlightId > currentPlaylistId
        // When highlightId exists, only highlight that item
        // Otherwise, highlight the currently playing playlist
        const isActive = highlightId
          ? highlightId === playlist.id
          : currentPlaylistId === playlist.id

        return (
          <div
            key={`${playlist.id}-${index}`}
            ref={(el) => {
              if (el) {
                playlistRefs.current.set(playlist.id, el)
              } else {
                playlistRefs.current.delete(playlist.id)
              }
            }}
          >
            <AudioCard
              coverPath={playlist.cover_path}
              coverUrl={playlist.cover}
              platform={playlist.platform}
              title={displayName}
              subtitle={`${audioCount} tracks · ${playlist.platform}`}
              icon={<FolderOutlined />}
              onClick={() => handlePlaylistClick(playlist)}
              active={isActive}
              actions={
                canDelete ? (
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePlaylist(playlist.id, playlist.title)
                    }}
                  />
                ) : undefined
              }
            />
          </div>
        )
      })}
    </Flex>
  )
}

// Main playlists page with nested routes
export const PlaylistsPage: FC = () => {
  return (
    <Routes>
      <Route index element={<PlaylistsList />} />
      <Route path=":playlistId" element={<PlaylistDetail />} />
    </Routes>
  )
}

export default PlaylistsPage
