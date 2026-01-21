import { useRef, useCallback } from "react"

// Swipe direction types
export type SwipeDirection = "left" | "right" | "up" | "down" | null

interface SwipeConfig {
  threshold?: number // Minimum distance to trigger swipe
  allowedTime?: number // Maximum time allowed for swipe gesture
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

const DEFAULT_THRESHOLD = 50
const DEFAULT_ALLOWED_TIME = 500

// Custom hook for detecting swipe gestures on both touch and mouse
export function useSwipe(
  onSwipe: (direction: SwipeDirection) => void,
  config: SwipeConfig = {},
): SwipeHandlers {
  const { threshold = DEFAULT_THRESHOLD, allowedTime = DEFAULT_ALLOWED_TIME } =
    config

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
  })

  const handleStart = useCallback((x: number, y: number) => {
    stateRef.current = {
      startX: x,
      startY: y,
      startTime: Date.now(),
    }
  }, [])

  const handleEnd = useCallback(
    (x: number, y: number) => {
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
    [threshold, allowedTime, onSwipe],
  )

  // Touch event handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    },
    [handleStart],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0]
      handleEnd(touch.clientX, touch.clientY)
    },
    [handleEnd],
  )

  // Mouse event handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY)
    },
    [handleStart],
  )

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleEnd(e.clientX, e.clientY)
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
