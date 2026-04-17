"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
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
  images: string[];
  videoSource: "youtube" | "upload" | "";
  videoUrl: string;
  posterUrl: string;
  ingredients: string[];
}

function emptyForm(): RecipeForm {
  return {
    title: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    imageUrl: "",
    images: [],
    videoSource: "",
    videoUrl: "",
    posterUrl: "",
    ingredients: [],
  };
}

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const isNew = id === "new";
  const [recipe, setRecipe] = useState<RecipeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    if (isNew) {
      setRecipe(emptyForm());
      setLoading(false);
      return;
    }
    setLoading(true);
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
            images: Array.isArray(r.images) ? r.images : [],
            videoSource: r.videoSource ?? "",
            videoUrl: r.videoUrl ?? "",
            posterUrl: r.posterUrl ?? "",
            ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          });
        else setRecipe(null);
      })
      .catch(() => {
        setRecipe(null);
        toast("Impossible de charger la recette", "error");
      })
      .finally(() => setLoading(false));
  }, [id, isNew, toast]);

  useEffect(() => {
    load();
  }, [load]);

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

  const addImage = () => {
    setRecipe((prev) => (prev ? { ...prev, images: [...prev.images, ""] } : prev));
  };

  const updateImage = (index: number, value: string) => {
    setRecipe((prev) => {
      if (!prev) return prev;
      const next = [...prev.images];
      next[index] = value;
      return { ...prev, images: next };
    });
  };

  const removeImage = (index: number) => {
    setRecipe((prev) =>
      prev ? { ...prev, images: prev.images.filter((_, i) => i !== index) } : prev
    );
  };

  const buildPayload = () => {
    if (!recipe) return null;
    const payload: Record<string, unknown> = {
      title: recipe.title.trim(),
      imageUrl: recipe.imageUrl.trim() || undefined,
      images: recipe.images.filter(Boolean),
      videoSource: recipe.videoSource || undefined,
      videoUrl: recipe.videoUrl.trim() || undefined,
      posterUrl: recipe.posterUrl.trim() || undefined,
      ingredients: recipe.ingredients.filter(Boolean).length ? recipe.ingredients.filter(Boolean) : undefined,
    };
    const c = parseInt(recipe.calories, 10);
    const p = parseInt(recipe.protein, 10);
    const g = parseInt(recipe.carbs, 10);
    const f = parseInt(recipe.fat, 10);
    if (Number.isNaN(c) || c < 0) return { error: "Indiquez des calories valides (≥ 0)." } as const;
    payload.calories = c;
    if (!Number.isNaN(p) && p >= 0) payload.protein = p;
    if (!Number.isNaN(g) && g >= 0) payload.carbs = g;
    if (!Number.isNaN(f) && f >= 0) payload.fat = f;
    return { payload } as const;
  };

  const save = async () => {
    if (!recipe) return;
    const title = recipe.title.trim();
    if (!title) {
      toast("Le titre est obligatoire", "error");
      return;
    }
    const built = buildPayload();
    if (!built) {
      toast("Données invalides", "error");
      return;
    }
    if ("error" in built) {
      toast(String(built.error || "Données invalides"), "error");
      return;
    }
    const { payload } = built;
    setSaving(true);
    try {
      if (isNew) {
        await api.createAdminRecipe({
          title,
          calories: payload.calories as number,
          protein: payload.protein as number | undefined,
          carbs: payload.carbs as number | undefined,
          fat: payload.fat as number | undefined,
          imageUrl: payload.imageUrl as string | undefined,
          images: payload.images as string[],
          videoSource: payload.videoSource as "upload" | "youtube" | undefined,
          videoUrl: payload.videoUrl as string | undefined,
          posterUrl: payload.posterUrl as string | undefined,
          ingredients: payload.ingredients as string[] | undefined,
        });
        toast("Recette créée", "success");
      } else {
        await api.updateAdminRecipe(id, {
          title,
          calories: payload.calories as number,
          protein: payload.protein as number | undefined,
          carbs: payload.carbs as number | undefined,
          fat: payload.fat as number | undefined,
          imageUrl: payload.imageUrl as string | undefined,
          images: payload.images as string[],
          videoSource: payload.videoSource as "upload" | "youtube" | undefined,
          videoUrl: payload.videoUrl as string | undefined,
          posterUrl: payload.posterUrl as string | undefined,
          ingredients: payload.ingredients as string[] | undefined,
        });
        toast("Recette enregistrée", "success");
      }
      router.push("/admin/recipes");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; errors?: unknown } } })?.response?.data?.message ??
        (isNew ? "Création impossible" : "Enregistrement impossible");
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!confirm("Supprimer cette recette ? Les favoris associés seront retirés.")) return;
    setDeleting(true);
    try {
      await api.deleteAdminRecipe(id);
      toast("Recette supprimée", "success");
      router.push("/admin/recipes");
    } catch {
      toast("Suppression impossible", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !recipe) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/recipes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? "Nouvelle recette" : "Modifier la recette"}</h1>
        </div>
        {!isNew && (
          <Button variant="destructive" onClick={remove} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "…" : "Supprimer"}
          </Button>
        )}
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
              <Label>Calories (kcal) *</Label>
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
          <p className="text-xs text-muted-foreground">
            Astuce : si vos recettes n’ont que les calories en base, lancez{" "}
            <code className="rounded bg-muted px-1">npm run seed:recipe-macros</code> côté backend pour estimer P / G / L.
          </p>
          <div className="space-y-2">
            <Label>Image principale (URL)</Label>
            <Input value={recipe.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images supplémentaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recipe.images.map((img, i) => (
            <div key={i} className="flex gap-2 items-center">
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt=""
                  className="h-10 w-10 rounded object-cover flex-shrink-0 border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <Input value={img} onChange={(e) => updateImage(i, e.target.value)} placeholder="https://…" className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeImage(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addImage}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une image
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vidéo (reels)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Source vidéo</Label>
            <Select
              value={recipe.videoSource || "none"}
              onValueChange={(v) => update({ videoSource: v === "none" ? "" : (v as "youtube" | "upload") })}
            >
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
            <Input
              value={recipe.videoUrl}
              onChange={(e) => update({ videoUrl: e.target.value })}
              placeholder="https://youtube.com/… ou https://…"
            />
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

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? fr.status.saving : isNew ? "Créer" : fr.buttons.save}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/recipes")}>
          {fr.buttons.cancel}
        </Button>
      </div>
    </div>
  );
}
