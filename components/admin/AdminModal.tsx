"use client"

import * as React from "react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from "@/components/ui/dialog"
import { AdminUnsavedChangesDialog } from "@/components/admin/AdminUnsavedChangesDialog"
import { useAdminDialogGuard } from "@/components/admin/useAdminDialogGuard"
import { cn } from "@/lib/utils"

interface AdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode | ((requestClose: () => void) => React.ReactNode)
  size?: DialogSize
  busy?: boolean
  dirty?: boolean
  bodyClassName?: string
  contentClassName?: string
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  busy = false,
  dirty = false,
  bodyClassName,
  contentClassName,
  initialFocusRef,
}: AdminModalProps) {
  const guard = useAdminDialogGuard({ busy, dirty, onOpenChange })

  return (
    <>
      <Dialog open={open} onOpenChange={guard.requestOpenChange}>
        <DialogContent
          size={size}
          showCloseButton={!busy}
          className={contentClassName}
          onOpenAutoFocus={(event) => {
            if (!initialFocusRef?.current) return
            event.preventDefault()
            initialFocusRef.current.focus()
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (busy || dirty) event.preventDefault()
          }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div className={cn("min-w-0", icon && "pt-0.5")}>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </div>
            </div>
          </DialogHeader>
          <DialogBody className={cn("bg-muted/20", bodyClassName)}>{children}</DialogBody>
          {typeof footer === "function" ? footer(() => guard.requestOpenChange(false)) : footer}
        </DialogContent>
      </Dialog>

      <AdminUnsavedChangesDialog
        open={guard.discardOpen}
        onOpenChange={guard.setDiscardOpen}
        onDiscard={guard.discardChanges}
      />
    </>
  )
}
