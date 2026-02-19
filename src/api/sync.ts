import * as Y from "yjs"
import {
  Config,
  GistConfig,
  LocalPlaylist,
  LocalAudio,
  FileInfo,
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
// Error Types
// ============================================================

/**
 * Thrown when GitHub API is unreachable during sync.
 * configSlice uses this to distinguish "offline" from "error" status.
 */
export class SyncOfflineError extends Error {
  constructor(cause?: unknown) {
    super("GitHub API is unreachable")
    this.name = "SyncOfflineError"
    if (cause instanceof Error) this.cause = cause
  }
}

// ============================================================
// Constants
// ============================================================

/** Yjs state size threshold (bytes) for triggering compaction */
const COMPACTION_THRESHOLD = 512 * 1024 // 512 KB

// ============================================================
// Yjs <-> Config Reconciliation
// ============================================================

/**
 * Reconcile a Yjs document with a Config object.
 * Strictly maintains order from config to Yjs while preserving object identity.
 *
 * Optimization: only touches Yjs items that actually differ from the config,
 * minimizing CRDT operations and document growth.
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

    // 2. Update Playlist Metadata (only if changed)
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

      // Update audio fields (only if changed)
      const existingAudio = yaudio.get("audio")
      if (
        !existingAudio ||
        existingAudio.id !== audio.audio.id ||
        existingAudio.title !== audio.audio.title ||
        existingAudio.cover !== audio.audio.cover
      ) {
        yaudio.set("audio", audio.audio)
      }
      if (yaudio.get("path") !== audio.path) yaudio.set("path", audio.path)
      if (yaudio.get("cover_path") !== audio.cover_path)
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
 */
function isLocalDataEmpty(config: Config): boolean {
  if (config.playlists.length === 0) return true
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
  let totalAudios = 0
  yplaylists.forEach((yplaylist) => {
    const yaudios = yplaylist.get("audios") as Y.Array<any>
    if (yaudios && typeof yaudios.length === "number") {
      totalAudios += yaudios.length
    }
  })
  return totalAudios === 0
}

/**
 * Compact a Yjs state by rebuilding it from its visible data.
 * This strips accumulated CRDT tombstones and reduces binary size.
 *
 * Only applied when state exceeds COMPACTION_THRESHOLD to avoid
 * unnecessary work (compacted states temporarily lose diff info
 * but this is fine for low-frequency sync scenarios).
 */
function compactYjsState(state: Uint8Array): Uint8Array {
  if (state.length < COMPACTION_THRESHOLD) return state

  log.info(
    `[Sync] Compacting Yjs state: ${state.length} bytes → rebuilding from data...`,
  )

  // Rebuild: apply state to extract data, then re-create from JSON config
  const tempDoc = new Y.Doc()
  Y.applyUpdate(tempDoc, state)
  const config = yDocToConfig(tempDoc)
  tempDoc.destroy()

  const freshDoc = new Y.Doc()
  reconcileYDocWithConfig(freshDoc, config)
  const compacted = Y.encodeStateAsUpdate(freshDoc)
  freshDoc.destroy()

  log.info(
    `[Sync] Compaction complete: ${state.length} → ${compacted.length} bytes`,
  )
  return compacted
}

// ============================================================
// Local Persistence (Step 1 of "save locally first")
// ============================================================

/**
 * Persist the current config into the local Yjs file.
 * This should be called after every local mutation, BEFORE attempting
 * remote sync.
 */
export async function persistLocalYjsState(config: Config): Promise<void> {
  const yDoc = new Y.Doc()
  await mergeWithLocalPersistence(yDoc)
  reconcileYDocWithConfig(yDoc, config)
  let state = Y.encodeStateAsUpdate(yDoc)
  // Compact if needed to prevent unbounded growth
  state = compactYjsState(state)
  await save_local_yjs(state)
  yDoc.destroy()
}

// ============================================================
// Remote Sync
// ============================================================

/**
 * Sync with GitHub Repository using Yjs CRDT.
 *
 * This function performs reachability check, SHA-based skip, Yjs merge,
 * and upload in a single flow.  The `sync_file_info` call at the top
 * serves triple duty as: (1) API reachability probe, (2) SHA comparison
 * for skip optimization, (3) providing SHA for the upload.
 *
 * Throws `SyncOfflineError` when GitHub is unreachable — callers should
 * catch this to set the appropriate UI status.
 */
export async function syncWithYjs(
  localConfig: Config,
  gistConfig: GistConfig,
  forcePush = false,
  forcePull = false,
  hasPendingLocalChanges = false,
): Promise<{
  updatedConfig: Config
  newGistConfig: GistConfig
  changed: boolean
}> {
  log.info("[Sync] ========== Starting Yjs sync ==========")
  const { githubToken, repoUrl } = gistConfig

  // -------------------------------------------------------
  // Step 0: Probe remote — reachability + SHA check (1 API call)
  // -------------------------------------------------------
  let remoteInfo: FileInfo | null = null
  try {
    remoteInfo = await sync_file_info(githubToken, repoUrl)
  } catch (e) {
    // Network error → GitHub unreachable
    throw new SyncOfflineError(e)
  }

  // SHA-based skip: if remote SHA is unchanged AND we have no pending
  // local changes, skip the entire sync.
  //
  // NOTE: We use the `hasPendingLocalChanges` flag from the store instead
  // of comparing Yjs states because `persistLocalYjsState` is called
  // BEFORE this function — so the local Yjs file already contains the
  // latest config.  Comparing the persisted file against itself would
  // always show "no changes", which caused deletions to never sync.
  if (!forcePush && !forcePull && remoteInfo && gistConfig.lastRemoteSha) {
    if (remoteInfo.sha === gistConfig.lastRemoteSha) {
      if (!hasPendingLocalChanges) {
        log.info(
          "[Sync] Remote SHA unchanged and no local changes – skipping sync",
        )
        return {
          updatedConfig: localConfig,
          newGistConfig: gistConfig,
          changed: false,
        }
      }
      log.info("[Sync] Remote unchanged but local has pending changes")
    } else {
      log.info("[Sync] Remote SHA changed, full sync needed")
    }
  }

  // -------------------------------------------------------
  // Step 1: Load or Init local Yjs document
  // -------------------------------------------------------
  const localYDoc = new Y.Doc()

  await mergeWithLocalPersistence(localYDoc)
  reconcileYDocWithConfig(localYDoc, localConfig)

  let localState = Y.encodeStateAsUpdate(localYDoc)
  const commitMessage = await getCommitMessage()

  // Compact if oversized
  localState = compactYjsState(localState)

  // Persist reconciled + compacted state locally
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
      log.info(`[Sync] Remote state loaded (${remoteState.length} bytes)`)
    } catch (e) {
      log.error("[Sync] Failed to parse remote state", e)
      throw new Error(
        "Remote sync data is corrupted or in an incompatible format. " +
          "Please delete the remote file and re-sync, or use Force Push.",
      )
    }
  }

  // -------------------------------------------------------
  // Step 3: No valid remote – upload local
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
  // -------------------------------------------------------
  const shouldForcePull = forcePull || localEmpty
  if (localEmpty && !forcePull) {
    log.info(
      "[Sync] Local data is empty – force pulling to preserve remote data",
    )
  }

  if (shouldForcePull) {
    log.info("[Sync] Force pull mode – using remote state...")
    const remoteConfig = yDocToConfig(remoteYDoc)

    // Persist remote state locally
    await save_local_yjs(remoteState).catch((e) =>
      log.error("[Sync] Failed to save remote state locally", e),
    )

    log.info("[Sync] Downloading all items from remote...")
    await downloadMissingFiles(remoteConfig, new Set())

    const newSha =
      remoteInfo?.sha ?? (await fetchRemoteSha(githubToken, repoUrl))

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

  const mergedYDoc = new Y.Doc()
  Y.applyUpdate(mergedYDoc, remoteState)

  const remoteStateVector = Y.encodeStateVector(remoteYDoc!)
  const localDiff = Y.encodeStateAsUpdate(localYDoc, remoteStateVector)

  if (localDiff.length > 0) {
    Y.applyUpdate(mergedYDoc, localDiff)
  }

  let mergedState = Y.encodeStateAsUpdate(mergedYDoc)
  const mergedConfig = yDocToConfig(mergedYDoc)

  // Compact merged state if oversized
  mergedState = compactYjsState(mergedState)

  // Save merged state to local persistence
  await save_local_yjs(mergedState).catch((e) =>
    log.error("[Sync] Failed to save merged local Yjs persistence", e),
  )

  // -------------------------------------------------------
  // Step 5: Detect what changed
  // -------------------------------------------------------
  const localChanged = !areStatesEqual(localState, mergedState)
  const remoteChanged = !areStatesEqual(remoteState, mergedState)

  log.info(`[Sync] Changes – local: ${localChanged}, remote: ${remoteChanged}`)

  // -------------------------------------------------------
  // Step 6: Upload merged state if anything changed
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
      log.info("[Sync] No new items to download")
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
 * Upload a human-readable JSON reference file.
 * Purely for developer inspection – not used for sync logic.
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
