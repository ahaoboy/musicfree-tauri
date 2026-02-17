import { LRUCache } from "lru-cache"

const options = {
  max: 64,
  dispose: (value: string) => {
    if (typeof value === "string" && value.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(value)
        console.log(`[Cache] Revoked blob URL: ${value}`)
      } catch (e) {
        console.error(`[Cache] Failed to revoke blob URL: ${value}`, e)
      }
    }
  },
}

export const appCache = new LRUCache<string, string>(options)
