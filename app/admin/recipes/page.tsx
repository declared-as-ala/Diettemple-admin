"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Edit } from "lucide-react";
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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAdminRecipes()
      .then((data: { recipes?: Recipe[] }) => setRecipes(data.recipes || []))
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title={fr.sidebar.recipes}
        subtitle="Gérer les recettes (reels, vidéo YouTube, ingrédients)"
      />

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
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={<ChefHat />}
          title="Aucune recette"
          description="Les recettes apparaîtront ici après le seed ou la création via l’API."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <Card key={r._id} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {r.calories ?? "—"} kcal
                      {(r.protein != null || r.carbs != null || r.fat != null) &&
                        ` · P: ${r.protein ?? "—"} C: ${r.carbs ?? "—"} F: ${r.fat ?? "—"}`}
                    </p>
                    {r.videoUrl ? (
                      <span className="inline-block mt-1 text-xs text-primary">Vidéo</span>
                    ) : null}
                    {r.ingredients?.length ? (
                      <span className="inline-block mt-0.5 text-xs text-muted-foreground">
                        {r.ingredients.length} ingrédient(s)
                      </span>
                    ) : null}
                  </div>
                  <Link href={`/admin/recipes/${r._id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
