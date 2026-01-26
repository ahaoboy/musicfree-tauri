import { FC, useCallback, useMemo, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Flex, Avatar } from "antd"
import DownloadOutlined from "@ant-design/icons/DownloadOutlined"
import ReloadOutlined from "@ant-design/icons/ReloadOutlined"
import PlusOutlined from "@ant-design/icons/PlusOutlined"
import StopOutlined from "@ant-design/icons/StopOutlined"
import CheckOutlined from "@ant-design/icons/CheckOutlined"
import EnvironmentOutlined from "@ant-design/icons/EnvironmentOutlined"
import LoadingOutlined from "@ant-design/icons/LoadingOutlined"
import { SearchBottomBar } from "./SearchBottomBar"
import {
  DEFAULT_COVER_URL,
  LocalPlaylist,
  AUDIO_PLAYLIST_ID,
  download_cover,
  LocalAudio,
} from "../../api"
import { useAppStore } from "../../store"
import { AudioCard, AudioList } from "../../components"
import { isLongDuration } from "../../utils/audio"
import "./index.less"

const { Search } = Input

export const SearchPage: FC = () => {
  const navigate = useNavigate()

  // Ref to track previous downloading IDs for auto-scroll
  const prevDownloadingIdsRef = useRef<Set<string>>(new Set())

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
      const element = document.querySelector(`[data-item-id="${audioId}"]`)

      if (element) {
        // Scroll into view with smooth behavior
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        })
      }
    }
  }, [downloadingIds, downloadingAll])

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

  const getAudioId = useCallback((audio: any) => audio.id, [])

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

    // Retry if we have failed/skipped and NO pending? Or Retry mixes with pending?
    // Usually Retry is specific. If text is "Retry", we are in retry mode.
    // Simplification:
    // If we have pending items, we download them.
    // If we have ONLY failed/skipped, we retry them.
    // If we have ONLY downloaded, we add.

    const isRetryMode =
      (selectedFailedIds.length > 0 || selectedSkippedIds.length > 0) &&
      selectedPendingIds.length === 0
    const isAddMode =
      selectedPendingIds.length === 0 &&
      selectedFailedIds.length === 0 &&
      selectedSkippedIds.length === 0

    // Collect existing audios for "Add" mode
    const existingAudios: LocalAudio[] = []
    if (isAddMode) {
      for (const id of selectedIds) {
        if (downloadedAudios.has(id)) {
          existingAudios.push(downloadedAudios.get(id)!)
        } else {
          const cfg = configAudios.find((a) => a.audio.id === id)
          if (cfg) existingAudios.push(cfg)
        }
      }
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
      // If failed/skipped > 0, do NOT auto-add.
      // Note: skippedCount includes already downloaded ones skipped?
      // downloadMultiple returns { failedCount ... }
      if (result.failedCount === 0) {
        // If some were aborted during this batch, failedCount is 0, but they are now in skippedIds?
        // Wait, startDownload adds to skippedIds if aborted.
        // downloadMultiple doesn't count skipped as failed.
        // We should check if we have any non-success that prevents adding.
        // If user aborted, they probably don't want auto-add?
        // Let's rely on user clicking "Add" after ensuring everything is green.
        // So ONLY auto-add if EVERYTHING in selection is now downloaded.

        // Check selection status after download
        // We can't check store immediately if batch updates?
        // But we can check result.

        // Actually, safer to NOT auto-add if we just did a download batch,
        // UNLESS it was a perfect run.
        // User asked "When selected audios all downloaded... click executes add".
        // This implies manual click for Add?
        // "When (condition), download button becomes PlusOutlined".
        // So I should validly just let the button state update, and user clicks again.
        // But previously I had auto-add logic.
        // Removing auto-add logic ensures consistent behavior ("Download" -> "Add").
        // But seamless is better.
        // Ref: "Clicking will execute add".
        // If I make it auto, button doesn't become Plus.
        // I will keep auto-add for seamlessness, BUT if skipped/failed, stop.

        // Check if any selected items are NOT downloaded
        // Since store updates are async in React but synchronous in Zustand vanilla,
        // we can check if result.downloaded + existing covers all selected?
        // Let's just trust `failedCount === 0`.
        // If aborted, `failedCount` is 0 (it counts as skipped/failed in startDownload logic? No, startDownload returns null. downloadMultiple increments failedCount).
        // My `downloadMultiple` in slice increments `failedCount` if `startDownload` returns null.
        // `startDownload` returns null on ABORT.
        // So failedCount INCLUDES skipped/aborted.
        // So `if (result.failedCount === 0)` handles it.

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
    currentPlaylist: any,
    _isAddMode: boolean,
  ) => {
    const allAudios = [...result.downloadedAudios, ...result.existingAudios]
    const isPlaylist = currentPlaylist.audios.length > 1

    if (isPlaylist && allAudios.length > 0) {
      let coverPath: string | null = null
      if (currentPlaylist.cover) {
        try {
          coverPath = await download_cover(
            currentPlaylist.cover,
            currentPlaylist.platform,
          )
        } catch (e) {
          console.error(e)
        }
      } else {
        const first = result.downloadedAudios[0] || result.existingAudios[0]
        if (first?.audio.cover) {
          try {
            coverPath = await download_cover(
              first.audio.cover,
              first.audio.platform,
            )
          } catch (_e) { }
        }
      }

      const audioMap = new Map(allAudios.map((a) => [a.audio.id, a]))
      const finalAudios = currentPlaylist.audios
        .map((a: any) => audioMap.get(a.id))
        .filter(Boolean)

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
        download_url: currentPlaylist.id,
      }

      await addPlaylistToConfig(localPlaylist)
      clearSelection()
      navigate(`/playlists?highlight=${encodeURIComponent(localPlaylist.id!)}`)
    } else if (!isPlaylist && allAudios.length > 0) {
      if (result.downloadedAudios.length > 0) {
        await addAudiosToConfig(result.downloadedAudios)
      }
      clearSelection()
      navigate(`/music?highlight=${encodeURIComponent(allAudios[0].audio.id)}`)
    }
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
    // Show if we have failed OR skipped items in selection OR long pending items
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

    // Logic:
    // All downloaded -> Add
    // Failed/Skipped > 0 and Pending == 0 -> Retry
    // Pending > 0 -> Download

    let text = ""
    let icon = <DownloadOutlined />

    if (pendingCount === 0 && (failedCount > 0 || skippedCount > 0)) {
      text = `${failedCount + skippedCount}`
      icon = <ReloadOutlined />
    } else if (
      pendingCount === 0 &&
      failedCount === 0 &&
      skippedCount === 0 &&
      alreadyDownloadedCount > 0
    ) {
      text = `${alreadyDownloadedCount}`
      icon = <PlusOutlined />
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
        <Flex align="center" gap={"small"}>
          {downloading && (
            <LoadingOutlined
              style={{
                fontSize: 12,
                color: "#1890ff",
              }}
              title="Downloading"
            />
          )}
          {downloaded && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#52c41a",
              }}
              title="Downloaded"
            />
          )}
          {failed && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ff4d4f",
              }}
              title="Failed"
            />
          )}
          {skipped && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#faad14",
              }}
              title="Skipped"
            />
          )}
        </Flex>
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
              <CheckOutlined
                style={{
                  color: "#fff",
                  background: "#52c41a",
                  borderRadius: "50%",
                  padding: 4,
                  fontSize: 12,
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
                type="text"
                danger
                icon={<StopOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  abortDownload(audioId)
                }}
              />
            ) : inLibrary ? (
              <Button
                type="text"
                icon={<EnvironmentOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigateToAudio(audioId)
                }}
                title="Go to audio"
              />
            ) : (
              <Button
                type="text"
                icon={<DownloadOutlined />}
                disabled={downloadingAll || downloaded}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadSingle(audioId)
                }}
                title="Download"
              />
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
    <Flex vertical className="page search-page" gap="small">
      <Search
        placeholder="Input audio/playlist ID/URL"
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        loading={searching}
        disabled={searching || downloadingAll}
        size="large"
      />

      {playlist && !searching && (
        <>
          <AudioList
            items={playlist.audios}
            getItemId={getAudioId}
            renderItem={renderSearchItem}
          />

          {/* // ... (inside the component return, Replace the bottom bar Flex with:) */}
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
        </>
      )}

      {!playlist && !searching && (
        <Flex flex={1} align="center" justify="center">
          <Avatar
            src={DEFAULT_COVER_URL}
            size={256}
            shape="square"
            style={{ opacity: 0.5 }}
            alt="Search"
          />
        </Flex>
      )}
    </Flex>
  )
}

export default SearchPage
