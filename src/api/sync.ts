import * as Y from "yjs"
import {
  Config,
  GistConfig,
  LocalPlaylist,
  LocalAudio,
  sync_download,
  sync_update,
  sync_file_info,
  download_audio,
  download_cover,
  path_exists,
  get_local_yjs,
  save_local_yjs,
} from "./index"
import logger from "../utils/logger"
import { hostname, platform } from "@tauri-apps/plugin-os"

const log = logger.sync

// ============================================================
// Yjs <-> Config Reconciliation
// ============================================================

/**
 * Reconcile a Yjs document with a Config object.
 * Strictly maintains order from config to Yjs while preserving object identity.
 */
function reconcileYDocWithConfig(ydoc: Y.Doc, config: Config): void {
  const yplaylists = ydoc.getArray<Y.Map<any>>("playlists")
  const playlists = config.playlists

  // 1. Reconcile Playlists Order and Identity
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i]
    let yplaylist: Y.Map<any> | null = null

    // Check if correct item is already at this index
    const currentAtPos = i < yplaylists.length ? yplaylists.get(i) : null
    if (currentAtPos && currentAtPos.get("id") === playlist.id) {
      yplaylist = currentAtPos
    } else {
      // Find and remove any existing instance of this playlist ID
      for (let j = 0; j < yplaylists.length; j++) {
        if (yplaylists.get(j).get("id") === playlist.id) {
          yplaylists.delete(j, 1)
          j--
        }
      }
      // Insert a NEW map at the correct position
      yplaylist = new Y.Map()
      yplaylist.set("id", playlist.id)
      yplaylists.insert(i, [yplaylist])
    }

    // 2. Update Playlist Metadata
    if (yplaylist.get("title") !== playlist.title)
      yplaylist.set("title", playlist.title)
    if (yplaylist.get("cover") !== playlist.cover)
      yplaylist.set("cover", playlist.cover)
    if (yplaylist.get("cover_path") !== playlist.cover_path)
      yplaylist.set("cover_path", playlist.cover_path)
    if (yplaylist.get("platform") !== playlist.platform)
      yplaylist.set("platform", playlist.platform)
    if (yplaylist.get("download_url") !== playlist.download_url)
      yplaylist.set("download_url", playlist.download_url)

    // 3. Reconcile Audios Order and Identity
    let yaudios = yplaylist.get("audios") as Y.Array<Y.Map<any>>
    if (!yaudios || !(yaudios instanceof Y.Array)) {
      yaudios = new Y.Array<Y.Map<any>>()
      yplaylist.set("audios", yaudios)
    }

    const audios = playlist.audios
    for (let k = 0; k < audios.length; k++) {
      const audio = audios[k]
      let yaudio: Y.Map<any> | null = null

      const curAudioAtPos = k < yaudios.length ? yaudios.get(k) : null
      if (curAudioAtPos && curAudioAtPos.get("audio")?.id === audio.audio.id) {
        yaudio = curAudioAtPos
      } else {
        // Find and remove any existing instance(s) of this audio ID
        for (let m = 0; m < yaudios.length; m++) {
          if (yaudios.get(m).get("audio")?.id === audio.audio.id) {
            yaudios.delete(m, 1)
            m--
          }
        }
        // Insert a FRESH map at the correct position
        yaudio = new Y.Map()
        yaudios.insert(k, [yaudio])
      }

      // Update audio fields
      yaudio.set("audio", audio.audio)
      yaudio.set("path", audio.path)
      yaudio.set("cover_path", audio.cover_path)
    }

    // Trim trailing audios
    if (yaudios.length > audios.length) {
      yaudios.delete(audios.length, yaudios.length - audios.length)
    }
  }

  // 4. Trim trailing playlists
  if (yplaylists.length > playlists.length) {
    yplaylists.delete(playlists.length, yplaylists.length - playlists.length)
  }
}

/**
 * Convert Yjs document to Config.
 * Strictly follows Yjs structure without manual merging to ensure
 * CRDT deletions are respected.
 */
function yDocToConfig(ydoc: Y.Doc): Config {
  const yplaylists = ydoc.getArray<Y.Map<any>>("playlists")
  const playlists: LocalPlaylist[] = []

  yplaylists.forEach((yplaylist) => {
    const playlistId = yplaylist.get("id")
    if (!playlistId) return

    const yaudios = yplaylist.get("audios") as Y.Array<Y.Map<any>>
    const audios: LocalAudio[] = []

    if (yaudios && typeof yaudios.forEach === "function") {
      yaudios.forEach((yaudio) => {
        const audioData = yaudio.get("audio")
        if (!audioData || !audioData.id) return

        audios.push({
          audio: audioData,
          path: yaudio.get("path"),
          cover_path: yaudio.get("cover_path"),
        })
      })
    }

    playlists.push({
      id: playlistId,
      title: yplaylist.get("title"),
      cover: yplaylist.get("cover"),
      cover_path: yplaylist.get("cover_path"),
      platform: yplaylist.get("platform"),
      download_url: yplaylist.get("download_url"),
      audios,
    })
  })

  return { playlists }
}

// ============================================================
// File Download Helpers
// ============================================================

/**
 * Download missing files for audios that need them
 */
async function downloadMissingFiles(
  config: Config,
  audioIdsToDownload: Set<string>,
): Promise<void> {
  log.info(`[Sync] Checking ${audioIdsToDownload.size} audios for download...`)

  const downloadAll = audioIdsToDownload.size === 0
  let downloadCount = 0

  for (const playlist of config.playlists) {
    // Download playlist cover if missing
    if (playlist.cover && playlist.cover_path) {
      const exists = await path_exists(playlist.cover_path).catch(() => false)
      if (!exists) {
        log.info(`Downloading playlist cover: ${playlist.title}`)
        download_cover(playlist.cover, playlist.platform).catch(console.error)
      }
    }

    for (const audio of playlist.audios) {
      const shouldDownload =
        downloadAll || audioIdsToDownload.has(audio.audio.id)
      if (!shouldDownload) continue

      // Download audio file if missing
      if (audio.path) {
        const exists = await path_exists(audio.path).catch(() => false)
        if (!exists) {
          log.info(`Downloading audio: ${audio.audio.title}`)
          download_audio(audio.audio).catch(console.error)
          downloadCount++
        }
      }

      // Download cover if missing
      if (audio.audio.cover && audio.cover_path) {
        const exists = await path_exists(audio.cover_path).catch(() => false)
        if (!exists) {
          log.info(`Downloading cover: ${audio.audio.title}`)
          download_cover(audio.audio.cover, audio.audio.platform).catch(
            console.error,
          )
        }
      }
    }
  }

  log.info(`Initiated ${downloadCount} audio downloads`)
}

/**
 * Detect new audio IDs from config comparison
 */
function detectNewAudios(oldConfig: Config, newConfig: Config): Set<string> {
  const oldAudioIds = new Set<string>()
  for (const playlist of oldConfig.playlists) {
    for (const audio of playlist.audios) {
      oldAudioIds.add(audio.audio.id)
    }
  }

  const newAudioIds = new Set<string>()
  for (const playlist of newConfig.playlists) {
    for (const audio of playlist.audios) {
      if (!oldAudioIds.has(audio.audio.id)) {
        newAudioIds.add(audio.audio.id)
      }
    }
  }

  return newAudioIds
}

// ============================================================
// Utility Helpers
// ============================================================

/**
 * Generate a commit message based on device name and timestamp
 */
async function getCommitMessage(): Promise<string> {
  try {
    const name = await hostname()
    const p = platform()
    const now = new Date().toLocaleString()
    return `Update from ${name} (${p}) at ${now}`
  } catch {
    return `Update at ${new Date().toLocaleString()}`
  }
}

/**
 * Merge local sync file with current in-memory Yjs state to ensure no loss
 */
async function mergeWithLocalPersistence(yDoc: Y.Doc): Promise<void> {
  try {
    const localSaved = await get_local_yjs()
    if (localSaved && localSaved.length > 0) {
      Y.applyUpdate(yDoc, localSaved)
    }
  } catch (e) {
    log.error("[Sync] Failed to load local Yjs persistence", e)
  }
}

/**
 * Compare two Yjs states for equality
 */
function areStatesEqual(state1: Uint8Array, state2: Uint8Array): boolean {
  if (state1.length !== state2.length) return false
  for (let i = 0; i < state1.length; i++) {
    if (state1[i] !== state2[i]) return false
  }
  return true
}

/**
 * Check if the local data is "empty" – i.e. a fresh device with no meaningful content.
 * An empty device has either zero playlists or only one empty special playlist.
 */
function isLocalDataEmpty(config: Config): boolean {
  if (config.playlists.length === 0) return true
  // A single playlist with zero audios is treated as empty (default state)
  if (
    config.playlists.length === 1 &&
    config.playlists[0].audios.length === 0
  ) {
    return true
  }
  return false
}

/**
 * Check if a Yjs document is empty (no playlists or no data).
 */
function isYDocEmpty(yDoc: Y.Doc): boolean {
  const yplaylists = yDoc.getArray<Y.Map<any>>("playlists")
  if (yplaylists.length === 0) return true
  // Check if all playlists have zero audios
  let totalAudios = 0
  yplaylists.forEach((yplaylist) => {
    const yaudios = yplaylist.get("audios") as Y.Array<any>
    if (yaudios && typeof yaudios.length === "number") {
      totalAudios += yaudios.length
    }
  })
  return totalAudios === 0
}

// ============================================================
// Local Persistence (Step 1 of "save locally first")
// ============================================================

/**
 * Persist the current config into the local Yjs file.
 * This should be called after every local mutation, BEFORE attempting
 * remote sync.  This ensures the device always has a consistent snapshot
 * regardless of network availability.
 */
export async function persistLocalYjsState(config: Config): Promise<void> {
  const yDoc = new Y.Doc()
  await mergeWithLocalPersistence(yDoc)
  reconcileYDocWithConfig(yDoc, config)
  const state = Y.encodeStateAsUpdate(yDoc)
  await save_local_yjs(state)
  yDoc.destroy()
}

// ============================================================
// Remote Sync
// ============================================================

/**
 * Sync with GitHub Repository using Yjs CRDT.
 *
 * Key design decisions:
 * 1. **Save locally first** – `persistLocalYjsState` should be called
 *    before this function.  This function focuses on remote reconciliation.
 * 2. **Empty-device protection** – If the local Yjs doc is empty but the
 *    remote has data, we treat the remote as authoritative and pull it in
 *    (equivalent to a force-pull).  This prevents a new/wiped device from
 *    erasing the shared dataset.
 * 3. **SHA-based skip** – When neither local nor remote data has changed
 *    since last sync, the entire operation is skipped to save bandwidth.
 */
export async function syncWithYjs(
  localConfig: Config,
  gistConfig: GistConfig,
  forcePush = false,
  forcePull = false,
): Promise<{
  updatedConfig: Config
  newGistConfig: GistConfig
  changed: boolean
}> {
  log.info("[Sync] ========== Starting Yjs sync ==========")
  const { githubToken, repoUrl } = gistConfig

  // -------------------------------------------------------
  // Step 0: Quick remote-change check (SHA comparison)
  // -------------------------------------------------------
  if (!forcePush && !forcePull) {
    try {
      const remoteInfo = await sync_file_info(githubToken, repoUrl)
      if (remoteInfo && gistConfig.lastRemoteSha) {
        const remoteUnchanged = remoteInfo.sha === gistConfig.lastRemoteSha
        const localUnchanged = !!gistConfig.lastSyncTime // will be refined below

        if (remoteUnchanged && localUnchanged) {
          // Check if local data actually changed by comparing local Yjs
          // with what we'd produce from the current config
          const checkDoc = new Y.Doc()
          await mergeWithLocalPersistence(checkDoc)
          const savedState = Y.encodeStateAsUpdate(checkDoc)

          const freshDoc = new Y.Doc()
          await mergeWithLocalPersistence(freshDoc)
          reconcileYDocWithConfig(freshDoc, localConfig)
          const freshState = Y.encodeStateAsUpdate(freshDoc)

          const localIdentical = areStatesEqual(savedState, freshState)
          checkDoc.destroy()
          freshDoc.destroy()

          if (localIdentical) {
            log.info(
              "[Sync] Remote SHA unchanged and no local changes – skipping sync",
            )
            return {
              updatedConfig: localConfig,
              newGistConfig: gistConfig,
              changed: false,
            }
          }
        }
      }
    } catch (e) {
      // Info check is optional – proceed with full sync on failure
      log.warn("[Sync] Remote info check failed, proceeding with full sync", e)
    }
  }

  // -------------------------------------------------------
  // Step 1: Load or Init local Yjs document
  // -------------------------------------------------------
  const localYDoc = new Y.Doc()

  // Always load from local persistence first to maintain history
  await mergeWithLocalPersistence(localYDoc)

  // Reconcile with the current config (JSON is the source of truth for
  // the local user). This records delete operations if items were removed.
  reconcileYDocWithConfig(localYDoc, localConfig)

  const localState = Y.encodeStateAsUpdate(localYDoc)
  const commitMessage = await getCommitMessage()

  // Persist reconciled state locally (idempotent – already saved via
  // persistLocalYjsState, but updating here after reconcile guarantees
  // the latest snapshot is on disk)
  await save_local_yjs(localState).catch((e) =>
    log.error("[Sync] Failed to save local Yjs persistence", e),
  )

  // Determine if local is effectively empty (new device / cleared data)
  const localEmpty = isLocalDataEmpty(localConfig) && isYDocEmpty(localYDoc)

  // -------------------------------------------------------
  // Force Push
  // -------------------------------------------------------
  if (forcePush) {
    log.info("[Sync] Force push mode – uploading local state...")
    await sync_update(
      githubToken,
      repoUrl,
      localState,
      undefined,
      commitMessage,
    )
    await uploadJsonReference(localConfig, githubToken, repoUrl, commitMessage)

    // Fetch SHA for future change detection
    const newSha = await fetchRemoteSha(githubToken, repoUrl)

    log.info("[Sync] Force push completed")
    log.info("[Sync] ========== Sync finished ==========")

    localYDoc.destroy()
    return {
      updatedConfig: localConfig,
      newGistConfig: {
        ...gistConfig,
        lastSyncTime: Date.now(),
        lastRemoteSha: newSha,
      },
      changed: false,
    }
  }

  // -------------------------------------------------------
  // Step 2: Download remote Yjs state
  // -------------------------------------------------------
  log.info("[Sync] Downloading remote state...")
  const remoteBytes = await sync_download(githubToken, repoUrl)

  let remoteYDoc: Y.Doc | null = null
  let remoteState: Uint8Array | null = null

  if (remoteBytes && remoteBytes.length > 0) {
    try {
      remoteState = remoteBytes
      remoteYDoc = new Y.Doc()
      Y.applyUpdate(remoteYDoc, remoteState)
      log.info(
        `[Sync] Remote state loaded successfully (${remoteState.length} bytes)`,
      )
    } catch (e) {
      log.error("[Sync] Failed to parse remote state", e)

      throw new Error(
        "Remote sync data is corrupted or in an incompatible format. " +
          "This may happen if:\n" +
          "1. The remote file was created with an older version\n" +
          "2. The file was manually edited\n" +
          "3. The file is corrupted\n\n" +
          "Please choose one of the following options:\n" +
          "- Delete the remote file and sync again to upload fresh data\n" +
          "- Contact support if the problem persists",
      )
    }
  }

  // -------------------------------------------------------
  // Step 3: No valid remote – upload local (if non-empty)
  // -------------------------------------------------------
  if (!remoteYDoc || !remoteState) {
    log.info("[Sync] No valid remote state. Uploading local.")

    await sync_update(
      githubToken,
      repoUrl,
      localState,
      undefined,
      commitMessage,
    )
    await uploadJsonReference(localConfig, githubToken, repoUrl, commitMessage)

    const newSha = await fetchRemoteSha(githubToken, repoUrl)

    log.info("[Sync] Upload completed")
    log.info("[Sync] ========== Sync finished ==========")

    localYDoc.destroy()
    return {
      updatedConfig: localConfig,
      newGistConfig: {
        ...gistConfig,
        lastSyncTime: Date.now(),
        lastRemoteSha: newSha,
      },
      changed: false,
    }
  }

  // -------------------------------------------------------
  // Step 3b: Empty-device protection
  //   If local data is empty but remote has content, treat this as a
  //   force-pull to prevent accidentally wiping shared data.
  // -------------------------------------------------------
  const shouldForcePull = forcePull || localEmpty
  if (localEmpty && !forcePull) {
    log.info(
      "[Sync] Local data is empty – treating as force pull to preserve remote data",
    )
  }

  if (shouldForcePull) {
    log.info("[Sync] Force pull mode – using remote state...")
    const remoteConfig = yDocToConfig(remoteYDoc)

    // Persist remote state locally so subsequent syncs see the full history
    await save_local_yjs(remoteState).catch((e) =>
      log.error("[Sync] Failed to save remote state locally", e),
    )

    // Download all files from remote
    log.info("[Sync] Downloading all items from remote...")
    await downloadMissingFiles(remoteConfig, new Set())

    const newSha = await fetchRemoteSha(githubToken, repoUrl)

    localYDoc.destroy()
    remoteYDoc.destroy()

    log.info("[Sync] Force pull completed")
    log.info("[Sync] ========== Sync finished ==========")

    return {
      updatedConfig: remoteConfig,
      newGistConfig: {
        ...gistConfig,
        lastSyncTime: Date.now(),
        lastRemoteSha: newSha,
      },
      changed: true,
    }
  }

  // -------------------------------------------------------
  // Step 4: Merge using Yjs CRDT
  // -------------------------------------------------------
  log.info("[Sync] Merging states using Yjs CRDT...")

  // Start with the remote document as the base
  const mergedYDoc = new Y.Doc()
  Y.applyUpdate(mergedYDoc, remoteState)

  // Calculate the diff between local and remote
  const remoteStateVector = Y.encodeStateVector(remoteYDoc!)
  const localDiff = Y.encodeStateAsUpdate(localYDoc, remoteStateVector)

  // Apply only the local changes on top of remote
  if (localDiff.length > 0) {
    Y.applyUpdate(mergedYDoc, localDiff)
  }

  const mergedState = Y.encodeStateAsUpdate(mergedYDoc)
  const mergedConfig = yDocToConfig(mergedYDoc)

  // Save merged state to local persistence
  await save_local_yjs(mergedState).catch((e) =>
    log.error("[Sync] Failed to save merged local Yjs persistence", e),
  )

  // -------------------------------------------------------
  // Step 5: Detect what changed
  // -------------------------------------------------------
  const localChanged = !areStatesEqual(localState, mergedState)
  const remoteChanged = !areStatesEqual(remoteState, mergedState)

  log.info(
    `[Sync] Changes detected – Local: ${localChanged}, Remote: ${remoteChanged}`,
  )

  // -------------------------------------------------------
  // Step 6: Upload merged state to remote if needed
  //   Always upload the MERGED state so all devices converge.
  // -------------------------------------------------------
  let newSha = gistConfig.lastRemoteSha
  if (remoteChanged || localChanged) {
    log.info(`[Sync] Uploading merged state (${mergedState.length} bytes)...`)

    await sync_update(
      githubToken,
      repoUrl,
      mergedState,
      undefined,
      commitMessage,
    )

    await uploadJsonReference(mergedConfig, githubToken, repoUrl, commitMessage)

    newSha = await fetchRemoteSha(githubToken, repoUrl)

    log.info("[Sync] Upload completed")
  }

  // -------------------------------------------------------
  // Step 7: Download new files if local config changed
  // -------------------------------------------------------
  if (localChanged) {
    log.info("[Sync] Detecting new items from remote...")
    const newAudioIds = detectNewAudios(localConfig, mergedConfig)

    if (newAudioIds.size > 0) {
      log.info(
        `[Sync] Downloading ${newAudioIds.size} new items from remote...`,
      )
      await downloadMissingFiles(mergedConfig, newAudioIds)
      log.info("[Sync] Download completed")
    } else {
      log.info("[Sync] No new items to download from remote")
    }
  }

  // -------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------
  localYDoc.destroy()
  remoteYDoc.destroy()
  mergedYDoc.destroy()

  log.info("[Sync] ========== Sync finished ==========")

  return {
    updatedConfig: mergedConfig,
    newGistConfig: {
      ...gistConfig,
      lastSyncTime: Date.now(),
      lastRemoteSha: newSha,
    },
    changed: localChanged,
  }
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Upload a human-readable JSON reference file along-side the Yjs binary.
 * This is purely for developer inspection and has no functional impact.
 */
async function uploadJsonReference(
  config: Config,
  token: string,
  repo: string,
  commitMessage: string,
): Promise<void> {
  try {
    const jsonContent = JSON.stringify(config, null, 2)
    const encodedJson = new TextEncoder().encode(jsonContent)
    await sync_update(token, repo, encodedJson, "musicfree.json", commitMessage)
    log.info("[Sync] JSON reference uploaded")
  } catch (e) {
    log.error("[Sync] Failed to upload JSON reference", e)
  }
}

/**
 * Fetch the current SHA of the remote Yjs file for change detection.
 * Returns undefined on failure so callers can proceed gracefully.
 */
async function fetchRemoteSha(
  token: string,
  repo: string,
): Promise<string | undefined> {
  try {
    const info = await sync_file_info(token, repo)
    return info?.sha
  } catch {
    return undefined
  }
}
