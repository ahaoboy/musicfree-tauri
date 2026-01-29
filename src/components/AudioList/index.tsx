import { ReactElement, useRef, CSSProperties, useEffect, memo } from "react"
import { List, ListImperativeAPI } from "react-window"

interface AudioListProps<T = unknown> {
  /**
   * Data items to render
   */
  items: T[]

  /**
   * Render function for each item
   */
  renderItem: (item: T, index: number) => ReactElement

  /**
   * Get unique ID from item for highlighting
   */
  getItemId: (item: T) => string

  /**
   * Highlight ID from URL params or other source
   */
  highlightId?: string | null

  /**
   * Height of each item in pixels
   */
  itemHeight?: number

  /**
   * Additional class name
   */
  className?: string

  /**
   * Custom style for the list container
   */
  style?: CSSProperties
}

// Row component for react-window, moved outside to prevent re-creation on every render
const RowComponent = memo(
  ({
    index,
    style,
    items,
    renderItem,
    getItemId,
    highlightId,
    ariaAttributes,
  }: any) => {
    const item = items?.[index]

    if (!item) return null

    const itemId = getItemId(item)
    const isHighlighted = highlightId === itemId

    return (
      <div
        style={{
          ...style,
          padding: "4px 8px",
          boxSizing: "border-box",
        }}
        data-item-id={itemId}
        className={isHighlighted ? "highlighted-item" : ""}
        {...ariaAttributes}
      >
        {renderItem(item, index)}
      </div>
    )
  },
)

RowComponent.displayName = "RowComponent"

/**
 * Virtual audio list component with highlight and auto-scroll functionality
 * Optimized for performance: uses react-window and stable row components.
 */
export function AudioList<T>({
  items,
  renderItem,
  getItemId,
  highlightId,
  itemHeight = 80,
  className = "audio-list",
  style,
}: AudioListProps<T>) {
  const listRef = useRef<ListImperativeAPI>(null)

  // Scroll to highlighted item when highlight changes
  useEffect(() => {
    if (highlightId && listRef.current) {
      const index = items.findIndex((item) => getItemId(item) === highlightId)

      if (index !== -1) {
        // Use requestAnimationFrame to ensure the list component has processed rowCount changes
        // and its internal layout before attempting to scroll.
        const scrollFrame = requestAnimationFrame(() => {
          if (
            listRef.current &&
            typeof listRef.current.scrollToRow === "function"
          ) {
            try {
              // Correct API call according to component documentation:
              // scrollToRow(config: { index: number; align?: string; behavior?: string })
              listRef.current.scrollToRow({
                index,
                align: "start",
                behavior: "instant",
              })
            } catch (err) {
              console.warn(`AudioList: Failed to scroll to row ${index}.`, err)
            }
          }
        })
        return () => cancelAnimationFrame(scrollFrame)
      }
    }
  }, [highlightId, items, getItemId])

  // Row props for the list rows
  const rowProps = {
    items,
    renderItem,
    getItemId,
    highlightId,
  }

  return (
    <div
      className={className}
      style={{ height: "100%", width: "100%", ...style }}
    >
      <List
        listRef={listRef}
        rowComponent={RowComponent as any}
        rowCount={items.length}
        rowHeight={itemHeight}
        rowProps={rowProps as any}
        overscanCount={6}
        style={{
          height: "100%",
          width: "100%",
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      />
    </div>
  )
}

// export default AudioList (Removed for consistency with named export)
