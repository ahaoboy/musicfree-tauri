import { FC, useState, useEffect, useCallback } from "react"
import { Flex, Avatar } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import { useAppStore } from "../../store"
import {
  LocalPlaylist,
  LocalAudio,
  FAVORITE_PLAYLIST_ID,
  DEFAULT_COVER_URL,
} from "../../api"
import { PlaylistCard, AudioCard } from "../../components"
import { useNavigation } from "../../contexts"
import { useConfirm } from "../../hooks"

// Playlists page - displays all downloaded playlists
export const PlaylistsPage: FC = () => {
  const playlists = useAppStore((state) => state.config.playlists)
  const playAudio = useAppStore((state) => state.playAudio)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const deletePlaylist = useAppStore((state) => state.deletePlaylist)

  const [selectedPlaylist, setSelectedPlaylist] =
    useState<LocalPlaylist | null>(null)
  const { setIsInDetailView, setOnBackFromDetail } = useNavigation()
  const { showConfirm } = useConfirm()

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedPlaylist(null)
  }, [])

  // Register detail view state
  useEffect(() => {
    const isDetail = selectedPlaylist !== null
    setIsInDetailView(isDetail)

    if (isDetail) {
      setOnBackFromDetail(() => handleBack)
    } else {
      setOnBackFromDetail(null)
    }

    return () => {
      setIsInDetailView(false)
      setOnBackFromDetail(null)
    }
  }, [selectedPlaylist, setIsInDetailView, setOnBackFromDetail, handleBack])

  const handlePlaylistClick = useCallback((playlist: LocalPlaylist) => {
    setSelectedPlaylist(playlist)
  }, [])

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      if (selectedPlaylist) {
        playAudio(audio, selectedPlaylist.audios)
      } else {
        playAudio(audio)
      }
    },
    [selectedPlaylist, playAudio],
  )

  const handleDeleteAudio = useCallback(
    (audioId: string, title: string) => {
      showConfirm({
        title: "Delete Audio",
        content: `Are you sure you want to delete "${title}"?`,
        onOk: () => deleteAudio(audioId),
      })
    },
    [showConfirm, deleteAudio],
  )

  const handleDeletePlaylist = useCallback(
    (playlistId: string, playlistTitle?: string) => {
      const displayName = playlistTitle || playlistId
      showConfirm({
        title: "Delete Playlist",
        content: `Are you sure you want to delete "${displayName}"?`,
        onOk: () => deletePlaylist(playlistId),
      })
    },
    [showConfirm, deletePlaylist],
  )

  // Render playlist detail view
  if (selectedPlaylist) {
    if (selectedPlaylist.audios.length === 0) {
      return (
        <Flex vertical className="page" flex={1}>
          <Flex flex={1} align="center" justify="center">
            <Avatar
              src={DEFAULT_COVER_URL}
              size={256}
              shape="square"
              style={{ opacity: 0.5 }}
              alt="No Audio"
            />
          </Flex>
        </Flex>
      )
    }

    return (
      <Flex vertical className="page audio-list" gap="small">
        {selectedPlaylist.audios.map((audio, index) => (
          <AudioCard
            key={`${audio.audio.id}-${index}`}
            audio={audio}
            onClick={() => handleAudioClick(audio)}
            showAction
            actionIcon={<DeleteOutlined />}
            onAction={() =>
              handleDeleteAudio(audio.audio.id, audio.audio.title)
            }
          />
        ))}
      </Flex>
    )
  }

  // Render playlists list
  if (playlists.length === 0) {
    return (
      <Flex vertical className="page" flex={1}>
        <Flex flex={1} align="center" justify="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="No Playlists"
          />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex vertical className="page audio-list" gap="small">
      {playlists.map((playlist, index) => (
        <PlaylistCard
          key={`${playlist.id}-${index}`}
          playlist={playlist}
          onClick={() => handlePlaylistClick(playlist)}
          showAction={playlist.id !== FAVORITE_PLAYLIST_ID}
          actionIcon={<DeleteOutlined />}
          onAction={() => handleDeletePlaylist(playlist.id, playlist.title)}
        />
      ))}
    </Flex>
  )
}

export default PlaylistsPage
