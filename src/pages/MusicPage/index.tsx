import { FC, useCallback } from "react"
import { Spin, Flex, Avatar } from "antd"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import { useAppStore, useAudios } from "../../store"
import { AudioCard } from "../../components"
import { useConfirm } from "../../hooks"
import { DEFAULT_COVER_URL, LocalAudio, AUDIO_PLAYLIST_ID } from "../../api"

// Music page - displays all downloaded individual audio files
// Wrapped with ErrorBoundary in App.tsx
export const MusicPage: FC = () => {
  const audios = useAudios()
  const playAudio = useAppStore((state) => state.playAudio)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const isConfigLoading = useAppStore((state) => state.isConfigLoading)
  const { showConfirm } = useConfirm()

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      playAudio(audio, AUDIO_PLAYLIST_ID)
    },
    [playAudio],
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
      {audios.map((audio) => (
        <AudioCard
          key={audio.audio.id}
          audio={audio}
          onClick={() => handleAudioClick(audio)}
          showAction
          actionIcon={<DeleteOutlined />}
          onAction={() => handleDelete(audio.audio.id, audio.audio.title)}
        />
      ))}
    </Flex>
  )
}

export default MusicPage
