import { FC } from "react"
import { useAppStore } from "../../store"
import { AudioCard } from "../../components"

// Music page - shows all playable music
// Clicking an audio will start playback
export const MusicPage: FC = () => {
  const { audios, playAudio, isConfigLoading } = useAppStore()

  // Handle audio click - play the audio
  const handleAudioClick = (audio: (typeof audios)[number]) => {
    playAudio(audio, audios)
  }

  if (isConfigLoading) {
    return (
      <div className="page">
        <div className="loading-container">
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* <div className="page-header">
        <h1 className="page-title">Music</h1>
        <p className="page-subtitle">All downloaded audio tracks</p>
      </div> */}

      {audios.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
        </div>
      ) : (
        <div className="audio-list">
          {/* <div className="list-header">
            <span className="list-title">{audios.length} Tracks</span>
          </div> */}
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
