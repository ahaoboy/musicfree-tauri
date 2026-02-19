import React, { useState, useCallback } from "react"
import { Snackbar, Alert, AlertColor } from "@mui/material"
import { MessageContext, MessageType } from "../../contexts/MessageContext"

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [severity, setSeverity] = useState<AlertColor>("info")
  const [duration, setDuration] = useState(3000)

  const showMessage = useCallback(
    (
      content: string,
      type: MessageType = "info",
      autoHideDuration: number = 3000,
    ) => {
      setMessage(content)
      setSeverity(type as AlertColor)
      setDuration(autoHideDuration)
      setOpen(true)
    },
    [],
  )

  const success = useCallback(
    (content: string, d?: number) => showMessage(content, "success", d),
    [showMessage],
  )
  const error = useCallback(
    (content: string, d?: number) => showMessage(content, "error", d),
    [showMessage],
  )
  const info = useCallback(
    (content: string, d?: number) => showMessage(content, "info", d),
    [showMessage],
  )
  const warning = useCallback(
    (content: string, d?: number) => showMessage(content, "warning", d),
    [showMessage],
  )

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return
    }
    setOpen(false)
  }

  return (
    <MessageContext.Provider
      value={{ showMessage, success, error, info, warning }}
    >
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </MessageContext.Provider>
  )
}
