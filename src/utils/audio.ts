/**
 * Constant for "long duration" threshold (30 minutes in seconds)
 */
export const LONG_DURATION_THRESHOLD = 1800

/**
 * Check if the duration of an audio is considered "long" (e.g. > 30 minutes)
 *
 * @param duration Duration in seconds
 * @returns boolean
 */
export const isLongDuration = (duration?: number): boolean => {
  return !!(duration && duration > LONG_DURATION_THRESHOLD)
}
