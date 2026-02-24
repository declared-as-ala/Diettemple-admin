"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NewNutritionPlanPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<"lose_weight" | "maintain" | "gain_muscle">("maintain");
  const [dailyCalories, setDailyCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const cal = parseInt(dailyCalories, 10);
    const p = parseInt(proteinG, 10) || 0;
    const c = parseInt(carbsG, 10) || 0;
    const f = parseInt(fatG, 10) || 0;
    if (!name || !cal) return;
    setSaving(true);
    try {
      const data = await api.createNutritionPlan({
        name,
        description: description || undefined,
        goalType,
        dailyCalories: cal,
        macros: { proteinG: p, carbsG: c, fatG: f },
        mealsTemplate: [],
      });
      router.push(`/admin/nutrition-plans/${(data as any).nutritionPlanTemplate._id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/admin/nutrition-plans">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Nutrition Plans
        </Button>
      </Link>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>New nutrition plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2000 kcal Maintain" className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="mt-1" />
          </div>
          <div>
            <Label>Goal</Label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as any)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
            >
              <option value="lose_weight">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain_muscle">Gain muscle</option>
            </select>
          </div>
          <div>
            <Label>Daily calories</Label>
            <Input type="number" value={dailyCalories} onChange={(e) => setDailyCalories(e.target.value)} placeholder="2000" className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Protein (g)</Label>
              <Input type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="150" className="mt-1" />
            </div>
            <div>
              <Label>Carbs (g)</Label>
              <Input type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="200" className="mt-1" />
            </div>
            <div>
              <Label>Fat (g)</Label>
              <Input type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} placeholder="65" className="mt-1" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving || !name || !dailyCalories}>
            {saving ? "Creating…" : "Create & edit meals"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
