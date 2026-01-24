import { FC, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { Spin, Flex, Avatar, Button } from "antd"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import { useAppStore, useAudios } from "../../store"
import { AudioCard } from "../../components"
import { useConfirm } from "../../hooks"
import { DEFAULT_COVER_URL, LocalAudio, AUDIO_PLAYLIST_ID } from "../../api"

// Music page - displays all downloaded individual audio files
// Wrapped with ErrorBoundary in App.tsx
export const MusicPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const audios = useAudios()
  const playAudio = useAppStore((state) => state.playAudio)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const isConfigLoading = useAppStore((state) => state.isConfigLoading)
  const currentAudio = useAppStore((state) => state.currentAudio)
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const { showConfirm } = useConfirm()

  // Get highlight ID from URL params
  const highlightId = searchParams.get("highlight")

  // Ref to store audio card elements
  const audioRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Scroll to highlighted audio when highlight param changes
  useEffect(() => {
    if (highlightId && audioRefs.current.has(highlightId)) {
      const element = audioRefs.current.get(highlightId)
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

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      // Clear highlight param when user clicks to play
      if (highlightId) {
        setSearchParams({}, { replace: true })
      }
      playAudio(audio, AUDIO_PLAYLIST_ID)
    },
    [playAudio, highlightId, setSearchParams],
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
    <Flex vertical className="page audio-list" gap="small">
      {audios.map((audio) => {
        // Priority: highlightId > currentAudio
        // When highlightId exists, only highlight that item
        // Otherwise, highlight the currently playing audio
        const isActive = highlightId
          ? highlightId === audio.audio.id
          : currentPlaylistId === AUDIO_PLAYLIST_ID &&
          currentAudio?.audio.id === audio.audio.id

        return (
          <div
            key={audio.audio.id}
            ref={(el) => {
              if (el) {
                audioRefs.current.set(audio.audio.id, el)
              } else {
                audioRefs.current.delete(audio.audio.id)
              }
            }}
          >
            <AudioCard
              coverPath={audio.cover_path}
              coverUrl={audio.audio.cover}
              platform={audio.audio.platform}
              title={audio.audio.title}
              subtitle={audio.audio.platform}
              onClick={() => handleAudioClick(audio)}
              active={isActive}
              actions={
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(audio.audio.id, audio.audio.title)
                  }}
                />
              }
            />
          </div>
        )
      })}
    </Flex>
  )
}

export default MusicPage
