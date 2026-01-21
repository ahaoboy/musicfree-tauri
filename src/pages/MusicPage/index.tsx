import { FC } from "react"
import { Spin, Flex } from "antd"
import { useAppStore } from "../../store"
import { AudioCard } from "../../components"

export const MusicPage: FC = () => {
  const {
    config: { audios },
    playAudio,
    isConfigLoading,
  } = useAppStore()
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
            />
          ))}
        </Flex>
      )}
    </Flex>
  )
}

export default MusicPage
