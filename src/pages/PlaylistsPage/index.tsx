import { FC, useCallback, useEffect } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"
import { Flex, Avatar } from "antd"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import { useAppStore, usePlaylistsPageData } from "../../store"
import {
  LocalPlaylist,
  FAVORITE_PLAYLIST_ID,
  DEFAULT_COVER_URL,
} from "../../api"
import { PlaylistCard } from "../../components"
import { useNavigation } from "../../contexts"
import { useConfirm } from "../../hooks"
import { PlaylistDetail } from "./PlaylistDetail"

// Playlists list view
const PlaylistsList: FC = () => {
  const navigate = useNavigate()
  const playlists = usePlaylistsPageData()
  const deletePlaylist = useAppStore((state) => state.deletePlaylist)
  const { setIsInDetailView } = useNavigation()
  const { showConfirm } = useConfirm()

  // Clear detail view state when on list view
  useEffect(() => {
    setIsInDetailView(false)
    return () => setIsInDetailView(false)
  }, [setIsInDetailView])

  const handlePlaylistClick = useCallback(
    (playlist: LocalPlaylist) => {
      navigate(`/playlists/${encodeURIComponent(playlist.id)}`)
    },
    [navigate],
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
      {playlists.map((playlist, index) => (
        <PlaylistCard
          key={`${playlist.id}-${index}`}
          playlist={playlist}
          onClick={() => handlePlaylistClick(playlist)}
          showAction={playlist.id !== FAVORITE_PLAYLIST_ID}
          actionIcon={<DeleteOutlined />}
          onAction={() => handleDeletePlaylist(playlist.id, playlist.title)}
        />
      ))}
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
