"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Tag, Plus, Trash2 } from "lucide-react";

const CATEGORIES = [
  "Protéines", "Créatine", "BCAA", "Pre-Workout", "Vitamines",
  "Barres", "Snacks", "Équipement", "Vêtements", "Accessoires", "Autre",
];

interface ProductForm {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  discount: string;
  uhPrice: string;
  isUhExclusive: boolean;
  stock: string;
  isFeatured: boolean;
  images: string[];
  tags: string[];
}

const EMPTY: ProductForm = {
  name: "",
  brand: "",
  category: "",
  description: "",
  price: "",
  discount: "",
  uhPrice: "",
  isUhExclusive: false,
  stock: "0",
  isFeatured: false,
  images: [""],
  tags: [],
};

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const update = (updates: Partial<ProductForm>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  const priceNum = parseFloat(form.price) || 0;
  const uhPriceNum = parseFloat(form.uhPrice);
  const uhPriceInvalid = form.uhPrice !== "" && !isNaN(uhPriceNum) && uhPriceNum >= priceNum;

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) return setError("Le nom est requis.");
    if (!priceNum) return setError("Le prix est requis.");
    if (uhPriceInvalid) return setError("Le prix UH doit être inférieur au prix normal.");

    setSaving(true);
    try {
      const images = form.images.filter((img) => img.trim());
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        description: form.description.trim(),
        price: priceNum,
        stock: parseInt(form.stock) || 0,
        isFeatured: form.isFeatured,
        images,
        tags: form.tags,
      };
      if (form.discount) payload.discount = parseFloat(form.discount);
      if (form.uhPrice !== "" && !isNaN(uhPriceNum) && uhPriceNum > 0) {
        payload.uhPrice = uhPriceNum;
        payload.isUhExclusive = form.isUhExclusive;
      }
      const data = await api.createProduct(payload);
      const id = data?.product?._id;
      if (id) router.push(`/admin/products/${id}`);
      else router.push("/admin/products");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) update({ tags: [...form.tags, t] });
    setTagInput("");
  };

  const removeTag = (t: string) => update({ tags: form.tags.filter((x) => x !== t) });

  const setImage = (i: number, val: string) => {
    const next = [...form.images];
    next[i] = val;
    update({ images: next });
  };

  const addImageField = () => update({ images: [...form.images, ""] });
  const removeImageField = (i: number) =>
    update({ images: form.images.filter((_, idx) => idx !== i) });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Nouveau produit"
        subtitle="Créer un produit dans la boutique"
        actions={
          <Link href="/admin/products">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={15} /> Retour
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Whey Protein Gold Standard"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marque</Label>
              <Input
                value={form.brand}
                onChange={(e) => update({ brand: e.target.value })}
                placeholder="Optimum Nutrition"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => update({ category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Description du produit…"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prix & stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Prix normal (DT) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                placeholder="49.90"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remise (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => update({ discount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => update({ stock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UH Pricing */}
      <Card className="border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag size={15} className="text-yellow-500" /> Prix UH Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prix UH (DT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.uhPrice}
                onChange={(e) => update({ uhPrice: e.target.value })}
                placeholder="Laisser vide pour désactiver"
                className={uhPriceInvalid ? "border-destructive" : ""}
              />
              {uhPriceInvalid && (
                <p className="text-xs text-destructive">Doit être inférieur au prix normal ({priceNum} DT)</p>
              )}
              {!uhPriceInvalid && form.uhPrice && parseFloat(form.uhPrice) > 0 && priceNum > 0 && (
                <p className="text-xs text-yellow-600">
                  Économie: {(priceNum - parseFloat(form.uhPrice)).toFixed(2)} DT
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Label>Options</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isUhExclusive}
                  onChange={(e) => update({ isUhExclusive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Exclusif UH (masqué pour non-abonnés)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => update({ isFeatured: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Mis en avant (featured)</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images (URLs)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.images.map((img, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={img}
                onChange={(e) => setImage(i, e.target.value)}
                placeholder={`URL image ${i + 1}…`}
              />
              {form.images.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeImageField(i)}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addImageField}>
            <Plus size={13} /> Ajouter une image
          </Button>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Ajouter un tag…"
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addTag}>Ajouter</Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href="/admin/products">
          <Button variant="outline">Annuler</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-32">
          {saving ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Création…" : "Créer le produit"}
        </Button>
      </div>
    </div>
  );
}
