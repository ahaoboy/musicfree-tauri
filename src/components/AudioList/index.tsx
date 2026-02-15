import { ReactElement, useRef, CSSProperties, useEffect, memo } from "react"
import { List, ListImperativeAPI } from "react-window"
import { Box, SxProps, Theme } from "@mui/material"
import { useTheme } from "../../hooks/useTheme"

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
   * Custom sx for the list container
   */
  sx?: SxProps<Theme>

  /**
   * Custom style for the list container
   */
  style?: CSSProperties
}

// Row component for react-window, moved outside to prevent re-creation on every render
const RowComponent = memo(
  ({ index, style, items, renderItem, getItemId, ariaAttributes }: any) => {
    const item = items?.[index]

    if (!item) return null

    const itemId = getItemId(item)

    return (
      <Box
        style={{
          ...style,
          padding: "4px 8px",
          boxSizing: "border-box",
        }}
        data-item-id={itemId}
        {...ariaAttributes}
      >
        {renderItem(item, index)}
      </Box>
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
  itemHeight,
  sx,
  style,
}: AudioListProps<T>) {
  const { theme } = useTheme()
  const listRef = useRef<ListImperativeAPI>(null)
  const finalItemHeight = itemHeight ?? theme.custom.audioItemHeight

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
                align: "center", // Center the highlighted item
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
    <Box
      sx={{
        height: "100%",
        width: "100%",
        flex: 1,
        minHeight: 0,
        ...sx,
      }}
      style={style}
    >
      <List
        listRef={listRef}
        rowComponent={RowComponent as any}
        rowCount={items.length}
        rowHeight={finalItemHeight as any}
        rowProps={rowProps as any}
        overscanCount={6}
        style={{
          height: "100%",
          width: "100%",
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      />
    </Box>
  )
}

// export default AudioList (Removed for consistency with named export)
