import {
  Config,
  GistConfig,
  LocalPlaylist,
  LocalAudio,
  gist_download,
  gist_update,
  download_audio,
  download_cover,
  FAVORITE_PLAYLIST_ID,
  AUDIO_PLAYLIST_ID,
} from "./index"

const CONFIG_FILE_NAME = "musicfree.json"

/**
 * Merges two playlists together
 */
function mergePlaylists(
  local: LocalPlaylist,
  remote: LocalPlaylist,
): LocalPlaylist {
  const localAudioMap = new Map(local.audios.map((a) => [a.audio.id, a]))

  const mergedAudios: LocalAudio[] = []
  const processedIds = new Set<string>()

  // Use the order from remote, but prefer local data if it exists (as it might have local paths)
  for (const remoteAudio of remote.audios) {
    const audioId = remoteAudio.audio.id
    processedIds.add(audioId)

    const localAudio = localAudioMap.get(audioId)
    if (localAudio) {
      mergedAudios.push({
        ...remoteAudio,
        ...localAudio,
        audio: {
          ...remoteAudio.audio,
          ...localAudio.audio,
        },
      })
    } else {
      mergedAudios.push(remoteAudio)
    }
  }

  // Add local audios that are not in remote
  for (const localAudio of local.audios) {
    const audioId = localAudio.audio.id
    if (!processedIds.has(audioId)) {
      mergedAudios.push(localAudio)
    }
  }

  return {
    ...remote,
    ...local,
    audios: mergedAudios,
    cover_path: local.cover_path || remote.cover_path,
  }
}

/**
 * Merges two configurations together
 */
export function mergeConfig(local: Config, remote: Config): Config {
  const localPlaylistMap = new Map(local.playlists.map((p) => [p.id, p]))

  const mergedPlaylists: LocalPlaylist[] = []
  const processedIds = new Set<string>()

  // Process all playlists from remote
  for (const remotePlaylist of remote.playlists) {
    const playlistId = remotePlaylist.id
    if (!playlistId) continue
    processedIds.add(playlistId)

    const localPlaylist = localPlaylistMap.get(playlistId)
    if (localPlaylist) {
      mergedPlaylists.push(mergePlaylists(localPlaylist, remotePlaylist))
    } else {
      mergedPlaylists.push(remotePlaylist)
    }
  }

  // Add remaining local playlists
  for (const localPlaylist of local.playlists) {
    const playlistId = localPlaylist.id
    if (playlistId && !processedIds.has(playlistId)) {
      mergedPlaylists.push(localPlaylist)
    }
  }

  // Maintain special order: Favorite and Audio playlist first
  const specialPlaylists = mergedPlaylists.filter(
    (p) => p.id === FAVORITE_PLAYLIST_ID || p.id === AUDIO_PLAYLIST_ID,
  )
  const regularPlaylists = mergedPlaylists.filter(
    (p) => p.id !== FAVORITE_PLAYLIST_ID && p.id !== AUDIO_PLAYLIST_ID,
  )

  // Sort special playlists to match FAVORITE -> AUDIO order
  specialPlaylists.sort((a, b) => {
    if (a.id === FAVORITE_PLAYLIST_ID) return -1
    if (b.id === FAVORITE_PLAYLIST_ID) return 1
    return 0
  })

  return {
    playlists: [...specialPlaylists, ...regularPlaylists],
  }
}

/**
 * Sync with Github Gist
 */
export async function syncWithGist(
  localConfig: Config,
  gistConfig: GistConfig,
): Promise<{
  updatedConfig: Config
  newGistConfig: GistConfig
  changed: boolean
}> {
  const { githubToken, gistId } = gistConfig

  // 1. Download remote content
  const gist = await gist_download(githubToken, gistId)
  const remoteFile = gist.files[CONFIG_FILE_NAME]
  const remoteContent = remoteFile?.content

  let remoteConfig: Config | null = null
  if (remoteContent) {
    try {
      remoteConfig = JSON.parse(remoteContent)
    } catch (e) {
      console.error("Failed to parse remote config", e)
    }
  }

  if (!remoteConfig || !Array.isArray(remoteConfig.playlists)) {
    // If no remote content or invalid format, just push local
    await gist_update(githubToken, gistId, {
      [CONFIG_FILE_NAME]: JSON.stringify(localConfig, null, 2),
    })
    return {
      updatedConfig: localConfig,
      newGistConfig: { ...gistConfig, lastSyncTime: Date.now() },
      changed: false,
    }
  }

  // 2. Perform merge
  const mergedConfig = mergeConfig(localConfig, remoteConfig)

  // 3. Compare if something changed from remote or local
  const localStr = JSON.stringify(localConfig)
  const remoteStr = JSON.stringify(remoteConfig)
  const mergedStr = JSON.stringify(mergedConfig)

  const changedLocal = localStr !== mergedStr
  const changedRemote = remoteStr !== mergedStr

  // 4. Update remote if needed
  if (changedRemote) {
    await gist_update(githubToken, gistId, {
      [CONFIG_FILE_NAME]: JSON.stringify(mergedConfig, null, 2),
    })
  }

  // 5. Trigger downloads for new items
  // We don't wait for downloads to complete
  triggerDownloads(mergedConfig)

  return {
    updatedConfig: mergedConfig,
    newGistConfig: { ...gistConfig, lastSyncTime: Date.now() },
    changed: changedLocal,
  }
}

async function triggerDownloads(config: Config) {
  for (const playlist of config.playlists) {
    for (const localAudio of playlist.audios) {
      // If no local path, it's a remote item that needs downloading
      if (!localAudio.path) {
        download_audio(localAudio.audio).catch(console.error)
      } else if (localAudio.audio.cover && !localAudio.cover_path) {
        download_cover(localAudio.audio.cover, localAudio.audio.platform).catch(
          console.error,
        )
      }
    }
  }
}
