import { FC, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Stack, Avatar } from "@mui/material"
import { useAppStore } from "../../store"
import { LocalAudio, DEFAULT_COVER_URL } from "../../api"
import { AudioCard, AudioList, MoreActionsDropdown } from "../../components"
import { useNavigation } from "../../contexts"
import { useConfirm } from "../../hooks"

// Playlist detail view
export const PlaylistDetail: FC = () => {
  const navigate = useNavigate()
  const playlists = useAppStore((state) => state.config.playlists)
  const viewingPlaylistId = useAppStore((state) => state.viewingPlaylistId)
  const currentAudio = useAppStore((state) => state.currentAudio)
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const playAudio = useAppStore((state) => state.playAudio)
  const togglePlay = useAppStore((state) => state.togglePlay)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const { setIsInDetailView, setOnBackFromDetail } = useNavigation()
  const { showConfirm } = useConfirm()

  // Find the playlist
  const playlist = playlists.find((p) => p.id === viewingPlaylistId)

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate("/playlists")
  }, [navigate])

  // Register detail view state
  useEffect(() => {
    setIsInDetailView(true)
    setOnBackFromDetail(() => handleBack)

    return () => {
      setIsInDetailView(false)
      setOnBackFromDetail(null)
    }
  }, [setIsInDetailView, setOnBackFromDetail, handleBack])

  const getAudioId = useCallback((audio: LocalAudio) => audio.audio.id, [])

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      if (!playlist) return

      // Check if this audio is currently playing in this playlist
      const isCurrentAudio =
        currentPlaylistId === playlist.id &&
        currentAudio?.audio.id === audio.audio.id

      if (isCurrentAudio) {
        // Toggle play/pause for current audio
        togglePlay()
      } else {
        // Play new audio
        playAudio(audio, playlist.id)
      }
    },
    [playlist, playAudio, togglePlay, currentAudio, currentPlaylistId],
  )

  const handleDeleteAudio = useCallback(
    (audioId: string, title: string) => {
      if (!playlist) return

      showConfirm({
        title: "Delete Audio",
        content: `Are you sure you want to delete "${title}"?`,
        onOk: () => deleteAudio(audioId, playlist.id),
      })
    },
    [playlist, showConfirm, deleteAudio],
  )

  const renderAudioItem = useCallback(
    (audio: LocalAudio) => {
      const isActive =
        currentAudio?.audio.id === audio.audio.id &&
        currentPlaylistId === playlist?.id

      return (
        <AudioCard
          coverPath={audio.cover_path}
          coverUrl={audio.audio.cover}
          platform={audio.audio.platform}
          title={audio.audio.title}
          duration={audio.audio.duration}
          onClick={() => handleAudioClick(audio)}
          active={isActive}
          actions={
            <MoreActionsDropdown
              size="medium"
              url={audio.audio.download_url}
              onDelete={() =>
                handleDeleteAudio(audio.audio.id, audio.audio.title)
              }
            />
          }
        />
      )
    },
    [
      currentAudio?.audio.id,
      currentPlaylistId,
      playlist?.id,
      handleAudioClick,
      handleDeleteAudio,
    ],
  )

  // Playlist not found
  if (!playlist) {
    return (
      <Stack className="page" flex={1}>
        <Stack flex={1} alignItems="center" justifyContent="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            variant="rounded"
            sx={{ width: 256, height: 256, opacity: 0.5 }}
            alt="Playlist Not Found"
          />
        </Stack>
      </Stack>
    )
  }

  // Empty playlist
  if (playlist.audios.length === 0) {
    return (
      <Stack className="page" flex={1}>
        <Stack flex={1} alignItems="center" justifyContent="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            variant="rounded"
            sx={{ width: 256, height: 256, opacity: 0.5 }}
            alt="No Audio"
          />
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack className="page" sx={{ flex: 1, overflow: "hidden" }}>
      <AudioList
        items={playlist.audios}
        getItemId={getAudioId}
        renderItem={renderAudioItem}
      />
    </Stack>
  )
}
