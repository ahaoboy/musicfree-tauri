import { FC } from "react"
import { Spin } from "antd"
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
      <div className="page">
        <div className="loading-container">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {audios.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
        </div>
      ) : (
        <div className="audio-list">
          {audios.map((audio) => (
            <AudioCard
              key={audio.audio.id}
              audio={audio}
              onClick={() => handleAudioClick(audio)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MusicPage
