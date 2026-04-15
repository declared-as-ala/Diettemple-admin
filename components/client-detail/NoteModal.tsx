"use client"

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

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
          <DialogTitle>Ajouter une note coach</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">Titre (optionnel)</Label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ex: Check-in hebdomadaire"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Votre note pour ce client…"
              rows={4}
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={!message.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Enregistrer la note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
