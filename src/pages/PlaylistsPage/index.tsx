import { FC, useState, useEffect, useCallback } from "react"
import { Typography, Flex } from "antd"
import { useAppStore } from "../../store"
import { LocalPlaylist, LocalAudio } from "../../api"
import { PlaylistCard, AudioCard } from "../../components"
import { useNavigation } from "../../App"

const { Title, Text } = Typography

// Playlists page - shows all downloaded playlists
// Clicking a playlist shows its detail with playable audios
// Supports swipe right gesture to go back from detail view
export const PlaylistsPage: FC = () => {
  const {
    config: { playlists },
    playAudio,
  } = useAppStore()
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<LocalPlaylist | null>(null)
  const { setIsInDetailView, setOnBackFromDetail } = useNavigation()

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedPlaylist(null)
  }, [])

  // Register detail view state with navigation context
  useEffect(() => {
    const isDetail = selectedPlaylist !== null
    setIsInDetailView(isDetail)

    if (isDetail) {
      setOnBackFromDetail(() => handleBack)
    } else {
      setOnBackFromDetail(null)
    }

    // Cleanup on unmount
    return () => {
      setIsInDetailView(false)
      setOnBackFromDetail(null)
    }
  }, [selectedPlaylist, setIsInDetailView, setOnBackFromDetail, handleBack])

  // Handle playlist click - show detail view
  const handlePlaylistClick = (playlist: LocalPlaylist) => {
    setSelectedPlaylist(playlist)
  }

  // Handle audio click - play the audio
  const handleAudioClick = (audio: LocalAudio) => {
    if (selectedPlaylist) {
      playAudio(audio, selectedPlaylist.audios)
    } else {
      playAudio(audio)
    }
  }

  // Render playlist detail view
  if (selectedPlaylist) {
    return (
      <Flex vertical className="page" gap="small">
        {selectedPlaylist.audios.length === 0 ? (
          <Flex
            vertical
            flex={1}
            align="center"
            justify="center"
            gap="middle"
            className="empty-state"
          >
            <div className="empty-icon">🎵</div>
            <Title level={4} className="empty-title">
              No Audio
            </Title>
            <Text type="secondary" className="empty-description">
              This playlist has no audio tracks yet.
            </Text>
          </Flex>
        ) : (
          <Flex vertical gap="small" className="audio-list">
            {selectedPlaylist.audios.map((audio, index) => (
              <AudioCard
                key={`${audio.audio.id}-${index}`}
                audio={audio}
                onClick={() => handleAudioClick(audio)}
              />
            ))}
          </Flex>
        )}
      </Flex>
    )
  }

  // Render playlists grid
  return (
    <Flex vertical className="page" gap="small">
      {playlists.length === 0 ? (
        <Flex
          vertical
          flex={1}
          align="center"
          justify="center"
          className="empty-state"
        >
          <div className="empty-icon">📁</div>
        </Flex>
      ) : (
        <Flex vertical gap="small" className="playlist-grid">
          {playlists.map((playlist, index) => (
            <PlaylistCard
              key={`${playlist.id}-${index}`}
              playlist={playlist}
              onClick={() => handlePlaylistClick(playlist)}
            />
          ))}
        </Flex>
      )}
    </Flex>
  )
}

export default PlaylistsPage
