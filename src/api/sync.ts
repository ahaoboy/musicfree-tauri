import {
  Config,
  GistConfig,
  LocalPlaylist,
  LocalAudio,
  gist_download,
  gist_update,
  download_audio,
  download_cover,
  path_exists,
  FAVORITE_PLAYLIST_ID,
  AUDIO_PLAYLIST_ID,
} from "./index"

const CONFIG_FILE_NAME = "musicfree.json"

/**
 * Diff result between two configs
 */
export interface ConfigDiff {
  addedPlaylists: Set<string>
  removedPlaylists: Set<string>
  addedAudios: Set<string>
  removedAudios: Set<string>
  modifiedPlaylists: Set<string>
}

/**
 * Compare two configs and return the differences
 * This is the core function for detecting changes
 */
export function diffConfigs(
  oldConfig: Config,
  newConfig: Config,
): ConfigDiff {
  console.log("[Sync] Diffing configs...")

  const oldPlaylists = new Map(oldConfig.playlists.map((p) => [p.id!, p]))
  const newPlaylists = new Map(newConfig.playlists.map((p) => [p.id!, p]))

  const addedPlaylists = new Set<string>()
  const removedPlaylists = new Set<string>()
  const modifiedPlaylists = new Set<string>()

  // Detect added and modified playlists
  for (const [id, newPlaylist] of newPlaylists) {
    if (!oldPlaylists.has(id)) {
      addedPlaylists.add(id)
      console.log(`[Sync] Added playlist: ${newPlaylist.title} (${id})`)
    } else {
      const oldPlaylist = oldPlaylists.get(id)!
      if (JSON.stringify(oldPlaylist) !== JSON.stringify(newPlaylist)) {
        modifiedPlaylists.add(id)
      }
    }
  }

  // Detect removed playlists
  for (const [id, oldPlaylist] of oldPlaylists) {
    if (!newPlaylists.has(id)) {
      removedPlaylists.add(id)
      console.log(`[Sync] Removed playlist: ${oldPlaylist.title} (${id})`)
    }
  }

  // Detect audio changes (global level - from AUDIO_PLAYLIST)
  const oldAudioPlaylist = oldConfig.playlists.find((p) => p.id === AUDIO_PLAYLIST_ID)
  const newAudioPlaylist = newConfig.playlists.find((p) => p.id === AUDIO_PLAYLIST_ID)

  const oldAudioIds = new Set(oldAudioPlaylist?.audios.map((a) => a.audio.id) || [])
  const newAudioIds = new Set(newAudioPlaylist?.audios.map((a) => a.audio.id) || [])

  const addedAudios = new Set<string>()
  const removedAudios = new Set<string>()

  for (const id of newAudioIds) {
    if (!oldAudioIds.has(id)) {
      addedAudios.add(id)
      const audio = newAudioPlaylist?.audios.find((a) => a.audio.id === id)
      console.log(`[Sync] Added audio: ${audio?.audio.title} (${id})`)
    }
  }

  for (const id of oldAudioIds) {
    if (!newAudioIds.has(id)) {
      removedAudios.add(id)
      const audio = oldAudioPlaylist?.audios.find((a) => a.audio.id === id)
      console.log(`[Sync] Removed audio: ${audio?.audio.title} (${id})`)
    }
  }

  console.log(`[Sync] Diff summary: +${addedPlaylists.size}/-${removedPlaylists.size} playlists, +${addedAudios.size}/-${removedAudios.size} audios`)

  return {
    addedPlaylists,
    removedPlaylists,
    addedAudios,
    removedAudios,
    modifiedPlaylists,
  }
}

/**
 * Merges local and remote configs with proper conflict resolution
 * Rules:
 * - Remote order is preserved for playlists and audios
 * - Local file paths are preserved (since files are stored locally)
 * - Deletions from local are applied to remote
 */
export function mergeConfigs(
  local: Config,
  remote: Config,
  localDeletions: ConfigDiff,
): Config {
  console.log("[Sync] Merging configs...")

  const localPlaylistMap = new Map(local.playlists.map((p) => [p.id!, p]))
  const mergedPlaylists: LocalPlaylist[] = []
  const processedIds = new Set<string>()

  // Process remote playlists (remote order is source of truth)
  for (const remotePlaylist of remote.playlists) {
    const id = remotePlaylist.id!

    // Skip if deleted locally
    if (localDeletions.removedPlaylists.has(id)) {
      console.log(`[Sync] Skipping deleted playlist: ${remotePlaylist.title}`)
      continue
    }

    processedIds.add(id)
    const localPlaylist = localPlaylistMap.get(id)

    if (localPlaylist) {
      // Merge playlist: keep local paths, use remote metadata and order
      const localAudioMap = new Map(
        localPlaylist.audios.map((a) => [a.audio.id, a])
      )
      const remoteAudioIds = new Set(remotePlaylist.audios.map((a) => a.audio.id))
      const mergedAudios: LocalAudio[] = []

      // First, add all remote audios (preserving remote order)
      for (const remoteAudio of remotePlaylist.audios) {
        const audioId = remoteAudio.audio.id

        // Skip if deleted locally
        if (localDeletions.removedAudios.has(audioId)) {
          console.log(`[Sync] Skipping deleted audio: ${remoteAudio.audio.title}`)
          continue
        }

        const localAudio = localAudioMap.get(audioId)
        mergedAudios.push({
          audio: remoteAudio.audio,
          path: localAudio?.path || remoteAudio.path,
          cover_path: localAudio?.cover_path || remoteAudio.cover_path,
        })
      }

      // Then, add local-only audios (new audios added locally)
      for (const localAudio of localPlaylist.audios) {
        const audioId = localAudio.audio.id
        if (!remoteAudioIds.has(audioId) && !localDeletions.removedAudios.has(audioId)) {
          console.log(`[Sync] Adding local-only audio: ${localAudio.audio.title}`)
          mergedAudios.push(localAudio)
        }
      }

      mergedPlaylists.push({
        ...remotePlaylist,
        audios: mergedAudios,
        cover_path: localPlaylist.cover_path || remotePlaylist.cover_path,
      })
    } else {
      // New playlist from remote
      const filteredAudios = remotePlaylist.audios.filter(
        (a) => !localDeletions.removedAudios.has(a.audio.id)
      )
      mergedPlaylists.push({ ...remotePlaylist, audios: filteredAudios })
      console.log(`[Sync] Adding new playlist from remote: ${remotePlaylist.title}`)
    }
  }

  // Add local-only playlists (new playlists created locally)
  for (const localPlaylist of local.playlists) {
    const id = localPlaylist.id!
    if (!processedIds.has(id) && !localDeletions.removedPlaylists.has(id)) {
      const filteredAudios = localPlaylist.audios.filter(
        (a) => !localDeletions.removedAudios.has(a.audio.id)
      )
      mergedPlaylists.push({ ...localPlaylist, audios: filteredAudios })
      console.log(`[Sync] Adding new playlist from local: ${localPlaylist.title}`)
    }
  }

  // Ensure special playlists are first
  const specialPlaylists = mergedPlaylists.filter(
    (p) => p.id === FAVORITE_PLAYLIST_ID || p.id === AUDIO_PLAYLIST_ID
  )
  const regularPlaylists = mergedPlaylists.filter(
    (p) => p.id !== FAVORITE_PLAYLIST_ID && p.id !== AUDIO_PLAYLIST_ID
  )

  specialPlaylists.sort((a, b) =>
    a.id === FAVORITE_PLAYLIST_ID ? -1 : b.id === FAVORITE_PLAYLIST_ID ? 1 : 0
  )

  console.log(`[Sync] Merged ${mergedPlaylists.length} playlists`)
  return { playlists: [...specialPlaylists, ...regularPlaylists] }
}

/**
 * Downloads missing files for audios that need them
 */
async function downloadMissingFiles(
  config: Config,
  audioIdsToDownload: Set<string>
): Promise<void> {
  console.log(`[Sync] Checking ${audioIdsToDownload.size} audios for download...`)

  const downloadAll = audioIdsToDownload.size === 0
  let downloadCount = 0

  for (const playlist of config.playlists) {
    // Download playlist cover if missing
    if (playlist.cover && playlist.cover_path) {
      const exists = await path_exists(playlist.cover_path).catch(() => false)
      if (!exists) {
        console.log(`[Sync] Downloading playlist cover: ${playlist.title}`)
        download_cover(playlist.cover, playlist.platform).catch(console.error)
      }
    }

    for (const audio of playlist.audios) {
      const shouldDownload = downloadAll || audioIdsToDownload.has(audio.audio.id)
      if (!shouldDownload) continue

      // Download audio file if missing
      if (audio.path) {
        const exists = await path_exists(audio.path).catch(() => false)
        if (!exists) {
          console.log(`[Sync] Downloading audio: ${audio.audio.title}`)
          download_audio(audio.audio).catch(console.error)
          downloadCount++
        }
      }

      // Download cover if missing
      if (audio.audio.cover && audio.cover_path) {
        const exists = await path_exists(audio.cover_path).catch(() => false)
        if (!exists) {
          console.log(`[Sync] Downloading cover: ${audio.audio.title}`)
          download_cover(audio.audio.cover, audio.audio.platform).catch(
            console.error
          )
        }
      }
    }
  }

  console.log(`[Sync] Initiated ${downloadCount} audio downloads`)
}

/**
 * Sync with Github Gist - simplified approach
 */
export async function syncWithGist(
  localConfig: Config,
  gistConfig: GistConfig,
  previousLocalConfig?: Config,
): Promise<{
  updatedConfig: Config
  newGistConfig: GistConfig
  changed: boolean
}> {
  console.log("[Sync] ========== Starting sync ==========")
  const { githubToken, gistId } = gistConfig

  // Step 1: Download remote config
  console.log("[Sync] Downloading remote config...")
  const gist = await gist_download(githubToken, gistId)
  const remoteContent = gist.files[CONFIG_FILE_NAME]?.content

  let remoteConfig: Config | null = null
  if (remoteContent) {
    try {
      remoteConfig = JSON.parse(remoteContent)
      console.log(`[Sync] Remote config loaded: ${remoteConfig.playlists.length} playlists`)
    } catch (e) {
      console.error("[Sync] Failed to parse remote config", e)
    }
  }

  // Step 2: Handle first-time sync (no valid remote)
  if (!remoteConfig || !Array.isArray(remoteConfig.playlists)) {
    console.log("[Sync] No valid remote config. Uploading local.")
    await gist_update(githubToken, gistId, {
      [CONFIG_FILE_NAME]: JSON.stringify(localConfig, null, 2),
    })
    console.log("[Sync] Upload completed")
    console.log("[Sync] ========== Sync finished ==========")
    return {
      updatedConfig: localConfig,
      newGistConfig: { ...gistConfig, lastSyncTime: Date.now() },
      changed: false,
    }
  }

  // Step 3: Detect local changes (if we have previous config)
  let localDeletions: ConfigDiff = {
    addedPlaylists: new Set(),
    removedPlaylists: new Set(),
    addedAudios: new Set(),
    removedAudios: new Set(),
    modifiedPlaylists: new Set(),
  }

  if (previousLocalConfig) {
    console.log("[Sync] Detecting local changes...")
    const localChanges = diffConfigs(previousLocalConfig, localConfig)
    // We only care about deletions for conflict resolution
    localDeletions = {
      addedPlaylists: new Set(),
      removedPlaylists: localChanges.removedPlaylists,
      addedAudios: new Set(),
      removedAudios: localChanges.removedAudios,
      modifiedPlaylists: new Set(),
    }
  }

  // Step 4: Merge configs
  const mergedConfig = mergeConfigs(localConfig, remoteConfig, localDeletions)

  // Step 5: Detect what changed
  const localChanged = JSON.stringify(localConfig) !== JSON.stringify(mergedConfig)
  const remoteChanged = JSON.stringify(remoteConfig) !== JSON.stringify(mergedConfig)

  console.log(`[Sync] Changes detected - Local: ${localChanged}, Remote: ${remoteChanged}`)

  // Step 6: Update remote if needed
  if (remoteChanged) {
    console.log("[Sync] Uploading changes to Gist...")
    await gist_update(githubToken, gistId, {
      [CONFIG_FILE_NAME]: JSON.stringify(mergedConfig, null, 2),
    })
    console.log("[Sync] Upload completed")
  }

  // Step 7: Download new files from remote (only if remote has new content)
  if (localChanged) {
    console.log("[Sync] Detecting new items from remote...")

    // Compare remote with local to find what's new from remote
    const remoteDiff = diffConfigs(remoteConfig, localConfig)

    // Only download audios that were added from remote
    const audioIdsToDownload = remoteDiff.addedAudios

    // Download all if library was empty
    const isLibraryEmpty =
      localConfig.playlists.length <= 1 &&
      localConfig.playlists[0]?.audios.length === 0

    if (audioIdsToDownload.size > 0 || isLibraryEmpty) {
      console.log(`[Sync] Downloading ${isLibraryEmpty ? 'all' : audioIdsToDownload.size} new items from remote...`)
      await downloadMissingFiles(
        mergedConfig,
        isLibraryEmpty ? new Set() : audioIdsToDownload
      )
      console.log("[Sync] Download completed")
    } else {
      console.log("[Sync] No new items to download from remote")
    }
  }

  console.log("[Sync] ========== Sync finished ==========")

  return {
    updatedConfig: mergedConfig,
    newGistConfig: { ...gistConfig, lastSyncTime: Date.now() },
    changed: localChanged,
  }
}
