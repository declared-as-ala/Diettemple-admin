"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type DialogSize = "sm" | "md" | "lg" | "xl"

const DIALOG_SIZES: Record<DialogSize, string> = {
  sm: "sm:max-w-[28rem]",
  md: "sm:max-w-[44rem]",
  lg: "sm:max-w-[56rem]",
  xl: "sm:max-w-[64rem]",
}

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  size?: DialogSize
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed inset-0 z-[101] h-dvh w-screen",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:w-[calc(100vw-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2",
          DIALOG_SIZES[size],
          "max-h-dvh sm:max-h-[calc(100dvh-3rem)] flex flex-col",
          "rounded-none border-0 bg-card text-card-foreground shadow-2xl shadow-black/25 sm:rounded-2xl sm:border sm:border-border",
          "overflow-hidden outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2",
          "duration-200",
          className
        )}
        {...props}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-card text-card-foreground">
          {children}
        </div>

        {showCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 z-10 sm:right-4 sm:top-4",
              "flex h-10 w-10 items-center justify-center rounded-lg",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "[&_svg]:size-4"
            )}
          >
            <XIcon />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex shrink-0 flex-col gap-1 border-b border-border bg-card px-5 pb-4 pt-5 pr-16 sm:px-6 sm:pr-16", className)}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6", className)}
      {...props}
    />
  )
}

function DialogSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-section"
      className={cn("space-y-4 rounded-xl border border-border bg-muted/20 p-4", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex shrink-0 flex-col-reverse justify-end gap-2 border-t border-border bg-card/95 px-5 py-4 sm:flex-row sm:px-6", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogSection,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
