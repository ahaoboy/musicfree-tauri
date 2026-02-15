import { FC, memo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { LocalAudio } from "../../api"
import { PlayerControls } from "../PlayerControls"
import { AudioCard } from "../AudioCard"
import { useTheme } from "../../hooks/useTheme"

interface PlayerCardProps {
  audio: LocalAudio | null
}

// Mini player card - Optimized to reuse AudioCard logic
export const PlayerCard: FC<PlayerCardProps> = memo(({ audio }) => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const handleCardClick = useCallback(() => {
    navigate("/player")
  }, [navigate])

  if (!audio) {
    return null
  }

  return (
    <AudioCard
      sx={{
        m: 1,
        height: (theme) => theme.custom.playerBarHeight,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        zIndex: (theme) => theme.custom.zIndex.miniPlayer,
        borderRadius: 2,
      }}
      coverPath={audio.cover_path}
      coverUrl={audio.audio.cover}
      platform={audio.audio.platform}
      title={audio.audio.title}
      duration={audio.audio.duration}
      showPlatformIcon={true}
      avatarSize={theme.custom.avatarSize.player}
      showBorder={false}
      onClick={handleCardClick}
      actions={
        <PlayerControls audio={audio} layout="mini" size="large" gap={1} />
      }
    />
  )
})

PlayerCard.displayName = "PlayerCard"

export default PlayerCard
