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
} from "@ant-design/icons"
import { Slider, message } from "antd"
import { useAppStore } from "../../store"
import { FAVORITE_PLAYLIST_ID, get_web_url } from "../../api"
import "./index.less"

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
    playlists,
    playMode,
    togglePlayMode,
  } = useAppStore()

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Check if favorited
  const isFavorited = currentAudio
    ? playlists
      .find((p) => p.id === FAVORITE_PLAYLIST_ID)
      ?.audios.some((a) => a.audio.id === currentAudio.audio.id)
    : false

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
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <RetweetOutlined />
            <span
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
            </span>
          </div>
        )
      case "shuffle":
        return <SwapOutlined />
      default:
        return <BarsOutlined />
    }
  }

  if (!currentAudio) {
    return (
      <div className="player-page empty">
        <div className="player-header">
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <LeftOutlined />
          </button>
        </div>
        <div className="empty-msg">No Audio Playing</div>
      </div>
    )
  }

  return (
    <div className="player-page">
      {/* Header */}
      <div className="player-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <LeftOutlined />
        </button>
        <div className="header-title">
          <span>{currentAudio.audio.title}</span>
        </div>
        <button className="icon-btn" onClick={handleShare}>
          <ShareAltOutlined />
        </button>
      </div>

      {/* Cover */}
      <div className="player-content">
        <div className="large-cover">
          {coverUrl ? (
            <img src={coverUrl} alt={currentAudio.audio.title} />
          ) : (
            <div className="cover-placeholder large">
              {currentAudio.audio.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="track-info">
          <h2>{currentAudio.audio.title}</h2>
          <p>{currentAudio.audio.platform}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="player-controls-container">
        {/* Progress */}
        <div className="progress-bar">
          <span className="time-text">{formatTime(currentTime)}</span>
          <Slider
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
          <span className="time-text">{formatTime(duration)}</span>
        </div>

        {/* Main Controls */}
        <div className="main-controls">
          <button className="action-btn secondary" onClick={togglePlayMode}>
            {getModeIcon()}
          </button>

          <button className="action-btn secondary" onClick={() => playPrev()}>
            <StepBackwardOutlined />
          </button>

          <button className="play-btn large" onClick={togglePlay}>
            {isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
          </button>

          <button className="action-btn secondary" onClick={() => playNext()}>
            <StepForwardOutlined />
          </button>

          <button
            className="action-btn secondary"
            onClick={() => toggleFavorite(currentAudio)}
          >
            {isFavorited ? (
              <HeartFilled style={{ color: "#ff4d4f" }} />
            ) : (
              <HeartOutlined />
            )}
          </button>
        </div>
      </div>

      {/* Background Blur */}
      <div
        className="player-bg"
        style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : "none" }}
      />
    </div>
  )
}

export default PlayerPage
