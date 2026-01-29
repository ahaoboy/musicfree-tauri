import { FC, useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MusicNote } from "@mui/icons-material"
import {
  Slider,
  Typography,
  Avatar,
  Stack,
  Box,
  useTheme,
  alpha,
} from "@mui/material"
import { useAppStore, useCurrentTime, useDuration } from "../../store"
import { DEFAULT_COVER_URL, AUDIO_PLAYLIST_ID } from "../../api"
import { useCoverUrl, useConfirm } from "../../hooks"
import {
  MoreActionsDropdown,
  PlayerControls,
  BackButton,
  PlatformIcon,
} from "../../components"

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
  const theme = useTheme()

  // Selective store subscriptions
  const currentAudio = useAppStore((state) => state.currentAudio)
  const currentPlaylistId = useAppStore((state) => state.currentPlaylistId)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const audioElement = useAppStore((state) => state.audioElement)
  const deleteAudio = useAppStore((state) => state.deleteAudio)
  const canSeek = useAppStore((state) => state.canSeek)

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
  const handleSliderChange = useCallback(
    (_: Event, value: number | number[]) => {
      if (!canSeek) return
      setIsDragging(true)
      setDragTime(value as number)
    },
    [canSeek],
  )

  // Commit seek operation when user releases slider
  const handleAfterChange = useCallback(
    (
      _event: Event | React.SyntheticEvent | undefined,
      value: number | number[],
    ) => {
      if (!canSeek) return
      const seekTime = value as number
      if (audioElement && Number.isFinite(seekTime)) {
        audioElement.currentTime = seekTime
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
    [audioElement, isPlaying, currentAudio, canSeek],
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
      <Box
        className="player-page empty"
        sx={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          zIndex: 20,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            p: 1.5,
            pt: "max(env(safe-area-inset-top), 12px)",
          }}
        >
          <BackButton />
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      className={`player-page ${isPlaying ? "playing" : ""}`}
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        zIndex: 20,
        overflow: "hidden",
        pb: "12px",
      }}
    >
      {/* Background Blur */}
      <Box
        sx={{
          position: "absolute",
          inset: -20,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: -1,
          opacity: theme.palette.mode === "light" ? 0.2 : 0.3,
          backgroundImage: coverUrl ? `url(${coverUrl})` : "none",
          filter:
            theme.palette.mode === "light"
              ? "blur(40px) brightness(0.8)"
              : "blur(40px) brightness(0.7)",
          "@media (hover: none)": {
            filter:
              theme.palette.mode === "light"
                ? "brightness(0.8)"
                : "brightness(0.4)",
            backgroundColor:
              theme.palette.mode === "light" ? "#f5f5f5" : "#000",
          },
        }}
      />

      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          p: 1.5,
          pt: "max(env(safe-area-inset-top), 12px)",
        }}
      >
        <BackButton />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Typography
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            {currentAudio.audio.title}
          </Typography>
        </Box>
        <MoreActionsDropdown
          url={currentAudio.audio.download_url}
          onDelete={handleDelete}
          disabled={!currentAudio.audio.download_url && !currentPlaylistId}
        />
      </Stack>

      {/* Cover */}
      <Stack flex={1} alignItems="center" justifyContent="center" sx={{ p: 3 }}>
        <Avatar
          src={coverUrl || DEFAULT_COVER_URL}
          variant="rounded"
          alt={currentAudio.audio.title}
          sx={{
            width: "min(70vw, 320px)",
            height: "min(70vw, 320px)",
            borderRadius: 4,
            boxShadow: 20,
            mb: 4,
          }}
        >
          <MusicNote sx={{ fontSize: 80 }} />
        </Avatar>

        <Stack
          alignItems="center"
          spacing={1}
          sx={{ width: "100%", px: 3, textAlign: "center" }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              width: "100%",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            {currentAudio.audio.title}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PlatformIcon platform={currentAudio.audio.platform} size={36} />
          </Stack>
        </Stack>
      </Stack>

      {/* Controls */}
      <Stack
        sx={{ p: 3, pb: "max(env(safe-area-inset-bottom), 24px)" }}
        spacing={2}
      >
        {/* Progress */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 40, textAlign: "right" }}
          >
            {formatTime(currentTime)}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={duration || 100}
            value={isDragging ? dragTime : currentTime}
            onChange={handleSliderChange}
            onChangeCommitted={handleAfterChange}
            disabled={!duration || duration === 0 || !canSeek}
            valueLabelDisplay="off"
            sx={{
              flex: 1,
              "& .MuiSlider-thumb": {
                width: 12,
                height: 12,
                transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
                "&:before": {
                  boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
                },
                "&:hover, &.Mui-focusVisible": {
                  boxShadow: `0px 0px 0px 8px ${alpha(theme.palette.primary.main, 0.16)}`,
                },
                "&.Mui-active": {
                  width: 20,
                  height: 20,
                },
              },
              "& .MuiSlider-rail": {
                opacity: 0.28,
              },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 40 }}
          >
            {formatTime(duration)}
          </Typography>
        </Stack>

        {/* Main Controls */}
        <PlayerControls
          audio={currentAudio}
          layout="full"
          align="space-between"
          buttonSize="medium"
          iconSize={32}
          playButtonSize="large"
          playIconSize={60}
          playBoxSize={60}
        />
      </Stack>
    </Box>
  )
}

export default PlayerPage
