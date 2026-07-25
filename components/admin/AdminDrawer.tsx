"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { DialogOverlay } from "@/components/ui/dialog"
import { AdminUnsavedChangesDialog } from "@/components/admin/AdminUnsavedChangesDialog"
import { useAdminDialogGuard } from "@/components/admin/useAdminDialogGuard"
import { cn } from "@/lib/utils"

type AdminDrawerSize = "md" | "lg"

const sizes: Record<AdminDrawerSize, string> = {
  md: "sm:max-w-[36rem]",
  lg: "sm:max-w-[42rem]",
}

interface AdminDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  eyebrow?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode | ((requestClose: () => void) => React.ReactNode)
  size?: AdminDrawerSize
  busy?: boolean
  dirty?: boolean
  bodyClassName?: string
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

export function AdminDrawer({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  icon,
  children,
  footer,
  size = "md",
  busy = false,
  dirty = false,
  bodyClassName,
  initialFocusRef,
}: AdminDrawerProps) {
  const guard = useAdminDialogGuard({ busy, dirty, onOpenChange })

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={guard.requestOpenChange}>
        <DialogPrimitive.Portal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed inset-0 z-[101] flex h-dvh w-screen flex-col bg-card text-card-foreground shadow-2xl outline-none",
              "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-[36rem] sm:border-l sm:border-border",
              sizes[size],
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-200"
            )}
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
            <header className="flex shrink-0 items-start gap-3 border-b border-border bg-card px-5 pb-4 pt-5 pr-16 sm:px-6 sm:pr-16">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
                <DialogPrimitive.Title className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </header>

            <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-5 py-5 sm:px-6", bodyClassName)}>
              {children}
            </div>
            {typeof footer === "function" ? footer(() => guard.requestOpenChange(false)) : footer}

            {!busy && (
              <DialogPrimitive.Close
                aria-label="Fermer"
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:right-4 sm:top-4"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <AdminUnsavedChangesDialog
        open={guard.discardOpen}
        onOpenChange={guard.setDiscardOpen}
        onDiscard={guard.discardChanges}
      />
    </>
  )
}
