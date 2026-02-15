import { FC, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { CircularProgress, Stack, Avatar } from "@mui/material"
import { useAppStore, useAudios } from "../../store"
import { AudioCard, AudioList, MoreActionsDropdown } from "../../components"
import { useConfirm } from "../../hooks"
import { DEFAULT_COVER_URL, LocalAudio, AUDIO_PLAYLIST_ID } from "../../api"

// Music page - displays all downloaded individual audio files
// Wrapped with ErrorBoundary in App.tsx
export const MusicPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const audios = useAudios()
  const playAudio = useAppStore((state) => state.playAudio)
  const togglePlay = useAppStore((state) => state.togglePlay)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const isConfigLoading = useAppStore((state) => state.isConfigLoading)
  const currentAudio = useAppStore((state) => state.currentAudio)
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const { showConfirm } = useConfirm()

  // Get highlight ID from URL params
  const highlightId = searchParams.get("highlight")

  const getAudioId = useCallback((audio: LocalAudio) => audio.audio.id, [])

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      // Clear highlight param when user clicks to play
      if (highlightId) {
        setSearchParams({}, { replace: true })
      }

      // Check if this audio is currently playing
      const isCurrentAudio =
        currentPlaylistId === AUDIO_PLAYLIST_ID &&
        currentAudio?.audio.id === audio.audio.id

      if (isCurrentAudio) {
        // Toggle play/pause for current audio
        togglePlay()
      } else {
        // Play new audio
        playAudio(audio, AUDIO_PLAYLIST_ID)
      }
    },
    [
      playAudio,
      togglePlay,
      highlightId,
      setSearchParams,
      currentAudio,
      currentPlaylistId,
    ],
  )

  const handleDelete = useCallback(
    (audioId: string, title: string) => {
      showConfirm({
        title: "Delete Audio",
        content: `Are you sure you want to delete "${title}"?`,
        onOk: () => deleteAudio(audioId, AUDIO_PLAYLIST_ID),
      })
    },
    [showConfirm, deleteAudio],
  )

  const renderAudioItem = useCallback(
    (audio: LocalAudio) => {
      const isActive = highlightId
        ? highlightId === audio.audio.id
        : currentPlaylistId === AUDIO_PLAYLIST_ID &&
          currentAudio?.audio.id === audio.audio.id

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
              filePath={audio.path}
              onDelete={() => handleDelete(audio.audio.id, audio.audio.title)}
            />
          }
        />
      )
    },
    [
      highlightId,
      currentPlaylistId,
      currentAudio?.audio.id,
      handleAudioClick,
      handleDelete,
    ],
  )

  if (isConfigLoading) {
    return (
      <Stack
        flex={1}
        alignItems="center"
        justifyContent="center"
        className="page"
      >
        <CircularProgress size={40} />
      </Stack>
    )
  }

  if (audios.length === 0) {
    return (
      <Stack className="page" flex={1}>
        <Stack flex={1} alignItems="center" justifyContent="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            variant="rounded"
            sx={{ width: 256, height: 256, opacity: 0.5 }}
            alt="No Music"
          />
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack className="page" sx={{ flex: 1, overflow: "hidden" }}>
      <AudioList
        items={audios}
        getItemId={getAudioId}
        highlightId={highlightId}
        renderItem={renderAudioItem}
      />
    </Stack>
  )
}

export default MusicPage
