import { FC, useState, useEffect, useCallback } from "react"
import { Flex, Avatar } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import { useAppStore } from "../../store"
import { LocalPlaylist, LocalAudio, FAVORITE_PLAYLIST_ID, DEFAULT_COVER_URL } from "../../api"
import { PlaylistCard, AudioCard } from "../../components"
import { useNavigation } from "../../App"
import { useConfirm } from "../../hooks"

// Playlists page - displays all downloaded playlists
// Clicking a playlist shows its detail with playable audios
// Supports swipe right gesture to go back from detail view
export const PlaylistsPage: FC = () => {
  const {
    config: { playlists },
    playAudio,
    deleteAudio,
    deletePlaylist,
  } = useAppStore()
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<LocalPlaylist | null>(null)
  const { setIsInDetailView, setOnBackFromDetail } = useNavigation()
  const { showConfirm } = useConfirm()

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
              alt="No Audio"
            />
          </Flex>
        ) : (
          <Flex vertical gap="small" className="audio-list">
            {selectedPlaylist.audios.map((audio, index) => (
              <AudioCard
                key={`${audio.audio.id}-${index}`}
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

  // Render playlists grid
  return (
    <Flex vertical className="page" gap="small">
      {playlists.length === 0 ? (
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
            alt="No Playlists"
          />
        </Flex>
      ) : (
        <Flex vertical gap="small" className="playlist-grid">
          {playlists.map((playlist, index) => (
            <PlaylistCard
              key={`${playlist.id}-${index}`}
              playlist={playlist}
              onClick={() => handlePlaylistClick(playlist)}
              showAction={playlist.id !== FAVORITE_PLAYLIST_ID}
              actionIcon={<DeleteOutlined />}
              onAction={() => {
                showConfirm({
                  title: "Delete Playlist",
                  content: "Are you sure you want to delete this playlist?",
                  onOk: () => deletePlaylist(playlist.id),
                })
              }}
            />
          ))}
        </Flex>
      )}
    </Flex>
  )
}

export default PlaylistsPage
