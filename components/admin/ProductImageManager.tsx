"use client";

import { useState, useRef } from "react";
import { api, ProductMediaImage } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/apiBaseUrl";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  UploadCloud,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Type,
  Check,
  DownloadCloud,
  Loader2,
  ImageIcon,
  AlertCircle,
} from "lucide-react";

interface ProductImageManagerProps {
  images: ProductMediaImage[];
  onChange: (images: ProductMediaImage[]) => void;
  productId?: string;
  disabled?: boolean;
}

export function ProductImageManager({
  images,
  onChange,
  productId,
  disabled = false,
}: ProductImageManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [importingUrls, setImportingUrls] = useState<Record<string, boolean>>({});
  const [editingAltIndex, setEditingAltIndex] = useState<number | null>(null);
  const [altTextDraft, setAltTextDraft] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!acceptedTypes.includes(file.type)) {
        toast(`Format non supporté pour "${file.name}". Utilisez JPG, PNG ou WEBP.`, "error");
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast(`"${file.name}" dépasse la taille maximale autorisée (20 Mo).`, "error");
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgressText(`Optimisation et upload de ${validFiles.length} image(s) vers MinIO…`);

    const newImages: ProductMediaImage[] = [...images];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgressText(`Upload (${i + 1}/${validFiles.length}) : ${file.name}…`);
        const res = await api.uploadProductImage(file, productId);
        if (res.image) {
          const item: ProductMediaImage = {
            ...res.image,
            isPrimary: newImages.length === 0,
            order: newImages.length,
            alt: file.name.replace(/\.[^/.]+$/, ""),
          };
          newImages.push(item);
        }
      }

      // Ensure primary rule
      if (newImages.length > 0 && !newImages.some((img) => img.isPrimary)) {
        newImages[0].isPrimary = true;
      }

      onChange(newImages);
      toast(`${validFiles.length} image(s) téléversée(s) avec succès sur MinIO.`, "success");
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de l'upload.", "error");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const setPrimary = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange(updated);
    toast("Image principale mise à jour", "success");
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const next = [...images];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    // Recalculate order values
    const ordered = next.map((img, idx) => ({ ...img, order: idx }));
    onChange(ordered);
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((img) => img.isPrimary)) {
      next[0].isPrimary = true;
    }
    onChange(next);
  };

  const startEditAlt = (index: number) => {
    setEditingAltIndex(index);
    setAltTextDraft(images[index]?.alt || "");
  };

  const saveAlt = (index: number) => {
    const updated = [...images];
    if (updated[index]) {
      updated[index] = { ...updated[index], alt: altTextDraft.trim() };
      onChange(updated);
    }
    setEditingAltIndex(null);
    setAltTextDraft("");
  };

  const importExternalImage = async (img: ProductMediaImage, index: number) => {
    if (!img.url || !productId) {
      toast("Sauvegardez d'abord le produit avant d'importer des images externes vers MinIO.", "error");
      return;
    }

    setImportingUrls((prev) => ({ ...prev, [img.url || ""]: true }));

    try {
      const res = await api.importProductExternalImage(productId, img.url, img.alt);
      if (res.image) {
        const updated = [...images];
        updated[index] = {
          ...res.image,
          isPrimary: img.isPrimary,
          order: img.order,
          alt: img.alt,
        };
        onChange(updated);
        toast("Image externe importée et convertie en WebP dans MinIO avec succès !", "success");
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Échec de l'importation MinIO", "error");
    } finally {
      setImportingUrls((prev) => ({ ...prev, [img.url || ""]: false }));
    }
  };

  return (
    <Card className="border-border/80 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Images du produit
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Téléversez directement vos images dans l'infrastructure MinIO DietTemple. Optimisation WebP automatique.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {images.length} image{images.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
          } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={disabled || isUploading}
          />

          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <UploadCloud className="h-6 w-6" />
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-foreground">
                {isUploading ? (
                  uploadProgressText
                ) : (
                  <>
                    <span className="text-primary hover:underline">Cliquez pour importer</span> ou glissez vos photos ici
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés : JPG, JPEG, PNG, WEBP (Max 20 Mo par fichier)
              </p>
            </div>
          </div>
        </div>

        {/* Images Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, index) => {
              const fullUrl = resolveMediaUrl(img.url);
              const isExternal =
                img.url &&
                (img.url.startsWith("http://") || img.url.startsWith("https://")) &&
                !img.key;
              const isImporting = img.url ? Boolean(importingUrls[img.url]) : false;

              return (
                <div
                  key={img.key || img.url || index}
                  className={`group relative rounded-xl border bg-card/60 p-2 space-y-2 transition-all hover:shadow-md ${
                    img.isPrimary
                      ? "border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/[0.03]"
                      : "border-border/80"
                  }`}
                >
                  {/* Image Thumbnail */}
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted/40 border border-border/50 flex items-center justify-center">
                    {fullUrl ? (
                      <img
                        src={fullUrl}
                        alt={img.alt || "Produit DietTemple"}
                        loading="lazy"
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback on error
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/400x400/18181b/ffffff?text=Image+indisponible";
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    )}

                    {/* Primary Badge */}
                    {img.isPrimary && (
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold text-[10px] shadow-sm">
                        <Star className="h-3 w-3 fill-black" />
                        Principale
                      </div>
                    )}

                    {/* External URL indicator */}
                    {isExternal && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="outline" className="text-[9px] bg-background/90 backdrop-blur-sm border-blue-500/40 text-blue-500">
                          URL externe
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {/* Set Primary Button */}
                      {!img.isPrimary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPrimary(index)}
                          title="Définir comme image principale"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Reorder Left */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveImage(index, "left")}
                        disabled={index === 0}
                        title="Déplacer vers la gauche"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>

                      {/* Reorder Right */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveImage(index, "right")}
                        disabled={index === images.length - 1}
                        title="Déplacer vers la droite"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      {/* Edit ALT */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditAlt(index)}
                        title="Modifier le texte ALT (SEO)"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Type className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Delete */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeImage(index)}
                      title="Supprimer cette image"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* One-click Migration Button for External URLs */}
                  {isExternal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => importExternalImage(img, index)}
                      disabled={isImporting || !productId}
                      className="w-full text-xs h-7 gap-1.5 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Importation…
                        </>
                      ) : (
                        <>
                          <DownloadCloud className="h-3 w-3" />
                          Importer dans MinIO
                        </>
                      )}
                    </Button>
                  )}

                  {/* Inline ALT Text Editor */}
                  {editingAltIndex === index ? (
                    <div className="pt-1 flex gap-1 items-center">
                      <Input
                        value={altTextDraft}
                        onChange={(e) => setAltTextDraft(e.target.value)}
                        placeholder="Texte ALT pour l'image…"
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveAlt(index);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="default"
                        onClick={() => saveAlt(index)}
                        className="h-7 w-7 shrink-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    img.alt && (
                      <p className="text-[10px] text-muted-foreground truncate px-1" title={img.alt}>
                        ALT: {img.alt}
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground border rounded-xl border-border/50 bg-muted/10">
            Aucune image pour ce produit. Téléversez des photos pour la vitrine et l'application mobile.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
