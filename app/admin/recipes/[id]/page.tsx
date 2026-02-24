"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/loading";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fr } from "@/lib/i18n/fr";

interface RecipeForm {
  title: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  imageUrl: string;
  videoSource: "youtube" | "upload" | "";
  videoUrl: string;
  posterUrl: string;
  ingredients: string[];
}

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [recipe, setRecipe] = useState<RecipeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getAdminRecipe(id)
      .then((data: { recipe?: any }) => {
        const r = data.recipe;
        if (r)
          setRecipe({
            title: r.title ?? "",
            calories: r.calories != null ? String(r.calories) : "",
            protein: r.protein != null ? String(r.protein) : "",
            carbs: r.carbs != null ? String(r.carbs) : "",
            fat: r.fat != null ? String(r.fat) : "",
            imageUrl: r.imageUrl ?? "",
            videoSource: r.videoSource ?? "",
            videoUrl: r.videoUrl ?? "",
            posterUrl: r.posterUrl ?? "",
            ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          });
      })
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (updates: Partial<RecipeForm>) => {
    setRecipe((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const addIngredient = () => {
    setRecipe((prev) => (prev ? { ...prev, ingredients: [...prev.ingredients, ""] } : prev));
  };

  const updateIngredient = (index: number, value: string) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const next = [...prev.ingredients];
      next[index] = value;
      return { ...prev, ingredients: next };
    });
  };

  const removeIngredient = (index: number) => {
    setRecipe((prev) =>
      prev ? { ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) } : prev
    );
  };

  const save = async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      const payload: any = {
        title: recipe.title || undefined,
        imageUrl: recipe.imageUrl || undefined,
        videoSource: recipe.videoSource || undefined,
        videoUrl: recipe.videoUrl || undefined,
        posterUrl: recipe.posterUrl || undefined,
        ingredients: recipe.ingredients.filter(Boolean).length ? recipe.ingredients.filter(Boolean) : undefined,
      };
      const c = parseInt(recipe.calories, 10);
      const p = parseInt(recipe.protein, 10);
      const g = parseInt(recipe.carbs, 10);
      const f = parseInt(recipe.fat, 10);
      if (!Number.isNaN(c)) payload.calories = c;
      if (!Number.isNaN(p)) payload.protein = p;
      if (!Number.isNaN(g)) payload.carbs = g;
      if (!Number.isNaN(f)) payload.fat = f;
      await api.updateAdminRecipe(id, payload);
      router.push("/admin/recipes");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !recipe) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/recipes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Modifier la recette</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Infos & macros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={recipe.title} onChange={(e) => update({ title: e.target.value })} placeholder="Nom de la recette" />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Calories</Label>
              <Input type="number" min={0} value={recipe.calories} onChange={(e) => update({ calories: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Protéines (g)</Label>
              <Input type="number" min={0} value={recipe.protein} onChange={(e) => update({ protein: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Glucides (g)</Label>
              <Input type="number" min={0} value={recipe.carbs} onChange={(e) => update({ carbs: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Lipides (g)</Label>
              <Input type="number" min={0} value={recipe.fat} onChange={(e) => update({ fat: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image (URL)</Label>
            <Input value={recipe.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vidéo (reels)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Source vidéo</Label>
            <Select value={recipe.videoSource || "none"} onValueChange={(v) => update({ videoSource: v === "none" ? "" : (v as "youtube" | "upload") })}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="upload">Upload (fichier)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL vidéo (YouTube ou lien direct)</Label>
            <Input value={recipe.videoUrl} onChange={(e) => update({ videoUrl: e.target.value })} placeholder="https://youtube.com/… ou https://…" />
          </div>
          <div className="space-y-2">
            <Label>Poster / miniature (URL)</Label>
            <Input value={recipe.posterUrl} onChange={(e) => update({ posterUrl: e.target.value })} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingrédients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <Input value={ing} onChange={(e) => updateIngredient(i, e.target.value)} placeholder="ex. 100 g poulet" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeIngredient(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un ingrédient
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? fr.status.saving : fr.buttons.save}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/recipes")}>
          {fr.buttons.cancel}
        </Button>
      </div>
    </div>
  );
}
