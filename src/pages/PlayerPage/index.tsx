import { FC, useState, useEffect } from "react"
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
import { get_web_url, DEFAULT_COVER_URL } from "../../api"
import "./index.less"

const { Title, Text } = Typography

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const PlayerPage: FC = () => {
  const navigate = useNavigate()
  const {
    currentAudio,
    isPlaying,
    togglePlay,
    audioElement,
    playNext,
    playPrev,
    toggleFavorite,
    playMode,
    togglePlayMode,
    isFavorited,
  } = useAppStore()

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Load cover
  useEffect(() => {
    const loadCover = async () => {
      if (!currentAudio) {
        setCoverUrl(null)
        return
      }

      if (currentAudio.cover_path) {
        try {
          const url = await get_web_url(currentAudio.cover_path)
          setCoverUrl(url)
        } catch (error) {
          console.error("Failed to load cover:", error)
        }
      } else if (currentAudio.audio.cover) {
        setCoverUrl(currentAudio.audio.cover)
      }
    }
    loadCover()
  }, [currentAudio])

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

    // Initial State
    setCurrentTime(audioElement.currentTime)
    setDuration(audioElement.duration || 0)

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate)
      audioElement.removeEventListener("loadedmetadata", handleTimeUpdate)
    }
  }, [audioElement, isDragging])

  const handleSeek = (value: number) => {
    if (audioElement) {
      audioElement.currentTime = value
    }
    setCurrentTime(value)
    setIsDragging(false)
  }

  const handleShare = async () => {
    if (!currentAudio) return
    try {
      await navigator.clipboard.writeText(currentAudio.audio.download_url || "")
      message.success("Download link copied to clipboard!")
    } catch (_e) {
      message.error("Failed to copy link")
    }
  }

  // Helper to get mode icon
  const getModeIcon = () => {
    switch (playMode) {
      case "sequence":
        return <BarsOutlined />
      case "list-loop":
        return <RetweetOutlined />
      case "single-loop":
        return (
          <Flex
            style={{
              position: "relative",
            }}
            align="center"
            justify="center"
          >
            <RetweetOutlined />
            <Text
              style={{
                position: "absolute",
                fontSize: "10px",
                right: "-6px",
                top: "-4px",
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
  }

  if (!currentAudio) {
    return (
      <Flex
        vertical
        className="player-page empty"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
            icon={getModeIcon()}
            onClick={togglePlayMode}
            className="action-btn secondary"
            style={{ cursor: "pointer" }}
          />

          <Button
            type="text"
            icon={<StepBackwardOutlined />}
            onClick={() => playPrev()}
            className="action-btn secondary"
            style={{ cursor: "pointer" }}
          />

          <Button
            type="text"
            icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
            onClick={togglePlay}
            className="play-btn large"
            style={{ cursor: "pointer" }}
          />

          <Button
            icon={<StepForwardOutlined />}
            onClick={() => playNext()}
            className="action-btn secondary"
            style={{ cursor: "pointer" }}
          />

          <Button
            icon={
              (currentAudio ? isFavorited(currentAudio.audio.id) : false) ? (
                <HeartFilled style={{ color: "#ff4d4f" }} />
              ) : (
                <HeartOutlined />
              )
            }
            onClick={() => toggleFavorite(currentAudio)}
            className="action-btn secondary"
            style={{ cursor: "pointer" }}
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
