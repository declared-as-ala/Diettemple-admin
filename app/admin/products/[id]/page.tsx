"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ProductMediaImage, ProductSEO } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/ui/loading";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ArrowLeft, Save, Tag, Trash2, Info, Sparkles } from "lucide-react";
import {
  ProductLiveSummary,
  ProductImageManager,
  ProductStockManager,
  ProductSEOManager,
} from "@/components/admin";

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
  sku: string;
  trackStock: boolean;
  lowStockThreshold: string;
  isFeatured: boolean;
  mediaImages: ProductMediaImage[];
  images: string[];
  seo: ProductSEO;
  tags: string[];
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState<ProductForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((data: any) => {
        const p = data?.product ?? data;
        if (!p) return;

        // Backward compatibility: synthesize mediaImages from legacy images array if missing
        let initialMediaImages: ProductMediaImage[] = [];
        if (Array.isArray(p.mediaImages) && p.mediaImages.length > 0) {
          initialMediaImages = p.mediaImages;
        } else if (Array.isArray(p.images) && p.images.length > 0) {
          initialMediaImages = p.images.map((url: string, idx: number) => ({
            key: url.startsWith("/media/") ? url.replace(/^\/media\//, "") : "",
            bucket: "media",
            url,
            isPrimary: idx === 0,
            order: idx,
            alt: p.name || "",
          }));
        }

        setForm({
          name: p.name ?? "",
          brand: p.brand ?? "",
          category: p.category ?? "",
          description: p.description ?? "",
          price: p.price != null ? String(p.price) : "",
          discount: p.discount != null ? String(p.discount) : "",
          uhPrice: p.uhPrice != null && p.uhPrice > 0 ? String(p.uhPrice) : "",
          isUhExclusive: !!p.isUhExclusive,
          stock: p.stock != null ? String(p.stock) : "0",
          sku: p.sku ?? "",
          trackStock: p.trackStock !== false,
          lowStockThreshold: p.lowStockThreshold != null ? String(p.lowStockThreshold) : "5",
          isFeatured: !!p.isFeatured,
          mediaImages: initialMediaImages,
          images: Array.isArray(p.images) ? p.images : [],
          seo: p.seo || {
            title: "",
            description: "",
            slug: "",
            keywords: [],
            canonical: "",
            index: true,
          },
          tags: Array.isArray(p.tags) ? p.tags : [],
        });
      })
      .catch(() => setError("Produit introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (updates: Partial<ProductForm>) =>
    setForm((prev) => (prev ? { ...prev, ...updates } : prev));

  const priceNum = parseFloat(form?.price ?? "") || 0;
  const uhPriceNum = parseFloat(form?.uhPrice ?? "");
  const uhPriceInvalid =
    !!form?.uhPrice && !isNaN(uhPriceNum) && uhPriceNum >= priceNum;

  const handleSave = async () => {
    if (!form) return;
    setError(null);
    if (!form.name.trim()) return setError("Le nom est requis.");
    if (!priceNum) return setError("Le prix est requis.");
    if (uhPriceInvalid) return setError("Le prix UH doit être inférieur au prix normal.");

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        description: form.description.trim(),
        price: priceNum,
        stock: parseInt(form.stock) || 0,
        sku: form.sku.trim().toUpperCase(),
        trackStock: form.trackStock,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        isFeatured: form.isFeatured,
        mediaImages: form.mediaImages,
        images: form.mediaImages.map((img) => img.url || "").filter(Boolean),
        seo: form.seo,
        tags: form.tags,
      };

      if (form.discount) payload.discount = parseFloat(form.discount);
      else payload.discount = 0;

      if (form.uhPrice !== "" && !isNaN(uhPriceNum) && uhPriceNum > 0) {
        payload.uhPrice = uhPriceNum;
        payload.isUhExclusive = form.isUhExclusive;
      } else {
        payload.uhPrice = null;
        payload.isUhExclusive = false;
      }

      await api.updateProduct(id, payload);
      router.push("/admin/products");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteProduct(id);
      router.push("/admin/products");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const addTag = () => {
    if (!form) return;
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) update({ tags: [...form.tags, t] });
    setTagInput("");
  };

  const removeTag = (t: string) =>
    form && update({ tags: form.tags.filter((x) => x !== t) });

  if (loading) return <PageLoader />;

  if (!form)
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{error ?? "Produit introuvable."}</p>
        <Link href="/admin/products">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft size={15} /> Retour
          </Button>
        </Link>
      </div>
    );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Modifier le produit"
        subtitle={form.name || "—"}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} /> Supprimer
            </Button>
            <Link href="/admin/products">
              <Button variant="outline" className="gap-2">
                <ArrowLeft size={15} /> Retour
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* 1. Informations générales */}
      <Card className="border-border/80 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Ex: BODYTECH Prime Mass"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => update({ brand: e.target.value })}
                placeholder="Ex: Optimum Nutrition, BodyTech..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => update({ category: v })}>
              <SelectTrigger id="category">
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Description détaillée du produit, posologie, bienfaits…"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Prix & Prix UH Premium */}
      <Card className="border-border/80 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Tarification & Prix UH Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Prix normal (DT) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                placeholder="49.90"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount">Remise (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => update({ discount: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="uhPrice">Prix UH Premium (DT)</Label>
              <Input
                id="uhPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.uhPrice}
                onChange={(e) => update({ uhPrice: e.target.value })}
                placeholder="Laisser vide si aucun"
                className={uhPriceInvalid ? "border-destructive" : ""}
              />
            </div>
          </div>

          {uhPriceInvalid && (
            <p className="text-xs text-destructive">
              Le prix UH doit être inférieur au prix normal ({priceNum} DT)
            </p>
          )}

          <div className="pt-2 flex flex-wrap gap-6 items-center border-t border-border/50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isUhExclusive}
                onChange={(e) => update({ isUhExclusive: e.target.checked })}
                disabled={!form.uhPrice || parseFloat(form.uhPrice) <= 0}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-sm">Exclusif UH (visible uniquement pour les abonnés actifs)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => update({ isFeatured: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-sm font-medium">Mettre en avant dans la boutique (Featured)</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <ProductLiveSummary
        price={form.price}
        uhPrice={form.uhPrice}
        discount={form.discount}
        stock={form.stock}
        featured={form.isFeatured}
      />

      {/* 3. Stock & Disponibilité (MinIO/Inventory) */}
      <ProductStockManager
        sku={form.sku}
        onSkuChange={(sku) => update({ sku })}
        stock={form.stock}
        onStockChange={(stock) => update({ stock })}
        trackStock={form.trackStock}
        onTrackStockChange={(trackStock) => update({ trackStock })}
        lowStockThreshold={form.lowStockThreshold}
        onLowStockThresholdChange={(lowStockThreshold) => update({ lowStockThreshold })}
        productId={id}
        disabled={saving}
      />

      {/* 4. Images du produit (MinIO Direct Upload & Legacy Migration) */}
      <ProductImageManager
        images={form.mediaImages}
        onChange={(mediaImages) => update({ mediaImages })}
        productId={id}
        disabled={saving}
      />

      {/* 5. SEO & Référencement */}
      <ProductSEOManager
        seo={form.seo}
        onChange={(seo) => update({ seo })}
        productName={form.name}
        brandName={form.brand}
        categoryName={form.category}
        productDescription={form.description}
        disabled={saving}
      />

      {/* 6. Tags */}
      <Card className="border-border/80 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Tags & Filtres boutique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Ex: prise de masse, sans gluten…"
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addTag}>
              Ajouter
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-medium"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-destructive font-bold ml-0.5"
                    aria-label={`Supprimer ${t}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href="/admin/products">
          <Button variant="outline" disabled={saving}>
            Annuler
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-36 font-semibold btn-glow">
          {saving ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Sauvegarde…" : "Sauvegarder les modifications"}
        </Button>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le produit ?"
        description={`Cette action retirera définitivement "${form.name}" de la boutique.`}
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
