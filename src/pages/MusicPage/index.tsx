import { FC, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Spin, Flex, Avatar } from "antd"
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

  if (isConfigLoading) {
    return (
      <Flex flex={1} align="center" justify="center" className="page">
        <Spin fullscreen size="large" />
      </Flex>
    )
  }

  if (audios.length === 0) {
    return (
      <Flex vertical className="page" flex={1}>
        <Flex flex={1} align="center" justify="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="No Music"
          />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex vertical className="page" style={{ flex: 1, overflow: "hidden" }}>
      <AudioList highlightId={highlightId}>
        {audios.map((audio) => {
          const isActive = highlightId
            ? highlightId === audio.audio.id
            : currentPlaylistId === AUDIO_PLAYLIST_ID &&
              currentAudio?.audio.id === audio.audio.id

          return (
            <div
              key={`${AUDIO_PLAYLIST_ID}-${audio.audio.id}-${audio.audio.platform}`}
              data-item-id={audio.audio.id}
            >
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
                    url={audio.audio.download_url}
                    onDelete={() =>
                      handleDelete(audio.audio.id, audio.audio.title)
                    }
                  />
                }
              />
            </div>
          )
        })}
      </AudioList>
    </Flex>
  )
}

export default MusicPage
