import { FC, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import LeftOutlined from "@ant-design/icons/LeftOutlined"
import ShareAltOutlined from "@ant-design/icons/ShareAltOutlined"
import HeartOutlined from "@ant-design/icons/HeartOutlined"
import HeartFilled from "@ant-design/icons/HeartFilled"
import StepBackwardOutlined from "@ant-design/icons/StepBackwardOutlined"
import StepForwardOutlined from "@ant-design/icons/StepForwardOutlined"
import PlayCircleFilled from "@ant-design/icons/PlayCircleFilled"
import PauseCircleFilled from "@ant-design/icons/PauseCircleFilled"
import RetweetOutlined from "@ant-design/icons/RetweetOutlined"
import SwapOutlined from "@ant-design/icons/SwapOutlined"
import BarsOutlined from "@ant-design/icons/BarsOutlined"
import AudioOutlined from "@ant-design/icons/AudioOutlined"
import { Slider, Button, Typography, Avatar, Flex } from "antd"
import { useAppStore, useCurrentTime, useDuration } from "../../store"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"
import { CopyButton } from "../../components"
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

  // Selective store subscriptions
  const currentAudio = useAppStore((state) => state.currentAudio)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const playMode = useAppStore((state) => state.playMode)
  const audioElement = useAppStore((state) => state.audioElement)
  const togglePlay = useAppStore((state) => state.togglePlay)
  const playNext = useAppStore((state) => state.playNext)
  const playPrev = useAppStore((state) => state.playPrev)
  const canPlayPrev = useAppStore((state) => state.canPlayPrev)
  const togglePlayMode = useAppStore((state) => state.togglePlayMode)
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)
  const isFavoritedAudio = useAppStore((state) => state.isFavoritedAudio)

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

  const handleFavorite = useCallback(() => {
    if (currentAudio) {
      toggleFavorite(currentAudio)
    }
  }, [currentAudio, toggleFavorite])

  // Memoize mode icon
  const modeIcon = useMemo(() => {
    switch (playMode) {
      case "sequence":
        return <BarsOutlined />
      case "list-loop":
        return <RetweetOutlined />
      case "single-loop":
        return (
          <Flex
            style={{ position: "relative" }}
            align="center"
            justify="center"
          >
            <RetweetOutlined />
            <Text
              style={{
                position: "absolute",
                fontSize: 10,
                right: -6,
                top: -4,
                fontWeight: "bold",
                color: "currentColor",
              }}
            >
              1
            </Text>
          </Flex>
        )
      case "shuffle":
        return <SwapOutlined />
      default:
        return <BarsOutlined />
    }
  }, [playMode])

  // Memoize favorite status - recalculates when currentAudio changes
  const isFav = useMemo(
    () => currentAudio && isFavoritedAudio(currentAudio.audio.id),
    [currentAudio, isFavoritedAudio],
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
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate(-1)}
            className="icon-btn"
          />
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
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate(-1)}
          className="icon-btn"
        />
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
        <Flex align="center" justify="space-between" className="main-controls">
          <Button
            type="text"
            icon={modeIcon}
            onClick={togglePlayMode}
            className="player-control-btn"
          />

          <Button
            type="text"
            icon={<StepBackwardOutlined />}
            onClick={() => {
              if (canPlayPrev()) {
                playPrev()
              }
            }}
            className="player-control-btn"
          />

          <Button
            type="text"
            icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
            onClick={togglePlay}
            className="player-control-btn play"
          />

          <Button
            type="text"
            icon={<StepForwardOutlined />}
            onClick={() => playNext()}
            className="player-control-btn"
          />

          <Button
            type="text"
            icon={
              isFav ? (
                <HeartFilled style={{ color: "#ff4d4f" }} />
              ) : (
                <HeartOutlined />
              )
            }
            onClick={handleFavorite}
            className="player-control-btn"
          />
        </Flex>
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
