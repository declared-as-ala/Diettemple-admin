"use client"

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { NutritionPlan } from "./types"
import { GOAL_LABELS } from "./utils"

interface NutritionTemplateModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  plans: NutritionPlan[]
  plansLoading: boolean
  onApply: (plan: NutritionPlan) => void
}

export default function NutritionTemplateModal({
  open,
  onOpenChange,
  plans,
  plansLoading,
  onApply,
}: NutritionTemplateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Appliquer un modèle nutrition</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2 max-h-96 overflow-y-auto">
          {plansLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun modèle nutrition disponible.
            </p>
          ) : (
            plans.map((plan) => (
              <button
                key={plan._id}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                onClick={() => onApply(plan)}
              >
                <div>
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {GOAL_LABELS[plan.goalType] || plan.goalType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {plan.macros.proteinG}P · {plan.macros.carbsG}G · {plan.macros.fatG}L
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{plan.dailyCalories}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/j</p>
                </div>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
