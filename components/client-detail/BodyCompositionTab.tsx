"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Activity, Scale } from "lucide-react"
import type { ProfileData } from "./types"

interface BodyCompositionTabProps {
  profile: ProfileData
  onRefetchProfile: () => void
}

export default function BodyCompositionTab({ profile, onRefetchProfile }: BodyCompositionTabProps) {
  const client = profile.client
  const { toast } = useToast()
  
  const [fat, setFat] = useState(client.bodyComposition?.bodyFatPercentage ? String(client.bodyComposition.bodyFatPercentage) : "")
  const [muscle, setMuscle] = useState(client.bodyComposition?.muscleMassPercentage ? String(client.bodyComposition.muscleMassPercentage) : "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const fatVal = parseFloat(fat)
    const muscleVal = parseFloat(muscle)

    if (isNaN(fatVal) || fatVal < 0 || fatVal > 100) {
      toast("Le pourcentage de masse grasse doit être compris entre 0 et 100", "error")
      return
    }
    if (isNaN(muscleVal) || muscleVal < 0 || muscleVal > 100) {
      toast("Le pourcentage de masse musculaire doit être compris entre 0 et 100", "error")
      return
    }

    setSaving(true)
    try {
      await api.updateClientProfile(client._id, {
        bodyComposition: {
          bodyFatPercentage: fatVal,
          muscleMassPercentage: muscleVal,
        }
      })
      toast("Composition corporelle mise à jour ✓", "success")
      onRefetchProfile()
    } catch (e: any) {
      toast(e.message || "Erreur de mise à jour", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Mettre à jour la composition corporelle
          </CardTitle>
          <CardDescription>
            Saisissez les pourcentages de masse grasse et de masse musculaire du client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="fatPercent">Pourcentage de masse grasse (%)</Label>
            <div className="relative">
              <Input
                id="fatPercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="Ex: 15.5"
                className="h-9 pr-8"
              />
              <span className="absolute right-3 top-2 text-muted-foreground text-sm font-medium">%</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="musclePercent">Pourcentage de masse musculaire (%)</Label>
            <div className="relative">
              <Input
                id="musclePercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                placeholder="Ex: 42.0"
                className="h-9 pr-8"
              />
              <span className="absolute right-3 top-2 text-muted-foreground text-sm font-medium">%</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Sauvegarde..." : "Enregistrer la composition"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            Aperçu de la composition corporelle
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de la répartition de la masse corporelle du client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>Masse grasse</span>
              <span className="text-muted-foreground">{client.bodyComposition?.bodyFatPercentage ?? "—"} %</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${client.bodyComposition?.bodyFatPercentage ?? 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>Masse musculaire</span>
              <span className="text-muted-foreground">{client.bodyComposition?.muscleMassPercentage ?? "—"} %</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${client.bodyComposition?.muscleMassPercentage ?? 0}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground space-y-1">
            <p>· Le reste de la masse comprend l'eau corporelle, la masse osseuse, et les organes.</p>
            <p>· Un suivi régulier de ces indicateurs permet d'adapter précisément les apports caloriques et le volume d'entraînement.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
