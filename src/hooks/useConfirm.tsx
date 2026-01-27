import { useConfirmContext, ConfirmOptions } from "../contexts/ConfirmContext"

/**
 * Custom hook for showing consistent confirmation dialogs across the app
 * All confirmation dialogs will have the same style
 */
export const useConfirm = () => {
  const { showConfirm } = useConfirmContext()

  return { showConfirm }
}

export type { ConfirmOptions }
