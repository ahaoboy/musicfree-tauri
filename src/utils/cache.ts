import { LRUCache } from "lru-cache"

/**
 * Dispose callback for blob URL caches.
 * Revokes the blob URL to free browser memory.
 */
const createBlobDispose = (name: string) => (value: string) => {
  if (typeof value === "string" && value.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(value)
    } catch (e) {
      console.error(`[Cache:${name}] Failed to revoke blob URL: ${value}`, e)
    }
  }
}

/**
 * Cover image cache — larger capacity since covers are small and frequently reused.
 */
export const coverCache = new LRUCache<string, string>({
  max: 128,
  dispose: createBlobDispose("cover"),
})

/**
 * Media cache — smaller capacity since audio blobs are large.
 */
export const mediaCache = new LRUCache<string, string>({
  max: 32,
  dispose: createBlobDispose("media"),
})

/**
 * @deprecated Use coverCache or mediaCache for better cache separation.
 * Kept for backward compatibility in existing code that imports appCache.
 */
export const appCache = new LRUCache<string, string>({
  max: 64,
  dispose: createBlobDispose("app"),
})
