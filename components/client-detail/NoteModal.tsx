"use client"

import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, StickyNote } from "lucide-react"

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <StickyNote className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle>Ajouter une note coach</DialogTitle>
              <DialogDescription className="mt-1">
                Ajoutez une note ou observation pour ce client.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Titre <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ex: Check-in hebdomadaire"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Message <span className="text-destructive">*</span></Label>
            <Textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Votre note pour ce client…"
              rows={4}
              className="mt-1.5 resize-none"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={!message.trim() || saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Enregistrement…" : "Enregistrer la note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
