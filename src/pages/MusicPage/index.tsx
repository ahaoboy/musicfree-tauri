import { FC } from "react"
import { Spin, Flex, App } from "antd"
import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons"
import { useAppStore } from "../../store"
import { AudioCard } from "../../components"

// Music page - displays all downloaded individual audio files
export const MusicPage: FC = () => {
  const {
    config: { audios },
    playAudio,
    deleteAudio,
    isConfigLoading,
  } = useAppStore()
  const { modal } = App.useApp()
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
          vertical
          flex={1}
          align="center"
          justify="center"
          className="empty-state"
        >
          <div className="empty-icon">🎵</div>
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
                modal.confirm({
                  title: "Delete Audio",
                  centered: true,
                  icon: <ExclamationCircleOutlined />,
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
