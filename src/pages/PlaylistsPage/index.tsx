import { FC, useState, useEffect, useCallback } from "react"
import { useAppStore } from "../../store"
import { LocalPlaylist, LocalAudio } from "../../api"
import { PlaylistCard, AudioCard } from "../../components"
import { useNavigation } from "../../App"

// Playlists page - shows all downloaded playlists
// Clicking a playlist shows its detail with playable audios
// Supports swipe right gesture to go back from detail view
export const PlaylistsPage: FC = () => {
  const { playlists, playAudio } = useAppStore()
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
      <div className="page">
        {/* <div className="detail-header">
          <button className="back-btn" onClick={handleBack}>
            <LeftOutlined />
          </button>
          <span className="detail-title">{selectedPlaylist.id}</span>
        </div> */}

        {selectedPlaylist.audios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <div className="empty-title">No Audio</div>
            <div className="empty-description">
              This playlist has no audio tracks yet.
            </div>
          </div>
        ) : (
          <div className="audio-list">
            {/* <div className="list-header">
              <span className="list-title">
                {selectedPlaylist.audios.length} Tracks
              </span>
            </div> */}
            {selectedPlaylist.audios.map((audio, index) => (
              <div
                key={`${audio.audio.id}-${index}`}
                className="virtual-list-item"
              >
                <AudioCard
                  audio={audio}
                  onClick={() => handleAudioClick(audio)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render playlists grid
  return (
    <div className="page">
      {/* <div className="page-header">
        <h1 className="page-title">Playlists</h1>
        <p className="page-subtitle">Your downloaded playlists</p>
      </div> */}

      {playlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-title">No Playlists</div>
          <div className="empty-description">
            Download playlists from the Search tab to see them here.
          </div>
        </div>
      ) : (
        <div className="playlist-grid">
          {playlists.map((playlist, index) => (
            <div key={`${playlist.id}-${index}`} className="virtual-list-item">
              <PlaylistCard
                playlist={playlist}
                onClick={() => handlePlaylistClick(playlist)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlaylistsPage
