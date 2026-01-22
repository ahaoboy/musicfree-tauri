import { FC, useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  LeftOutlined,
  ShareAltOutlined,
  HeartOutlined,
  HeartFilled,
  StepBackwardOutlined,
  StepForwardOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  RetweetOutlined,
  SwapOutlined,
  BarsOutlined,
  AudioOutlined,
} from "@ant-design/icons"
import { Slider, message, Button, Typography, Avatar, Flex } from "antd"
import { useAppStore } from "../../store"
import { DEFAULT_COVER_URL } from "../../api"
import { useCoverUrl } from "../../hooks"
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
  const togglePlayMode = useAppStore((state) => state.togglePlayMode)
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)
  const isFavorited = useAppStore((state) => state.isFavorited)

  const coverUrl = useCoverUrl(
    currentAudio?.cover_path,
    currentAudio?.audio.cover,
  )

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Handle time updates
  useEffect(() => {
    if (!audioElement) return

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audioElement.currentTime)
      }
      setDuration(audioElement.duration || 0)
    }

    audioElement.addEventListener("timeupdate", handleTimeUpdate)
    audioElement.addEventListener("loadedmetadata", handleTimeUpdate)

    setCurrentTime(audioElement.currentTime)
    setDuration(audioElement.duration || 0)

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate)
      audioElement.removeEventListener("loadedmetadata", handleTimeUpdate)
    }
  }, [audioElement, isDragging])

  const handleSeek = useCallback(
    (value: number) => {
      if (audioElement) {
        audioElement.currentTime = value
      }
      setCurrentTime(value)
      setIsDragging(false)
    },
    [audioElement],
  )

  const handleShare = useCallback(async () => {
    if (!currentAudio) return
    try {
      await navigator.clipboard.writeText(currentAudio.audio.download_url || "")
      message.success("Download link copied!")
    } catch {
      message.error("Failed to copy link")
    }
  }, [currentAudio])

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

  const isFav = currentAudio ? isFavorited(currentAudio.audio.id) : false

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
      <Flex className="player-header" align="center" justify="space-between">
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate(-1)}
          className="icon-btn"
        />
        <Flex flex={1} justify="center" style={{ minWidth: 0 }}>
          <Text
            ellipsis={{ tooltip: currentAudio.audio.title }}
            className="header-title"
          >
            {currentAudio.audio.title}
          </Text>
        </Flex>
        <Button
          type="text"
          icon={<ShareAltOutlined />}
          onClick={handleShare}
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
          <Title
            level={3}
            ellipsis={{ rows: 2, tooltip: currentAudio.audio.title }}
          >
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
            max={duration}
            value={currentTime}
            onChange={(val: number) => {
              setIsDragging(true)
              setCurrentTime(val)
            }}
            onChangeComplete={handleSeek}
            tooltip={{ formatter: null }}
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
            className="action-btn secondary"
          />

          <Button
            type="text"
            icon={<StepBackwardOutlined />}
            onClick={() => playPrev()}
            className="action-btn secondary"
          />

          <Button
            type="text"
            icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
            onClick={togglePlay}
            className="play-btn large"
          />

          <Button
            type="text"
            icon={<StepForwardOutlined />}
            onClick={() => playNext()}
            className="action-btn secondary"
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
            className="action-btn secondary"
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
