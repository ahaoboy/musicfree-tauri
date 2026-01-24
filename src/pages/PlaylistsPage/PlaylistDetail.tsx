import { FC, useCallback, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Flex, Avatar, Button } from "antd"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import { useAppStore } from "../../store"
import { LocalAudio, DEFAULT_COVER_URL } from "../../api"
import { AudioCard, AudioList } from "../../components"
import { useNavigation } from "../../contexts"
import { useConfirm } from "../../hooks"

// Playlist detail view
export const PlaylistDetail: FC = () => {
  const { playlistId } = useParams<{ playlistId: string }>()
  const navigate = useNavigate()
  const playlists = useAppStore((state) => state.config.playlists)
  const currentAudio = useAppStore((state) => state.currentAudio)
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const playAudio = useAppStore((state) => state.playAudio)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const { setIsInDetailView, setOnBackFromDetail } = useNavigation()
  const { showConfirm } = useConfirm()

  // Find the playlist
  const playlist = playlists.find(
    (p) => p.id === decodeURIComponent(playlistId || ""),
  )

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate("/playlists")
  }, [navigate])

  // Register detail view state
  useEffect(() => {
    setIsInDetailView(true)
    setOnBackFromDetail(() => handleBack)

    return () => {
      setIsInDetailView(false)
      setOnBackFromDetail(null)
    }
  }, [setIsInDetailView, setOnBackFromDetail, handleBack])

  const handleAudioClick = useCallback(
    (audio: LocalAudio) => {
      if (playlist) {
        playAudio(audio, playlist.id)
      }
    },
    [playlist, playAudio],
  )

  const handleDeleteAudio = useCallback(
    (audioId: string, title: string) => {
      if (!playlist) return

      showConfirm({
        title: "Delete Audio",
        content: `Are you sure you want to delete "${title}"?`,
        onOk: () => deleteAudio(audioId, playlist.id),
      })
    },
    [playlist, showConfirm, deleteAudio],
  )

  // Playlist not found
  if (!playlist) {
    return (
      <Flex vertical className="page" flex={1}>
        <Flex flex={1} align="center" justify="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="Playlist Not Found"
          />
        </Flex>
      </Flex>
    )
  }

  // Empty playlist
  if (playlist.audios.length === 0) {
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
    <Flex vertical className="page" style={{ flex: 1, overflow: "hidden" }}>
      <AudioList>
        {playlist.audios.map((audio, index) => {
          const isActive =
            currentAudio?.audio.id === audio.audio.id &&
            currentPlaylistId === playlist.id

          return (
            <div
              key={`${playlist.id}-${audio.audio.id}-${audio.audio.platform}-${index}`}
              data-item-id={audio.audio.id}
            >
              <AudioCard
                coverPath={audio.cover_path}
                coverUrl={audio.audio.cover}
                platform={audio.audio.platform}
                title={audio.audio.title}
                subtitle={audio.audio.platform}
                duration={audio.audio.duration}
                onClick={() => handleAudioClick(audio)}
                active={isActive}
                actions={
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAudio(audio.audio.id, audio.audio.title)
                    }}
                  />
                }
              />
            </div>
          )
        })}
      </AudioList>
    </Flex>
  )
}
