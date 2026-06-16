import {
  Config,
  GistConfig,
  sync_download,
  sync_update,
  sync_file_info,
  SYNC_FILE_NAME,
} from "./index"
import logger from "../utils/logger"

const log = logger.sync

// ============================================================
// Error Types
// ============================================================

/**
 * Thrown when GitHub API is unreachable during sync.
 */
export class SyncError extends Error {
  constructor(cause?: unknown) {
    super("GitHub API is unreachable")
    this.name = "SyncError"
    if (cause instanceof Error) this.cause = cause
  }
}

// ============================================================
// LWW JSON Sync
// ============================================================

/**
 * Last-Write-Wins JSON sync using GitHub as storage.
 *
 * Strategy:
 * 1. Download remote JSON file from GitHub.
 * 2. Compare timestamps (_updatedAt) at the top level.
 * 3. If local is newer, upload local. If remote is newer, use remote.
 * 4. If timestamps are equal, both sides are already in sync.
 *
 * File on GitHub is stored as readable JSON (not Yjs binary).
 */
export async function syncConfig(
  localConfig: Config,
  gistConfig: GistConfig,
  forcePush = false,
  forcePull = false,
): Promise<{
  updatedConfig: Config
  newGistConfig: GistConfig
  changed: boolean
}> {
  log.info("[Sync] ========== Starting LWW sync ==========")
  const { githubToken, repoUrl } = gistConfig

  // -------------------------------------------------------
  // Step 0: Probe remote — reachability + SHA check (1 API call)
  // -------------------------------------------------------
  let remoteInfo
  try {
    remoteInfo = await sync_file_info(githubToken, repoUrl, SYNC_FILE_NAME)
  } catch (e) {
    throw new SyncError(e)
  }

  // SHA-based skip: only skip if remote unchanged AND no local changes since last sync.
  // Compare _updatedAt with lastSyncTime — if local config was modified after the last
  // successful sync, we have pending changes that must be pushed even if remote SHA is the same.
  const hasLocalChanges =
    gistConfig.lastSyncTime != null && localConfig._updatedAt > gistConfig.lastSyncTime

  if (
    !forcePush &&
    !forcePull &&
    !hasLocalChanges &&
    remoteInfo &&
    gistConfig.lastRemoteSha &&
    remoteInfo.sha === gistConfig.lastRemoteSha
  ) {
    log.info("[Sync] Remote SHA unchanged and no local changes – skipping sync")
    return {
      updatedConfig: localConfig,
      newGistConfig: gistConfig,
      changed: false,
    }
  }

  if (hasLocalChanges) {
    log.info(
      `[Sync] Local has pending changes (updatedAt=${localConfig._updatedAt}, lastSync=${gistConfig.lastSyncTime})`,
    )
  }

  // -------------------------------------------------------
  // Force push: upload local without merging
  // -------------------------------------------------------
  if (forcePush) {
    log.info("[Sync] Force push – uploading local config")
    const encoded = new TextEncoder().encode(JSON.stringify(localConfig, null, 2))
    await sync_update(githubToken, repoUrl, encoded, SYNC_FILE_NAME, undefined)

    const newSha = await fetchRemoteSha(githubToken, repoUrl, SYNC_FILE_NAME)
    log.info("[Sync] ========== Force push done ==========")
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
  // Step 1: Download remote JSON
  // -------------------------------------------------------
  const remoteBytes = await sync_download(githubToken, repoUrl, SYNC_FILE_NAME)

  if (remoteBytes.length === 0) {
    // No remote file — upload local
    log.info("[Sync] No remote file – uploading local config")
    const encoded = new TextEncoder().encode(JSON.stringify(localConfig, null, 2))
    await sync_update(githubToken, repoUrl, encoded, SYNC_FILE_NAME, undefined)

    const newSha = await fetchRemoteSha(githubToken, repoUrl, SYNC_FILE_NAME)
    log.info("[Sync] ========== Upload done ==========")
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
  // Step 2: Parse remote JSON
  // -------------------------------------------------------
  let remoteConfig: Config
  try {
    const text = new TextDecoder().decode(remoteBytes)
    remoteConfig = JSON.parse(text)
  } catch (e) {
    log.error("[Sync] Failed to parse remote config – corrupt data", e)
    throw new Error(
      "Remote sync data is corrupted. Please delete the remote file and re-sync, or use Force Push.",
    )
  }

  // -------------------------------------------------------
  // Force pull: use remote without merging
  // -------------------------------------------------------
  if (forcePull || isConfigEmpty(localConfig)) {
    if (!forcePull) log.info("[Sync] Local data is empty – using remote")
    else log.info("[Sync] Force pull – using remote config")

    log.info("[Sync] ========== Pull done ==========")
    return {
      updatedConfig: remoteConfig,
      newGistConfig: {
        ...gistConfig,
        lastSyncTime: Date.now(),
        lastRemoteSha: remoteInfo?.sha,
      },
      changed: true,
    }
  }

  // -------------------------------------------------------
  // Step 3: LWW merge — compare timestamps
  // -------------------------------------------------------
  const localTime = localConfig._updatedAt || 0
  const remoteTime = remoteConfig._updatedAt || 0

  log.info(`[Sync] Local timestamp: ${localTime}, Remote: ${remoteTime}`)

  if (localTime >= remoteTime) {
    // Local is newer or equal — upload local
    log.info("[Sync] Local is newer – uploading")
    const encoded = new TextEncoder().encode(JSON.stringify(localConfig, null, 2))
    await sync_update(githubToken, repoUrl, encoded, SYNC_FILE_NAME, undefined)

    const newSha = await fetchRemoteSha(githubToken, repoUrl, SYNC_FILE_NAME)
    log.info("[Sync] ========== Upload done (local newer) ==========")
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

  // Remote is newer — use remote
  log.info("[Sync] Remote is newer – using remote config")
  log.info("[Sync] ========== Sync done (remote newer) ==========")
  return {
    updatedConfig: remoteConfig,
    newGistConfig: {
      ...gistConfig,
      lastSyncTime: Date.now(),
      lastRemoteSha: remoteInfo?.sha,
    },
    changed: true,
  }
}

// ============================================================
// Helpers
// ============================================================

function isConfigEmpty(config: Config): boolean {
  if (config.playlists.length === 0) return true
  if (config.playlists.length === 1 && config.playlists[0].audios.length === 0) return true
  return false
}

async function fetchRemoteSha(
  token: string,
  repo: string,
  path: string,
): Promise<string | undefined> {
  try {
    const info = await sync_file_info(token, repo, path)
    return info?.sha
  } catch {
    return undefined
  }
}
