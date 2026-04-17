"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ChefHat, Edit, Video, Utensils, Search, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fr } from "@/lib/i18n/fr";

interface Recipe {
  _id: string;
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  tags?: string[];
  videoSource?: string;
  videoUrl?: string;
  posterUrl?: string;
  ingredients?: string[];
}

export default function AdminRecipesPage() {
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [videoFilter, setVideoFilter] = useState<"all" | "with_video" | "without_video">("all");

  useEffect(() => {
    setLoading(true);
    api
      .getAdminRecipes()
      .then((data: { recipes?: Recipe[] }) => setRecipes(data.recipes || []))
      .catch(() => {
        setRecipes([]);
        toast("Impossible de charger les recettes", "error");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount load only
  }, []);

  const removeRecipe = async (rid: string, title: string) => {
    if (!confirm(`Supprimer « ${title} » ? Les favoris utilisateurs seront retirés.`)) return;
    try {
      await api.deleteAdminRecipe(rid);
      setRecipes((prev) => prev.filter((r) => r._id !== rid));
      toast("Recette supprimée", "success");
    } catch {
      toast("Suppression impossible", "error");
    }
  };

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesQuery = !q
        || r.title.toLowerCase().includes(q)
        || (r.tags || []).some((tag) => tag.toLowerCase().includes(q));
      const hasVideo = !!r.videoUrl;
      const matchesVideo =
        videoFilter === "all"
          ? true
          : videoFilter === "with_video"
            ? hasVideo
            : !hasVideo;
      return matchesQuery && matchesVideo;
    });
  }, [recipes, query, videoFilter]);

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title={fr.sidebar.recipes}
        subtitle="CRUD recettes : macros (P / G / L), médias, ingrédients. Script macros : npm run seed:recipe-macros"
        actions={
          <Button asChild>
            <Link href="/admin/recipes/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle recette
            </Link>
          </Button>
        }
      />

      {!loading && (
        <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une recette..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1">
            {([
              { id: "all", label: "Toutes" },
              { id: "with_video", label: "Avec vidéo" },
              { id: "without_video", label: "Sans vidéo" },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setVideoFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  videoFilter === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 mt-2 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          icon={<ChefHat />}
          title="Aucune recette"
          description="Aucune recette ne correspond aux filtres actuels."
        />
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Recette</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">P / G / L</th>
                    <th className="text-left px-4 py-3 font-medium">Média</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.map((r) => (
                    <tr key={r._id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.calories ?? "—"} kcal</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {r.protein != null ? `${r.protein} P` : "—"}
                        <span className="mx-1">·</span>
                        {r.carbs != null ? `${r.carbs} G` : "—"}
                        <span className="mx-1">·</span>
                        {r.fat != null ? `${r.fat} L` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" />
                            {r.videoUrl ? "Oui" : "Non"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Utensils className="h-3.5 w-3.5" />
                            {r.ingredients?.length ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Link href={`/admin/recipes/${r._id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Edit className="h-4 w-4" />
                              Modifier
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => removeRecipe(r._id, r.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
