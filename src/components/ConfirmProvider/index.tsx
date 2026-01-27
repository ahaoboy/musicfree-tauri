import React, { useState, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material"
import { ConfirmContext, ConfirmOptions } from "../../contexts/ConfirmContext"

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [loading, setLoading] = useState(false)

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
  }, [])

  const handleClose = () => {
    if (loading) return
    setOpen(false)
    // Don't clear options immediately to allow animation to finish
    setTimeout(() => setOptions(null), 200)
  }

  const handleOk = async () => {
    if (!options) return

    try {
      const result = options.onOk()
      if (result instanceof Promise) {
        setLoading(true)
        await result
      }
      handleClose()
    } catch (error) {
      console.error("Confirm action failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {options && (
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <DialogTitle id="confirm-dialog-title">{options.title}</DialogTitle>
          <DialogContent>
            <DialogContentText id="confirm-dialog-description">
              {options.content}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit" disabled={loading}>
              {options.cancelText || "Cancel"}
            </Button>
            <Button
              onClick={handleOk}
              color={options.okType === "danger" ? "error" : "primary"}
              variant="contained"
              autoFocus
              disabled={loading}
            >
              {options.okText || "OK"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  )
}
