import { createContext, useContext } from "react"

export type MessageType = "success" | "error" | "info" | "warning"

export interface MessageContextType {
  showMessage: (content: string, type?: MessageType, duration?: number) => void
  success: (content: string, duration?: number) => void
  error: (content: string, duration?: number) => void
  info: (content: string, duration?: number) => void
  warning: (content: string, duration?: number) => void
}

export const MessageContext = createContext<MessageContextType | undefined>(
  undefined,
)

export const useMessage = () => {
  const context = useContext(MessageContext)
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider")
  }
  return context
}
