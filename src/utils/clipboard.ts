import { writeText } from "@tauri-apps/plugin-clipboard-manager"

/**
 * Copy text to clipboard with Tauri fallback to navigator API.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  try {
    await writeText(text)
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
}
