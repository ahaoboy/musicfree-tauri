import { useRef, useCallback } from "react"

// Swipe direction types
export type SwipeDirection = "left" | "right" | "up" | "down" | null

interface SwipeConfig {
  threshold?: number // Minimum distance to trigger swipe
  allowedTime?: number // Maximum time allowed for swipe gesture
  excludeSelectors?: string[] // CSS selectors to exclude from swipe detection
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
}

interface SwipeState {
  startX: number
  startY: number
  startTime: number
}

const DEFAULT_THRESHOLD = 30
const DEFAULT_ALLOWED_TIME = 500

// Check if element or its parents match any of the exclude selectors
function shouldExcludeElement(
  element: EventTarget | null,
  excludeSelectors: string[],
): boolean {
  if (!element || !(element instanceof Element)) return false

  for (const selector of excludeSelectors) {
    if (element.closest(selector)) {
      return true
    }
  }
  return false
}

// Custom hook for detecting swipe gestures on both touch and mouse
export function useSwipe(
  onSwipe: (direction: SwipeDirection) => void,
  config: SwipeConfig = {},
): SwipeHandlers {
  const {
    threshold = DEFAULT_THRESHOLD,
    allowedTime = DEFAULT_ALLOWED_TIME,
    excludeSelectors = [],
  } = config

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
  })

  const handleStart = useCallback(
    (x: number, y: number, target: EventTarget | null) => {
      // Don't start swipe if target is in exclude list
      if (shouldExcludeElement(target, excludeSelectors)) {
        return false
      }

      stateRef.current = {
        startX: x,
        startY: y,
        startTime: Date.now(),
      }
      return true
    },
    [excludeSelectors],
  )

  const handleEnd = useCallback(
    (x: number, y: number, target: EventTarget | null) => {
      // Don't process swipe if target is in exclude list
      if (shouldExcludeElement(target, excludeSelectors)) {
        return
      }

      const { startX, startY, startTime } = stateRef.current
      const deltaX = x - startX
      const deltaY = y - startY
      const deltaTime = Date.now() - startTime

      // Check if swipe was within allowed time
      if (deltaTime > allowedTime) {
        return
      }

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Check if horizontal swipe meets threshold and is more horizontal than vertical
      if (absX > threshold && absX > absY) {
        const direction: SwipeDirection = deltaX > 0 ? "right" : "left"
        onSwipe(direction)
      }
      // Check if vertical swipe meets threshold
      else if (absY > threshold && absY > absX) {
        const direction: SwipeDirection = deltaY > 0 ? "down" : "up"
        onSwipe(direction)
      }
    },
    [threshold, allowedTime, onSwipe, excludeSelectors],
  )

  // Touch event handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY, e.target)
    },
    [handleStart],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0]
      handleEnd(touch.clientX, touch.clientY, e.target)
    },
    [handleEnd],
  )

  // Mouse event handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY, e.target)
    },
    [handleStart],
  )

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleEnd(e.clientX, e.clientY, e.target)
    },
    [handleEnd],
  )

  return {
    onTouchStart,
    onTouchEnd,
    onMouseDown,
    onMouseUp,
  }
}

export default useSwipe
