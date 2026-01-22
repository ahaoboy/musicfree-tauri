import { FC } from "react"
import { Spin, Flex, Avatar } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import { useAppStore } from "../../store"
import { AudioCard } from "../../components"
import { useConfirm } from "../../hooks"
import { DEFAULT_COVER_URL } from "../../api"

// Music page - displays all downloaded individual audio files
export const MusicPage: FC = () => {
  const {
    config: { audios },
    playAudio,
    deleteAudio,
    isConfigLoading,
  } = useAppStore()
  const { showConfirm } = useConfirm()
  const handleAudioClick = (audio: (typeof audios)[number]) => {
    playAudio(audio, audios)
  }

  if (isConfigLoading) {
    return (
      <Flex flex={1} align="center" justify="center" className="page">
        <Spin fullscreen size="large" />
      </Flex>
    )
  }

  return (
    <Flex vertical className="page" gap="small">
      {audios.length === 0 ? (
        <Flex
          flex={1}
          align="center"
          justify="center"
          className="empty-state"
        >
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="No Music"
          />
        </Flex>
      ) : (
        <Flex vertical gap="small" className="audio-list">
          {audios.map((audio) => (
            <AudioCard
              key={audio.audio.id}
              audio={audio}
              onClick={() => handleAudioClick(audio)}
              showAction
              actionIcon={<DeleteOutlined />}
              onAction={() => {
                showConfirm({
                  title: "Delete Audio",
                  content: "Are you sure you want to delete this track?",
                  onOk: () => deleteAudio(audio.audio.id),
                })
              }}
            />
          ))}
        </Flex>
      )}
    </Flex>
  )
}

export default MusicPage
