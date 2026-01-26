import { FC, useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import { Slider, Typography, Avatar, Flex } from "antd"
import { useAppStore, useCurrentTime, useDuration } from "../../store"
import { DEFAULT_COVER_URL, AUDIO_PLAYLIST_ID } from "../../api"
import { useCoverUrl, useConfirm } from "../../hooks"
import {
  MoreActionsDropdown,
  PlayerControls,
  BackButton,
  PlatformIcon,
} from "../../components"
import "./index.less"

const { Title, Text } = Typography

const formatTime = (seconds: number) => {
  if (!seconds || !Number.isFinite(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Player page - full-screen audio player
export const PlayerPage: FC = () => {
  const navigate = useNavigate()
  const { showConfirm } = useConfirm()

  // Selective store subscriptions
  const currentAudio = useAppStore((state) => state.currentAudio)
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const audioElement = useAppStore((state) => state.audioElement)
  const deleteAudio = useAppStore((state) => state.deleteAudio)

  const coverUrl = useCoverUrl(
    currentAudio?.cover_path,
    currentAudio?.audio.cover,
    currentAudio?.audio.platform,
  )
  const currentTime = useCurrentTime()
  const duration = useDuration()

  // Local state for smoother seeking feedback
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)

  // Handle slider interaction (UI only)
  const handleSliderChange = useCallback((value: number) => {
    setIsDragging(true)
    setDragTime(value)
  }, [])

  // Commit seek operation when user releases slider
  const handleAfterChange = useCallback(
    (value: number) => {
      if (audioElement && Number.isFinite(value)) {
        audioElement.currentTime = value
        setIsDragging(false)

        // If audio is not playing (e.g. paused/ended), try to resume after seeking
        if (!isPlaying && currentAudio) {
          audioElement
            .play()
            .then(() => {
              useAppStore.setState({ isPlaying: true })
            })
            .catch((error) => {
              // AbortError is expected if user seeks again quickly
              if (error.name !== "AbortError") {
                console.error("Failed to play after seek:", error)
              }
            })
        }
      }
    },
    [audioElement, isPlaying, currentAudio],
  )

  // Handle delete with navigation logic
  const handleDelete = useCallback(() => {
    if (!currentAudio || !currentPlaylistId) return

    showConfirm({
      title: "Delete Audio",
      content: `Are you sure you want to delete "${currentAudio.audio.title}"?`,
      onOk: async () => {
        // Delegate logic to store action
        await deleteAudio(currentAudio.audio.id, currentPlaylistId)

        // Check if we need to navigate back (if no audio left/cleared)
        const state = useAppStore.getState()
        if (!state.currentAudio) {
          if (currentPlaylistId === AUDIO_PLAYLIST_ID) {
            navigate("/music")
          } else {
            navigate(
              `/playlist-detail/${encodeURIComponent(currentPlaylistId)}`,
            )
          }
        }
      },
    })
  }, [currentAudio, currentPlaylistId, showConfirm, deleteAudio, navigate])

  if (!currentAudio) {
    return (
      <Flex
        vertical
        className="player-page empty"
        style={{
          position: "fixed",
          inset: 0,
        }}
      >
        <Flex className="player-header" align="center" justify="space-between">
          <BackButton className="icon-btn" />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex
      vertical
      className={`player-page ${isPlaying ? "playing" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
      }}
    >
      {/* Header */}
      <Flex
        className="player-header"
        align="center"
        justify="space-between"
        gap={"small"}
      >
        <BackButton className="icon-btn" />
        <Flex flex={1} justify="center" style={{ minWidth: 0 }}>
          <Text ellipsis className="header-title">
            {currentAudio.audio.title}
          </Text>
        </Flex>
        <MoreActionsDropdown
          url={currentAudio.audio.download_url}
          onDelete={handleDelete}
          disabled={!currentAudio.audio.download_url && !currentPlaylistId}
          className="icon-btn"
        />
      </Flex>

      {/* Cover */}
      <Flex
        vertical
        flex={1}
        align="center"
        justify="center"
        className="player-content"
      >
        <Avatar
          src={coverUrl || DEFAULT_COVER_URL}
          icon={<AudioOutlined />}
          size={300}
          shape="square"
          alt={currentAudio.audio.title}
          className="large-cover"
        />

        <Flex vertical align="center" className="track-info">
          <Title level={3} ellipsis={{ rows: 2 }}>
            {currentAudio.audio.title}
          </Title>
          <Flex align="center" gap="small">
            <PlatformIcon platform={currentAudio.audio.platform} size={24} />
          </Flex>
        </Flex>
      </Flex>

      {/* Controls */}
      <Flex vertical className="player-controls-container">
        {/* Progress */}
        <Flex align="center" gap="middle" className="progress-bar">
          <Text type="secondary" className="time-text">
            {formatTime(currentTime)}
          </Text>
          <Slider
            style={{ flex: 1 }}
            min={0}
            max={duration || 100}
            value={isDragging ? dragTime : currentTime}
            onChange={handleSliderChange}
            onChangeComplete={handleAfterChange}
            disabled={!duration || duration === 0}
            tooltip={{ open: false }}
          />
          <Text type="secondary" className="time-text">
            {formatTime(duration)}
          </Text>
        </Flex>

        {/* Main Controls */}
        <PlayerControls
          audio={currentAudio}
          layout="full"
          className="main-controls"
          buttonClassName="player-control-btn"
          align="space-between"
        />
      </Flex>

      {/* Background Blur */}
      <div
        className="player-bg"
        style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : "none" }}
      />
    </Flex>
  )
}

export default PlayerPage
