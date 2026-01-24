import { FC, ReactNode, useEffect, useRef } from "react"
import { Flex } from "antd"

interface AudioListProps {
  /**
   * Highlight ID from URL params or other source
   */
  highlightId?: string | null

  /**
   * Children to render (AudioCard items)
   */
  children: ReactNode

  /**
   * Additional class name
   */
  className?: string

  /**
   * Gap between items
   */
  gap?: "small" | "middle" | "large" | number
}

/**
 * Generic audio list component with highlight and auto-scroll functionality
 *
 * Usage:
 * ```tsx
 * <AudioList highlightId={highlightId}>
 *   {items.map(item => (
 *     <div key={item.id} data-item-id={item.id}>
 *       <AudioCard {...item} />
 *     </div>
 *   ))}
 * </AudioList>
 * ```
 *
 * Note: Each child must have a wrapper with `data-item-id` attribute
 */
export const AudioList: FC<AudioListProps> = ({
  highlightId,
  children,
  className = "audio-list",
  gap = "small",
}) => {
  // Ref to store item elements by ID
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Scroll to highlighted item when highlight changes
  useEffect(() => {
    if (highlightId) {
      const element = itemRefs.current.get(highlightId)
      if (element) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          element?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }, 100)
      }
    }
  }, [highlightId])

  // Register item refs from children
  useEffect(() => {
    const container = document.querySelector(`.${className}`)
    if (!container) return

    // Find all elements with data-item-id
    const items = container.querySelectorAll<HTMLElement>("[data-item-id]")
    itemRefs.current.clear()

    items.forEach((item) => {
      const id = item.getAttribute("data-item-id")
      if (id) {
        itemRefs.current.set(id, item)
      }
    })
  }, [children, className])

  return (
    <Flex vertical className={className} gap={gap}>
      {children}
    </Flex>
  )
}

export default AudioList
