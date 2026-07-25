"use client"

import { AdminFormSection, AdminModal, AdminModalFooter } from "@/components/admin"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote } from "lucide-react"

interface NoteModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  date: string
  onDateChange: (v: string) => void
  title: string
  onTitleChange: (v: string) => void
  message: string
  onMessageChange: (v: string) => void
  saving: boolean
  onSave: () => void
}

export default function NoteModal({
  open,
  onOpenChange,
  date,
  onDateChange,
  title,
  onTitleChange,
  message,
  onMessageChange,
  saving,
  onSave,
}: NoteModalProps) {
  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter une note coach"
      description="Ajoutez une observation datée au dossier du client."
      icon={<StickyNote className="h-5 w-5" aria-hidden="true" />}
      size="sm"
      busy={saving}
      dirty={Boolean(title || message)}
      footer={(requestClose) => (
        <AdminModalFooter
          status={message.trim() ? "La note est prête à être enregistrée" : "Le message est obligatoire"}
          statusTone={message.trim() ? "valid" : "warning"}
          submitLabel="Enregistrer la note"
          loadingLabel="Enregistrement…"
          loading={saving}
          submitDisabled={!message.trim()}
          onCancel={requestClose}
          onSubmit={onSave}
        />
      )}
    >
      <AdminFormSection title="Contenu de la note">
        <div className="space-y-2">
          <Label htmlFor="note-date">Date</Label>
          <Input id="note-date" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className="h-11 bg-muted/30" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note-title">Titre <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
          <Input id="note-title" value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Ex. Check-in hebdomadaire" className="h-11 bg-muted/30" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note-message">Message *</Label>
          <Textarea id="note-message" value={message} onChange={(event) => onMessageChange(event.target.value)} placeholder="Votre note pour ce client…" rows={5} className="resize-y bg-muted/30" />
        </div>
      </AdminFormSection>
    </AdminModal>
  )
}
