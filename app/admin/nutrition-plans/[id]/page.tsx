"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

type MealItem = { name: string; calories: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string };
type Meal = { title: string; targetCalories: number; items: MealItem[] };

export default function EditNutritionPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [plan, setPlan] = useState<{
    name: string;
    description?: string;
    goalType: string;
    dailyCalories: number;
    macros: { proteinG: number; carbsG: number; fatG: number };
    mealsTemplate: Meal[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getNutritionPlan(id)
      .then((data: { nutritionPlanTemplate?: any }) => {
        const p = data.nutritionPlanTemplate;
        if (p) setPlan({
          name: p.name,
          description: p.description,
          goalType: p.goalType,
          dailyCalories: p.dailyCalories,
          macros: p.macros || { proteinG: 0, carbsG: 0, fatG: 0 },
          mealsTemplate: p.mealsTemplate || [],
        });
      })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [id]);

  const addMeal = () => {
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            mealsTemplate: [...prev.mealsTemplate, { title: "New meal", targetCalories: 0, items: [] }],
          }
        : prev
    );
  };

  const updateMeal = (index: number, field: keyof Meal, value: any) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = [...prev.mealsTemplate];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, mealsTemplate: next };
    });
  };

  const removeMeal = (index: number) => {
    setPlan((prev) =>
      prev ? { ...prev, mealsTemplate: prev.mealsTemplate.filter((_, i) => i !== index) } : prev
    );
  };

  const addItem = (mealIndex: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = [...prev.mealsTemplate];
      next[mealIndex].items = [...next[mealIndex].items, { name: "", calories: 0 }];
      return { ...prev, mealsTemplate: next };
    });
  };

  const updateItem = (mealIndex: number, itemIndex: number, field: keyof MealItem, value: any) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = [...prev.mealsTemplate];
      const items = [...next[mealIndex].items];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      next[mealIndex].items = items;
      return { ...prev, mealsTemplate: next };
    });
  };

  const removeItem = (mealIndex: number, itemIndex: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = [...prev.mealsTemplate];
      next[mealIndex].items = next[mealIndex].items.filter((_, i) => i !== itemIndex);
      return { ...prev, mealsTemplate: next };
    });
  };

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await api.updateNutritionPlan(id, plan);
      router.push("/admin/nutrition-plans");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !plan) return <PageLoader />;

  const mealsSum = plan.mealsTemplate.reduce(
    (sum, m) => sum + m.items.reduce((s, i) => s + (i.calories || 0), 0),
    0
  );
  const mismatch = Math.abs(mealsSum - plan.dailyCalories) > 50;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/nutrition-plans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nutrition Plans
          </Button>
        </Link>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Plan details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={plan.name}
              onChange={(e) => setPlan((p) => (p ? { ...p, name: e.target.value } : p))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={plan.description || ""}
              onChange={(e) => setPlan((p) => (p ? { ...p, description: e.target.value } : p))}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Daily calories</Label>
              <Input
                type="number"
                value={plan.dailyCalories}
                onChange={(e) => setPlan((p) => (p ? { ...p, dailyCalories: parseInt(e.target.value, 10) || 0 } : p))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Goal</Label>
              <select
                value={plan.goalType}
                onChange={(e) => setPlan((p) => (p ? { ...p, goalType: e.target.value } : p))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
              >
                <option value="lose_weight">Lose weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain_muscle">Gain muscle</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Protein (g)</Label>
              <Input
                type="number"
                value={plan.macros.proteinG}
                onChange={(e) =>
                  setPlan((p) =>
                    p ? { ...p, macros: { ...p.macros, proteinG: parseInt(e.target.value, 10) || 0 } } : p
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                value={plan.macros.carbsG}
                onChange={(e) =>
                  setPlan((p) =>
                    p ? { ...p, macros: { ...p.macros, carbsG: parseInt(e.target.value, 10) || 0 } } : p
                  )
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fat (g)</Label>
              <Input
                type="number"
                value={plan.macros.fatG}
                onChange={(e) =>
                  setPlan((p) =>
                    p ? { ...p, macros: { ...p.macros, fatG: parseInt(e.target.value, 10) || 0 } } : p
                  )
                }
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meals</CardTitle>
          <Button variant="outline" size="sm" onClick={addMeal}>
            <Plus className="h-4 w-4 mr-1" />
            Add meal
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {mismatch && (
            <p className="text-sm text-amber-600">
              Meals total ({mealsSum} kcal) does not match daily target ({plan.dailyCalories} kcal).
            </p>
          )}
          {plan.mealsTemplate.map((meal, mi) => (
            <div key={mi} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex gap-2 items-center">
                <Input
                  value={meal.title}
                  onChange={(e) => updateMeal(mi, "title", e.target.value)}
                  placeholder="Breakfast / Lunch / Dinner / Snack"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={meal.targetCalories || ""}
                  onChange={(e) => updateMeal(mi, "targetCalories", parseInt(e.target.value, 10) || 0)}
                  placeholder="kcal"
                  className="w-24"
                />
                <Button variant="ghost" size="icon" onClick={() => removeMeal(mi)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="pl-2 space-y-2">
                {meal.items.map((item, ii) => (
                  <div key={ii} className="flex gap-2 items-center">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(mi, ii, "name", e.target.value)}
                      placeholder="e.g. Greek yogurt 200g"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={item.calories || ""}
                      onChange={(e) => updateItem(mi, ii, "calories", parseInt(e.target.value, 10) || 0)}
                      placeholder="kcal"
                      className="w-20"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(mi, ii)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addItem(mi)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add item
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
