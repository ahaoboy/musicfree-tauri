import { useState, useCallback } from "react"
import { Audio } from "../../api"

/**
 * Hook for managing audio selection
 */
export const useSelectionManager = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /**
   * Toggle selection for a single audio
   */
  const toggleSelect = useCallback((audioId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(audioId)) {
        newSet.delete(audioId)
      } else {
        newSet.add(audioId)
      }
      return newSet
    })
  }, [])

  /**
   * Select all audios
   */
  const selectAll = useCallback((audios: Audio[]) => {
    setSelectedIds(new Set(audios.map((a) => a.id)))
  }, [])

  /**
   * Deselect all audios
   */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /**
   * Toggle select all
   */
  const toggleSelectAll = useCallback(
    (audios: Audio[], checked: boolean) => {
      if (checked) {
        selectAll(audios)
      } else {
        deselectAll()
      }
    },
    [selectAll, deselectAll],
  )

  /**
   * Remove audio from selection
   */
  const removeFromSelection = useCallback((audioId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(audioId)
      return newSet
    })
  }, [])

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /**
   * Check if all audios are selected
   */
  const isAllSelected = useCallback(
    (audios: Audio[]) => {
      return audios.length > 0 && audios.every((a) => selectedIds.has(a.id))
    },
    [selectedIds],
  )

  /**
   * Check if some (but not all) audios are selected
   */
  const isSomeSelected = useCallback(
    (audios: Audio[]) => {
      return selectedIds.size > 0 && !isAllSelected(audios)
    },
    [selectedIds, isAllSelected],
  )

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    toggleSelectAll,
    removeFromSelection,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  }
}
