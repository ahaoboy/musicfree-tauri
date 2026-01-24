import { FC, useCallback } from "react"
import ShareAltOutlined from "@ant-design/icons/ShareAltOutlined"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import { Slider, Typography, Avatar, Flex } from "antd"
import { useAppStore, useCurrentTime, useDuration } from "../../store"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"
import { CopyButton, PlayerControls, BackButton } from "../../components"
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
  // Selective store subscriptions
  const currentAudio = useAppStore((state) => state.currentAudio)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const audioElement = useAppStore((state) => state.audioElement)

  const coverUrl = useCoverUrl(
    currentAudio?.cover_path,
    currentAudio?.audio.cover,
  )

  const currentTime = useCurrentTime()
  const duration = useDuration()

  // Handle slider click to seek (click-only, no drag support)
  const handleSliderChange = useCallback(
    (value: number | number[]) => {
      const seekValue = Array.isArray(value) ? value[0] : value
      if (audioElement && Number.isFinite(seekValue)) {
        audioElement.currentTime = seekValue

        // If audio is not playing, start playback after seeking
        if (!isPlaying && currentAudio) {
          audioElement
            .play()
            .then(() => {
              useAppStore.setState({ isPlaying: true })
            })
            .catch((error) => {
              console.error("Failed to play after seek:", error)
            })
        }
      }
    },
    [audioElement, isPlaying, currentAudio],
  )

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
        <CopyButton
          text={currentAudio.audio.download_url || ""}
          icon={<ShareAltOutlined />}
          successMessage="Download link copied!"
          errorMessage="Failed to copy link"
          className="icon-btn"
          disabled={!currentAudio.audio.download_url}
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
          <Text type="secondary">{currentAudio.audio.platform}</Text>
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
            value={currentTime}
            onChange={handleSliderChange}
            disabled={!duration || duration === 0}
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
