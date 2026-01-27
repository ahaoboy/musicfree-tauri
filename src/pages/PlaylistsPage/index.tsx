import { FC, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Stack, Avatar } from "@mui/material"
import { FolderOpen } from "@mui/icons-material"
import { useAppStore, usePlaylistsPageData } from "../../store"
import {
  LocalPlaylist,
  FAVORITE_PLAYLIST_ID,
  DEFAULT_COVER_URL,
} from "../../api"
import { AudioCard, AudioList, MoreActionsDropdown } from "../../components"
import { useConfirm } from "../../hooks"

// Playlists list view
export const PlaylistsPage: FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const playlists = usePlaylistsPageData()
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const deletePlaylist = useAppStore((state) => state.deletePlaylist)
  const { showConfirm } = useConfirm()

  // Get highlight ID from URL params
  const highlightId = searchParams.get("highlight")

  const setViewingPlaylistId = useAppStore(
    (state) => state.setViewingPlaylistId,
  )

  const getPlaylistId = useCallback(
    (playlist: LocalPlaylist) => playlist.id,
    [],
  )

  const handlePlaylistClick = useCallback(
    (playlist: LocalPlaylist) => {
      // Clear highlight param when user clicks to navigate
      if (highlightId) {
        setSearchParams({}, { replace: true })
      }
      setViewingPlaylistId(playlist.id)
      navigate("/playlist-detail")
    },
    [navigate, highlightId, setSearchParams, setViewingPlaylistId],
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

  const formatAudioCount = useCallback((count: number): string => {
    return `${count.toString().padStart(3, " ")}♪`
  }, [])

  const renderPlaylistItem = useCallback(
    (playlist: LocalPlaylist) => {
      const audioCount = playlist.audios?.length || 0
      const displayName = playlist.title || playlist.id
      const canDelete = playlist.id !== FAVORITE_PLAYLIST_ID

      // Priority: highlightId > currentPlaylistId
      const isActive = highlightId
        ? highlightId === playlist.id
        : currentPlaylistId === playlist.id

      return (
        <AudioCard
          coverPath={playlist.cover_path}
          coverUrl={playlist.cover}
          platform={playlist.platform}
          title={displayName}
          subtitle={formatAudioCount(audioCount)}
          icon={<FolderOpen />}
          onClick={() => handlePlaylistClick(playlist)}
          active={isActive}
          isFavorite={playlist.id === FAVORITE_PLAYLIST_ID}
          actions={
            canDelete ? (
              <MoreActionsDropdown
                url={playlist.download_url}
                onDelete={() =>
                  handleDeletePlaylist(playlist.id, playlist.title)
                }
              />
            ) : undefined
          }
        />
      )
    },
    [
      highlightId,
      currentPlaylistId,
      formatAudioCount,
      handlePlaylistClick,
      handleDeletePlaylist,
    ],
  )

  if (playlists.length === 0) {
    return (
      <Stack className="page" flex={1}>
        <Stack flex={1} alignItems="center" justifyContent="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            variant="rounded"
            sx={{ width: 256, height: 256, opacity: 0.5 }}
            alt="No Playlists"
          />
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack className="page" sx={{ flex: 1, overflow: "hidden" }}>
      <AudioList
        items={playlists}
        getItemId={getPlaylistId}
        highlightId={highlightId}
        renderItem={renderPlaylistItem}
      />
    </Stack>
  )
}

export default PlaylistsPage
