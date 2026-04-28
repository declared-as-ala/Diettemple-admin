"use client"

/**
 * App-standard modal components. Re-exports from dialog.tsx so all admin
 * modals share the same overlay, responsive layout, and animations.
 * Use AppDialog* for new modals to keep consistency.
 */
import {
  Dialog as AppDialogRoot,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogSection,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export const AppDialog = AppDialogRoot
export const AppDialogContent = DialogContent
export const AppDialogHeader = DialogHeader
export const AppDialogBody = DialogBody
export const AppDialogSection = DialogSection
export const AppDialogFooter = DialogFooter
export const AppDialogTitle = DialogTitle
export const AppDialogDescription = DialogDescription
export const AppDialogClose = DialogClose
export const AppDialogTrigger = DialogTrigger
export const AppDialogOverlay = DialogOverlay
export const AppDialogPortal = DialogPortal
