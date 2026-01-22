import { FC, useCallback } from "react"
import { Spin, Flex, Avatar } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import { useAppStore } from "../../store"
import { AudioCard } from "../../components"
import { useConfirm } from "../../hooks"
import { DEFAULT_COVER_URL, LocalAudio } from "../../api"

// Music page - displays all downloaded individual audio files
export const MusicPage: FC = () => {
  const audios = useAppStore((state) => state.config.audios)
  const playAudio = useAppStore((state) => state.playAudio)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const isConfigLoading = useAppStore((state) => state.isConfigLoading)
  const { showConfirm } = useConfirm()

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      playAudio(audio, audios)
    },
    [playAudio, audios],
  )

  const handleDelete = useCallback(
    (audioId: string, title: string) => {
      showConfirm({
        title: "Delete Audio",
        content: `Are you sure you want to delete "${title}"?`,
        onOk: () => deleteAudio(audioId),
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
