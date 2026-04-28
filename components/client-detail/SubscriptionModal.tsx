"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, User, Users } from "lucide-react"
import type { LevelTemplate, SubscriptionData } from "./types"
import { quickEndDate } from "./utils"

interface SubscriptionModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  sub: SubscriptionData | null
  scenario: "renew" | "change" | "new"
  onScenarioChange: (s: "renew" | "change" | "new") => void
  templates: LevelTemplate[]
  templatesLoading: boolean
  selectedTemplate: string
  onSelectTemplate: (id: string, name: string, gender: "M" | "F") => void
  selectedGender: "M" | "F"
  onGenderChange: (g: "M" | "F") => void
  endDate: string
  onEndDateChange: (d: string) => void
  startDate: string
  onStartDateChange: (d: string) => void
  note: string
  onNoteChange: (n: string) => void
  saving: boolean
  onSave: () => void
}

const SCENARIO_META: Record<
  "renew" | "change" | "new",
  { label: string; title: string; description: string; helper: string; cta: string }
> = {
  renew: {
    label: "Renouveler",
    title: "Prolonger le meme plan",
    description: "Conserve le plan actuel et prolonge la date de fin.",
    helper: "Utilise cette option quand le client reste sur le meme programme.",
    cta: "Renouveler l'abonnement",
  },
  change: {
    label: "Changer de plan",
    title: "Changer le programme actif",
    description: "Remplace le plan actuel par un autre niveau.",
    helper: "Utilise cette option pour upgrade/downgrade le niveau du client.",
    cta: "Changer le plan",
  },
  new: {
    label: "Reaffecter",
    title: "Creer une nouvelle affectation",
    description: "Definit une nouvelle periode (debut + fin) avec le plan choisi.",
    helper: "Utilise cette option pour redemarrer proprement un nouvel abonnement.",
    cta: "Creer une nouvelle affectation",
  },
}

export default function SubscriptionModal({
  open,
  onOpenChange,
  sub,
  scenario,
  onScenarioChange,
  templates,
  templatesLoading,
  selectedTemplate,
  onSelectTemplate,
  selectedGender,
  onGenderChange,
  endDate,
  onEndDateChange,
  startDate,
  onStartDateChange,
  note,
  onNoteChange,
  saving,
  onSave,
}: SubscriptionModalProps) {
  const filteredTemplates = templates.filter(
    (t) => (t.gender || "M") === selectedGender
  )
  const activeScenario = SCENARIO_META[scenario]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {sub ? "Gérer l'abonnement client" : "Configurer l'abonnement"}
          </DialogTitle>
          <DialogDescription>
            {sub
              ? "Choisis une action claire : prolonger, changer de plan, ou recréer une affectation."
              : "Assigne un premier abonnement avec dates et plan."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Scenario tabs */}
          {sub && (
            <div className="grid grid-cols-1 gap-2 border-b border-border/60 pb-4 sm:grid-cols-3">
              {(
                [
                  { key: "renew", label: SCENARIO_META.renew.label },
                  { key: "change", label: SCENARIO_META.change.label },
                  { key: "new", label: SCENARIO_META.new.label },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onScenarioChange(key)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors",
                    scenario === key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-80 mt-0.5">{SCENARIO_META[key].title}</p>
                </button>
              ))}
            </div>
          )}

        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{activeScenario.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeScenario.description}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{activeScenario.helper}</p>
          </div>

          {/* Duration quick picks */}
          <div>
            <Label className="text-[11px] text-muted-foreground mb-2 block">
              Duree / Dates
            </Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[30, 60, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onEndDateChange(quickEndDate(d))}
                >
                  +{d}j
                </Button>
              ))}
            </div>
            {scenario === "new" ? (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    Date debut
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">
                    Date fin
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Date de fin
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            )}
          </div>

          {/* Plan picker */}
          {(scenario === "change" || scenario === "new") && (
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Plan d&apos;entrainement
              </Label>
              {templatesLoading ? (
                <div className="py-6 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Genre du plan :
                    </span>
                    <div className="flex gap-1.5">
                      {(["M", "F"] as const).map((g) => {
                        const hasAny = templates.some(
                          (t) => (t.gender || "M") === g
                        )
                        return (
                          <button
                            key={g}
                            type="button"
                            disabled={!hasAny}
                            onClick={() => {
                              onGenderChange(g)
                              const first = templates.find(
                                (t) => (t.gender || "M") === g
                              )
                              if (first) {
                                onSelectTemplate(
                                  first._id,
                                  first.name || "",
                                  g
                                )
                              }
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                              selectedGender === g
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-muted",
                              !hasAny && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            {g === "M" ? (
                              <User className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                            {g === "M" ? "Homme" : "Femme"}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {filteredTemplates.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">
                        Aucun plan pour ce genre.
                      </p>
                    ) : (
                      filteredTemplates.map((t) => {
                        const isPick = selectedTemplate === t._id
                        const isCurrent = sub?.levelTemplateId?._id === t._id
                        return (
                          <button
                            key={t._id}
                            type="button"
                            onClick={() =>
                              onSelectTemplate(
                                t._id,
                                t.name || "",
                                (t.gender || "M") as "M" | "F"
                              )
                            }
                            className={cn(
                              "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2",
                              isPick
                                ? "bg-primary/10 font-medium"
                                : "hover:bg-muted/80"
                            )}
                          >
                            <span className="truncate">{t.name || t._id}</span>
                            {isCurrent && (
                              <span className="text-[10px] shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold">
                                Actuel
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Note (optionnel)
            </Label>
            <Input
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ex: Renouvellement 3 mois"
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Enregistrement…" : activeScenario.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
