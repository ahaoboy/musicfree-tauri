import { createContext, useContext } from "react"

// Navigation context for child pages to report their state
export interface NavigationContextType {
  isInDetailView: boolean
  setIsInDetailView: (value: boolean) => void
  onBackFromDetail: (() => void) | null
  setOnBackFromDetail: (callback: (() => void) | null) => void
}

export const NavigationContext = createContext<NavigationContextType | null>(
  null,
)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider")
  }
  return context
}
