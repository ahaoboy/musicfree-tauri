import { FC, useCallback, useMemo, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Stack,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
} from "@mui/material"
import Download from "@mui/icons-material/Download"
import Refresh from "@mui/icons-material/Refresh"
import Add from "@mui/icons-material/Add"
import Stop from "@mui/icons-material/Stop"
import Check from "@mui/icons-material/Check"
import SearchIcon from "@mui/icons-material/Search"
import Clear from "@mui/icons-material/Clear"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"

import { SearchBottomBar } from "./SearchBottomBar"
import {
  LocalPlaylist,
  AUDIO_PLAYLIST_ID,
  download_cover,
  LocalAudio,
  Audio,
  Playlist,
} from "../../api"

import { useAppStore } from "../../store"
import logger from "../../utils/logger"

const log = logger.search
import { AudioCard, AudioList } from "../../components"
import { useAdaptiveSize } from "../../hooks"
import { isLongDuration } from "../../utils/audio"
import { statusDotSx, splashIconSx } from "../../hooks/useTheme"

/**
 * Processes search input to extract URLs from sharing messages
 * and trims the final result.
 */
const processSearchInput = (value: string): string => {
  const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*)/i
  const match = value.match(urlRegex)

  // If it's a sharing message (contains URL + extra text), extract URL
  if (match && match[0] !== value.trim()) {
    return match[0].trim()
  }

  // Otherwise return the whole trimmed input
  return value.trim()
}

export const SearchPage: FC = () => {
  const navigate = useNavigate()

  // Ref to track previous downloading IDs for auto-scroll
  const prevDownloadingIdsRef = useRef<Set<string>>(new Set())

  // State for auto-scroll target
  const [scrollToId, setScrollToId] = useState<string | null>(null)

  const { buttonSize, iconSize, muiSize } = useAdaptiveSize("medium")
  const iconStyle = { fontSize: iconSize }

  // Store State
  const searchText = useAppStore((state) => state.searchText)
  const playlist = useAppStore((state) => state.searchPlaylist)
  const searching = useAppStore((state) => state.searchSearching)
  const playlistCoverUrl = useAppStore((state) => state.searchPlaylistCoverUrl)

  const downloadingIds = useAppStore((state) => state.searchDownloadingIds)
  const downloadedIds = useAppStore((state) => state.searchDownloadedIds)
  const failedIds = useAppStore((state) => state.searchFailedIds)
  const skippedIds = useAppStore((state) => state.searchSkippedIds)
  const downloadingAll = useAppStore((state) => state.searchDownloadingAll)
  const downloadedAudios = useAppStore((state) => state.searchDownloadedAudios)
  const selectedIds = useAppStore((state) => state.searchSelectedIds)

  // Store Actions
  const setSearchText = useAppStore((state) => state.setSearchText)
  const search = useAppStore((state) => state.search)
  const clearSearchRuntimeData = useAppStore(
    (state) => state.clearSearchRuntimeData,
  )
  const toggleSelect = useAppStore((state) => state.toggleSearchSelect)
  const toggleSelectAll = useAppStore((state) => state.toggleSearchSelectAll)
  const clearSelection = useAppStore((state) => state.clearSearchSelection)

  const startDownload = useAppStore((state) => state.startDownload)
  const abortDownload = useAppStore((state) => state.abortDownload)
  const downloadMultiple = useAppStore((state) => state.downloadMultiple)
  const clearSearchFailedAndSkippedIds = useAppStore(
    (state) => state.clearSearchFailedAndSkippedIds,
  )

  const addAudiosToConfig = useAppStore((state) => state.addAudiosToConfig)
  const addPlaylistToConfig = useAppStore((state) => state.addPlaylistToConfig)
  const configPlaylists = useAppStore((state) => state.config.playlists)

  // Clear on unmount
  useEffect(() => {
    return () => {
      // Optional cleanup
    }
  }, [])

  // Clear if text empty
  useEffect(() => {
    if (!searchText.trim() && playlist) {
      clearSearchRuntimeData()
    }
  }, [searchText, playlist, clearSearchRuntimeData])

  // Auto-scroll to downloading audio
  useEffect(() => {
    // Find newly added downloading IDs
    const prevIds = prevDownloadingIdsRef.current
    const newDownloadingIds = Array.from(downloadingIds).filter(
      (id) => !prevIds.has(id),
    )

    // Update ref for next comparison
    prevDownloadingIdsRef.current = new Set(downloadingIds)

    // Scroll to the first newly downloading audio
    if (newDownloadingIds.length > 0 && downloadingAll) {
      const audioId = newDownloadingIds[0]
      setScrollToId(audioId)
    }
  }, [downloadingIds, downloadingAll])

  // Auto-scroll to default selection when playlist changes
  useEffect(() => {
    if (playlist?.audios?.length) {
      const currentSelectedIds = useAppStore.getState().searchSelectedIds
      const target = playlist.audios.find((a) => currentSelectedIds.has(a.id))
      if (target) {
        setScrollToId(target.id)
      } else {
        setScrollToId(playlist.audios[0].id)
      }
    }
  }, [playlist])

  // Get existing audios from config
  const configAudios = useMemo(() => {
    const audioPlaylist = configPlaylists.find(
      (p) => p.id === AUDIO_PLAYLIST_ID,
    )
    return audioPlaylist?.audios || []
  }, [configPlaylists])

  // Check if audio exists in CONFIG (Library)
  const checkInLibrary = useCallback(
    (audioId: string): boolean => {
      return configAudios.some((a) => a.audio.id === audioId)
    },
    [configAudios],
  )

  const handleSearchTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(processSearchInput(e.target.value))
    },
    [setSearchText],
  )

  const handleSearch = useCallback(() => {
    search(searchText)
  }, [search, searchText])

  // Navigation handlers
  const handleNavigateToAudio = useCallback(
    (audioId: string) => {
      navigate(`/music?highlight=${encodeURIComponent(audioId)}`)
    },
    [navigate],
  )

  const getAudioId = useCallback((audio: Audio) => audio.id, [])

  const handleDownloadSingle = useCallback(
    async (audioId: string) => {
      if (!playlist) return
      const audio = playlist.audios.find((a) => a.id === audioId)
      if (!audio) return

      const localAudio = await startDownload(audio)
      if (localAudio) {
        await addAudiosToConfig([localAudio])
      }
    },
    [playlist, startDownload, addAudiosToConfig],
  )

  // Get long pending audios among selected (duration > 30m and not in library/downloaded)
  const longPendingSelectedIds = useMemo(() => {
    if (!playlist) return new Set<string>()
    return new Set(
      playlist.audios
        .filter((audio) => {
          if (!selectedIds.has(audio.id)) return false
          const isLong = isLongDuration(audio.duration)
          if (!isLong) return false

          const inLibrary = checkInLibrary(audio.id)
          const isDownloaded = downloadedIds.has(audio.id)
          const isDownloading = downloadingIds.has(audio.id)

          return !inLibrary && !isDownloaded && !isDownloading
        })
        .map((a) => a.id),
    )
  }, [playlist, selectedIds, checkInLibrary, downloadedIds, downloadingIds])

  const handleClearSpecial = useCallback(() => {
    // Unselect all failed/skipped items OR long pending items
    const audiosToUnselect = new Set<string>()
    failedIds.forEach((id) => audiosToUnselect.add(id))
    skippedIds.forEach((id) => audiosToUnselect.add(id))
    longPendingSelectedIds.forEach((id) => audiosToUnselect.add(id))

    audiosToUnselect.forEach((id) => {
      if (selectedIds.has(id)) toggleSelect(id)
    })

    clearSearchFailedAndSkippedIds()
  }, [
    failedIds,
    skippedIds,
    selectedIds,
    longPendingSelectedIds,
    toggleSelect,
    clearSearchFailedAndSkippedIds,
  ])

  const handleDownloadAll = useCallback(async () => {
    if (!playlist || selectedIds.size === 0) return

    log.info("Starting download/add process...")
    log.info(`Selected IDs: ${selectedIds.size}`)

    const selectedAudios = playlist.audios.filter((a) => selectedIds.has(a.id))

    // Determine mode
    const selectedFailedIds = Array.from(selectedIds).filter((id) =>
      failedIds.has(id),
    )
    const selectedSkippedIds = Array.from(selectedIds).filter((id) =>
      skippedIds.has(id),
    )
    const selectedPendingIds = Array.from(selectedIds).filter(
      (id) =>
        !downloadedIds.has(id) && !failedIds.has(id) && !skippedIds.has(id),
    )

    const isRetryMode =
      (selectedFailedIds.length > 0 || selectedSkippedIds.length > 0) &&
      selectedPendingIds.length === 0
    const isAddMode =
      selectedPendingIds.length === 0 &&
      selectedFailedIds.length === 0 &&
      selectedSkippedIds.length === 0

    log.info(`Mode: ${isRetryMode ? "Retry" : isAddMode ? "Add" : "Download"}`)
    log.info(
      `Pending: ${selectedPendingIds.length}, Failed: ${selectedFailedIds.length}, Skipped: ${selectedSkippedIds.length}`,
    )

    // Collect existing audios for "Add" mode
    const existingAudios: LocalAudio[] = []
    if (isAddMode) {
      log.info("Add mode: collecting existing audios...")
      for (const id of selectedIds) {
        if (downloadedAudios.has(id)) {
          const audio = downloadedAudios.get(id)!
          existingAudios.push(audio)
          log.info(`Found in downloadedAudios: ${audio.audio.title}`)
        } else {
          const cfg = configAudios.find((a) => a.audio.id === id)
          if (cfg) {
            existingAudios.push(cfg)
            log.info(`Found in config: ${cfg.audio.title}`)
          }
        }
      }
      log.info(`Total existing audios: ${existingAudios.length}`)
    }

    const knownExisting = configAudios.filter((a) =>
      selectedIds.has(a.audio.id),
    )

    if (isAddMode) {
      const result = {
        downloadedAudios: [],
        existingAudios,
      }
      await processDownloadResult(result, playlist, isAddMode)
    } else {
      const result = await downloadMultiple(
        selectedAudios,
        knownExisting,
        isRetryMode,
      )

      if (result.failedCount === 0) {
        await processDownloadResult(result, playlist, isAddMode)
      }
    }
  }, [
    playlist,
    selectedIds,
    failedIds,
    skippedIds,
    downloadedIds,
    downloadedAudios,
    configAudios,
    downloadMultiple,
  ])

  const processDownloadResult = async (
    result: { downloadedAudios: LocalAudio[]; existingAudios: LocalAudio[] },
    currentPlaylist: Playlist,
    isAddMode: boolean,
  ) => {
    log.info("Processing download result...")
    log.info(
      `Downloaded: ${result.downloadedAudios.length}, Existing: ${result.existingAudios.length}`,
    )

    const allAudios = [...result.downloadedAudios, ...result.existingAudios]
    const isPlaylist = currentPlaylist.audios.length > 1

    log.info(`Is playlist: ${isPlaylist}, Total audios: ${allAudios.length}`)

    if (isPlaylist && allAudios.length > 0) {
      log.info("Processing as playlist...")
      let coverPath: string | null = null
      if (currentPlaylist.cover) {
        try {
          coverPath = await download_cover(
            currentPlaylist.cover,
            currentPlaylist.platform,
          )
        } catch (e) {
          log.error("Failed to download playlist cover:", e)
        }
      } else {
        const first = result.downloadedAudios[0] || result.existingAudios[0]
        if (first?.audio.cover) {
          try {
            coverPath = await download_cover(
              first.audio.cover,
              first.audio.platform,
            )
          } catch (_e) {}
        }
      }

      const audioMap = new Map(allAudios.map((a) => [a.audio.id, a]))
      const finalAudios = currentPlaylist.audios
        .map((a: Audio) => audioMap.get(a.id))
        .filter(Boolean) as LocalAudio[]

      const localPlaylist: LocalPlaylist = {
        id:
          currentPlaylist.id ||
          currentPlaylist.title ||
          new Date().toISOString(),
        title: currentPlaylist.title,
        cover_path: coverPath,
        cover: currentPlaylist.cover,
        audios: finalAudios,
        platform: currentPlaylist.platform,
        download_url: currentPlaylist.download_url,
      }

      log.info(`Adding playlist to config: ${localPlaylist.title}`)
      await addPlaylistToConfig(localPlaylist)
      clearSelection()
      navigate(`/playlists?highlight=${encodeURIComponent(localPlaylist.id!)}`)
    } else if (!isPlaylist && allAudios.length > 0) {
      log.info("Processing as single audio...")

      // In Add mode, we need to add existing audios to config if they're not already there
      if (isAddMode && result.existingAudios.length > 0) {
        log.info("Add mode: checking if audios need to be added to config...")
        const audiosToAdd: LocalAudio[] = []

        for (const audio of result.existingAudios) {
          const inConfig = configAudios.some(
            (a) => a.audio.id === audio.audio.id,
          )
          if (!inConfig) {
            log.info(`Audio not in config, will add: ${audio.audio.title}`)
            audiosToAdd.push(audio)
          } else {
            log.info(`Audio already in config: ${audio.audio.title}`)
          }
        }

        if (audiosToAdd.length > 0) {
          log.info(`Adding ${audiosToAdd.length} audios to config`)
          await addAudiosToConfig(audiosToAdd)
        }
      } else if (result.downloadedAudios.length > 0) {
        log.info(
          `Adding ${result.downloadedAudios.length} downloaded audios to config`,
        )
        await addAudiosToConfig(result.downloadedAudios)
      }

      clearSelection()
      navigate(`/music?highlight=${encodeURIComponent(allAudios[0].audio.id)}`)
    }

    log.info("Process complete")
  }

  // Selection helpers
  const isAllSelected = useMemo(() => {
    if (!playlist) return false
    return (
      playlist.audios.length > 0 && selectedIds.size === playlist.audios.length
    )
  }, [playlist, selectedIds])

  const isSomeSelected = useMemo(() => {
    if (!playlist) return false
    return selectedIds.size > 0 && selectedIds.size < playlist.audios.length
  }, [playlist, selectedIds])

  // UI States
  const showClearButton = useMemo(() => {
    if (!playlist || downloadingAll) return false
    return (
      Array.from(selectedIds).some(
        (id) => failedIds.has(id) || skippedIds.has(id),
      ) || longPendingSelectedIds.size > 0
    )
  }, [
    playlist,
    downloadingAll,
    selectedIds,
    failedIds,
    skippedIds,
    longPendingSelectedIds,
  ])

  // Button logic
  const { downloadButtonText, downloadButtonIcon } = useMemo(() => {
    const selectedArray = Array.from(selectedIds)
    const alreadyDownloadedCount = selectedArray.filter((id) =>
      downloadedIds.has(id),
    ).length
    const failedCount = selectedArray.filter((id) => failedIds.has(id)).length
    const skippedCount = selectedArray.filter((id) => skippedIds.has(id)).length
    const pendingCount = selectedArray.filter(
      (id) =>
        !downloadedIds.has(id) && !failedIds.has(id) && !skippedIds.has(id),
    ).length

    let text = ""
    let icon = <Download />

    if (pendingCount === 0 && (failedCount > 0 || skippedCount > 0)) {
      text = `${failedCount + skippedCount}`
      icon = <Refresh />
    } else if (
      pendingCount === 0 &&
      failedCount === 0 &&
      skippedCount === 0 &&
      alreadyDownloadedCount > 0
    ) {
      text = `${alreadyDownloadedCount}`
      icon = <Add />
    } else if (pendingCount > 0) {
      text = `${pendingCount}`
    }

    return { downloadButtonText: text, downloadButtonIcon: icon }
  }, [selectedIds, downloadedIds, failedIds, skippedIds])

  const renderSearchItem = useCallback(
    (audio: LocalAudio["audio"]) => {
      const audioId = audio.id
      const downloading = downloadingIds.has(audioId)
      const downloaded = downloadedIds.has(audioId)
      const failed = failedIds.has(audioId)
      const skipped = skippedIds.has(audioId)
      const selected = selectedIds.has(audioId)
      const inLibrary = checkInLibrary(audioId)

      // Status badges
      const statusBadges = (
        <Stack direction="row" spacing={0.5} alignItems="center">
          {downloading && (
            <CircularProgress
              size={12}
              sx={{ color: "primary.main" }}
              title="Downloading"
            />
          )}
          {downloaded && (
            <Box
              sx={{ ...statusDotSx, bgcolor: "success.main" }}
              title="Downloaded"
            />
          )}
          {failed && (
            <Box
              sx={{ ...statusDotSx, bgcolor: "error.main" }}
              title="Failed"
            />
          )}
          {skipped && (
            <Box
              sx={{ ...statusDotSx, bgcolor: "warning.main" }}
              title="Skipped"
            />
          )}
        </Stack>
      )

      return (
        <AudioCard
          coverPath={null}
          coverUrl={audio.cover}
          platform={audio.platform}
          title={audio.title}
          duration={audio.duration}
          warnLongDuration={true}
          onClick={() => {
            if (!downloading && !downloadingAll) {
              toggleSelect(audioId)
            }
          }}
          active={false}
          badge={{
            show: true,
            icon: selected ? (
              <Check
                sx={{
                  color: "#fff",
                  bgcolor: "success.main",
                  borderRadius: "50%",
                  p: 0.5,
                  fontSize: 20,
                }}
              />
            ) : (
              0
            ),
          }}
          extraInfo={statusBadges}
          actions={
            downloading ? (
              <Button
                variant="text"
                color="error"
                onClick={(e) => {
                  e.stopPropagation()
                  abortDownload(audioId)
                }}
                aria-label="Stop download"
                size={muiSize}
                sx={{
                  minWidth: 0,
                  p: 0,
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: 1,
                }}
              >
                <Stop style={iconStyle} />
              </Button>
            ) : inLibrary ? (
              <Button
                variant="text"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigateToAudio(audioId)
                }}
                aria-label="Go to audio"
                size={muiSize}
                sx={{
                  minWidth: 0,
                  p: 0,
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: 1,
                }}
              >
                <ArrowForwardIcon style={iconStyle} />
              </Button>
            ) : (
              <Button
                variant="text"
                color="primary"
                disabled={downloadingAll || downloaded}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadSingle(audioId)
                }}
                aria-label="Download"
                size={muiSize}
                sx={{
                  minWidth: 0,
                  p: 0,
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: 1,
                }}
              >
                <Download style={iconStyle} />
              </Button>
            )
          }
        />
      )
    },
    [
      downloadingIds,
      downloadedIds,
      failedIds,
      skippedIds,
      selectedIds,
      downloadingAll,
      checkInLibrary,
      toggleSelect,
      abortDownload,
      handleNavigateToAudio,
      handleDownloadSingle,
    ],
  )

  return (
    <Stack
      spacing={0.5}
      sx={{
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1, pb: 0 }}>
        <TextField
          fullWidth
          placeholder="Input audio/playlist ID/URL"
          value={searchText}
          onChange={handleSearchTextChange}
          disabled={searching || downloadingAll}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch()
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  {searchText && !searching && (
                    <Button
                      onClick={() => setSearchText("")}
                      size={muiSize}
                      sx={{
                        minWidth: 0,
                        p: 0,
                        width: buttonSize,
                        height: buttonSize,
                        borderRadius: "50%",
                        color: "text.secondary",
                        mr: 0.5,
                      }}
                    >
                      <Clear style={iconStyle} />
                    </Button>
                  )}
                  <Button
                    onClick={handleSearch}
                    disabled={searching || !searchText}
                    color="primary"
                    size={muiSize}
                    sx={{
                      minWidth: 0,
                      p: 0,
                      width: buttonSize,
                      height: buttonSize,
                      borderRadius: "50%",
                    }}
                  >
                    {searching ? (
                      <CircularProgress size={iconSize} />
                    ) : (
                      <SearchIcon style={iconStyle} />
                    )}
                  </Button>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {(!playlist || playlist.audios.length === 0) && !searching && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pb: "10%",
          }}
        >
          <Box component="img" src="/icon.png" alt="icon" sx={splashIconSx} />
        </Box>
      )}

      {playlist && playlist.audios.length > 0 && !searching && (
        <>
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <AudioList
              items={playlist.audios}
              getItemId={getAudioId}
              renderItem={renderSearchItem}
              highlightId={scrollToId}
            />
          </Box>

          <Box
            className="search-bottom-bar"
            sx={{
              flex: "none",
              bgcolor: "background.paper",
              borderTop: 1,
              borderColor: "divider",
              boxShadow: 4,
              borderRadius: 2,
            }}
          >
            <SearchBottomBar
              playlist={playlist}
              playlistCoverUrl={playlistCoverUrl}
              isAllSelected={isAllSelected}
              isSomeSelected={isSomeSelected}
              onToggleSelectAll={(checked: boolean) =>
                toggleSelectAll(playlist.audios, checked)
              }
              showClearButton={showClearButton}
              longPendingCount={longPendingSelectedIds.size}
              onClear={handleClearSpecial}
              downloadButtonIcon={downloadButtonIcon}
              downloadButtonText={downloadButtonText}
              isDownloadingAll={downloadingAll}
              isSelectedEmpty={selectedIds.size === 0}
              onDownloadAll={handleDownloadAll}
            />
          </Box>
        </>
      )}
    </Stack>
  )
}
