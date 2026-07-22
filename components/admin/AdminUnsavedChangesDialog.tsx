"use client"

import { ConfirmModal } from "@/components/shared/ConfirmModal"

interface AdminUnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}

export function AdminUnsavedChangesDialog({ open, onOpenChange, onDiscard }: AdminUnsavedChangesDialogProps) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Abandonner les modifications ?"
      description="Les informations saisies ne seront pas enregistrées."
      cancelLabel="Continuer la modification"
      confirmLabel="Abandonner"
      variant="destructive"
      onConfirm={onDiscard}
    />
  )
}
