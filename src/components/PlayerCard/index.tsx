import { FC, memo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { LocalAudio } from "../../api"
import { PlayerControls } from "../PlayerControls"
import { AudioCard } from "../AudioCard"

interface PlayerCardProps {
  audio: LocalAudio | null
}

// Mini player card - Optimized to reuse AudioCard logic
export const PlayerCard: FC<PlayerCardProps> = memo(({ audio }) => {
  const navigate = useNavigate()

  const handleCardClick = useCallback(() => {
    navigate("/player")
  }, [navigate])

  if (!audio) {
    return null
  }

  return (
    <AudioCard
      className="player-card"
      coverPath={audio.cover_path}
      coverUrl={audio.audio.cover}
      platform={audio.audio.platform}
      title={audio.audio.title}
      // Mini player specific: show platform text as subtitle
      // subtitle={audio.audio.platform}
      duration={audio.audio.duration}
      showPlatformIcon={true}
      avatarSize={60}
      showBorder={false}
      onClick={handleCardClick}
      actions={
        <PlayerControls
          audio={audio}
          layout="mini"
          buttonClassName="mini-player-btn"
          buttonSize="large"
          iconSize={32}
          gap={1}
        />
      }
    />
  )
})

PlayerCard.displayName = "PlayerCard"

export default PlayerCard
