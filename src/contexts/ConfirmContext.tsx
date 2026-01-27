import { createContext, useContext } from "react"

export interface ConfirmOptions {
  title: string
  content: string
  onOk: () => void | Promise<void>
  okText?: string
  okType?: "primary" | "danger"
  cancelText?: string
}

export interface ConfirmContextType {
  showConfirm: (options: ConfirmOptions) => void
}

export const ConfirmContext = createContext<ConfirmContextType | undefined>(
  undefined,
)

export const useConfirmContext = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirmContext must be used within a ConfirmProvider")
  }
  return context
}
