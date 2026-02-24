"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, Plus } from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  description?: string;
  goalType: string;
  dailyCalories: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  mealsTemplate?: Array<{ title: string; targetCalories: number; items: unknown[] }>;
}

export default function NutritionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNutritionPlans()
      .then((data: { nutritionPlanTemplates?: Plan[] }) => setPlans(data.nutritionPlanTemplates || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title="Nutrition Plans"
        subtitle="Templates for client diet plans (calories, macros, meals)"
        actions={
          <Link href="/admin/nutrition-plans/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New plan
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 mt-2 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed />}
          title="No nutrition plans"
          description="Create a plan template with daily calories, macros, and meals."
          action={
            <Link href="/admin/nutrition-plans/new">
              <Button>New plan</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Link key={plan._id} href={`/admin/nutrition-plans/${plan._id}`}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{plan.description || "—"}</p>
                    </div>
                    <Badge variant="outline">{plan.goalType?.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                    <span>{plan.dailyCalories} kcal</span>
                    <span>P: {plan.macros?.proteinG}g C: {plan.macros?.carbsG}g F: {plan.macros?.fatG}g</span>
                  </div>
                  {plan.mealsTemplate?.length ? (
                    <p className="text-xs text-muted-foreground mt-2">{plan.mealsTemplate.length} meals</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
