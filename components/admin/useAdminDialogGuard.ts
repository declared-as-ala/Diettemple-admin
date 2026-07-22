"use client"

import { useCallback, useState } from "react"

interface UseAdminDialogGuardOptions {
  busy?: boolean
  dirty?: boolean
  onOpenChange: (open: boolean) => void
}

export function useAdminDialogGuard({ busy = false, dirty = false, onOpenChange }: UseAdminDialogGuardOptions) {
  const [discardOpen, setDiscardOpen] = useState(false)

  const requestOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (busy) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }, [busy, dirty, onOpenChange])

  const discardChanges = useCallback(() => {
    setDiscardOpen(false)
    onOpenChange(false)
  }, [onOpenChange])

  return { discardOpen, setDiscardOpen, requestOpenChange, discardChanges }
}
