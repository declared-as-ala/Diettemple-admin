"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, Loader2 } from "lucide-react"
import type { NutritionLog } from "./types"
import { fmtDate } from "./utils"

interface DietTabProps {
  kcal: string
  protein: string
  carbs: string
  fat: string
  onKcalChange: (v: string) => void
  onProteinChange: (v: string) => void
  onCarbsChange: (v: string) => void
  onFatChange: (v: string) => void
  onSave: () => void
  savingTargets: boolean
  onOpenTemplateModal: () => void
  logs: NutritionLog[]
  logsLoading: boolean
}

export default function DietTab({
  kcal,
  protein,
  carbs,
  fat,
  onKcalChange,
  onProteinChange,
  onCarbsChange,
  onFatChange,
  onSave,
  savingTargets,
  onOpenTemplateModal,
  logs,
  logsLoading,
}: DietTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Objectifs journaliers
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={onOpenTemplateModal}
            >
              Appliquer un modele
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Calories (kcal)", value: kcal, set: onKcalChange, placeholder: "2200" },
              { label: "Proteines (g)", value: protein, set: onProteinChange, placeholder: "160" },
              { label: "Glucides (g)", value: carbs, set: onCarbsChange, placeholder: "250" },
              { label: "Lipides (g)", value: fat, set: onFatChange, placeholder: "70" },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
          <Button
            onClick={onSave}
            disabled={savingTargets}
            className="w-full sm:w-auto"
          >
            {savingTargets ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Sauvegarder les objectifs"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      {logsLoading ? (
        <div className="rounded-xl border border-border p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : logs.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Journaux recents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-right pb-2 font-medium">Kcal</th>
                    <th className="text-right pb-2 font-medium">P</th>
                    <th className="text-right pb-2 font-medium">G</th>
                    <th className="text-right pb-2 font-medium">L</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 14).map((log, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 text-muted-foreground text-xs">
                        {fmtDate(log.date)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {log.consumedCalories ?? "\u2014"}
                      </td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {log.consumedMacros?.proteinG ?? "\u2014"}g
                      </td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {log.consumedMacros?.carbsG ?? "\u2014"}g
                      </td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {log.consumedMacros?.fatG ?? "\u2014"}g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
