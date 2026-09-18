"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/apiBaseUrl";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Plus, MoreHorizontal, Pencil, Trash2, Tag, Star, Package, X } from "lucide-react";

interface ProductRow {
  _id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  uhPrice?: number | null;
  isUhExclusive?: boolean;
  stock: number;
  isFeatured: boolean;
  discount?: number;
  images?: string[];
  mediaImages?: {
    key: string;
    url: string;
    isPrimary: boolean;
    order: number;
    alt?: string;
  }[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Single delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({ page, limit: 20, search: search || undefined });
      setProducts(data.products || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Multiple selection helpers
  const allCurrentPageIds = products.map((p) => p._id);
  const isAllSelected =
    allCurrentPageIds.length > 0 && allCurrentPageIds.every((id) => selectedIds.includes(id));
  const isSomeSelected =
    allCurrentPageIds.some((id) => selectedIds.includes(id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allCurrentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allCurrentPageIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single delete
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteId);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
      setDeleteId(null);
      fetchProducts();
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await api.bulkDeleteProducts(selectedIds);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchProducts();
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const uhProductCount = products.filter((p) => p.uhPrice != null && p.uhPrice > 0).length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Produits"
        subtitle={`${total} produit${total !== 1 ? "s" : ""} · ${uhProductCount} avec Prix UH`}
        actions={
          <Link href="/admin/products/new">
            <Button className="gap-2">
              <Plus size={16} /> Nouveau produit
            </Button>
          </Link>
        }
      />

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-foreground transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
              {selectedIds.length}
            </span>
            <span>
              {selectedIds.length} produit{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X size={12} /> Désélectionner
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-1.5 h-8 text-xs font-semibold shadow-sm"
            >
              <Trash2 size={13} />
              Supprimer la sélection ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setPage(1); }}>
            Effacer
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 px-4">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  aria-label="Sélectionner tous les produits"
                />
              </TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix normal</TableHead>
              <TableHead>Prix UH</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isSelected = selectedIds.includes(product._id);
                const hasUhPrice = product.uhPrice != null && product.uhPrice > 0;
                const savings = hasUhPrice ? Math.round(product.price - product.uhPrice!) : 0;

                // Resolve primary or first image
                const primaryMedia = product.mediaImages?.find((m) => m.isPrimary);
                const rawImage = primaryMedia?.url || product.mediaImages?.[0]?.url || product.images?.[0] || "";
                const imageUrl = resolveMediaUrl(rawImage);

                return (
                  <TableRow
                    key={product._id}
                    className={`transition-colors ${isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""}`}
                  >
                    <TableCell className="w-12 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product._id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        aria-label={`Sélectionner ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-lg border bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate max-w-[220px] md:max-w-[320px]" title={product.name}>
                            {product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{product.brand || "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.price} DT
                      {product.discount ? (
                        <span className="ml-1 text-xs text-orange-500 font-semibold">-{product.discount}%</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {hasUhPrice ? (
                        <div className="flex items-center gap-1.5">
                          <Tag size={13} className="text-yellow-500" />
                          <span className="font-semibold text-yellow-500">{product.uhPrice} DT</span>
                          <span className="text-xs text-muted-foreground">(-{savings} DT)</span>
                          {product.isUhExclusive && (
                            <Badge className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              Exclusif
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${product.stock === 0 ? "text-red-500" : product.stock <= 5 ? "text-orange-500" : "text-green-600 dark:text-green-400"}`}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {product.isFeatured && (
                          <Badge className="text-[10px] gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            <Star size={9} /> Mis en avant
                          </Badge>
                        )}
                        <Badge
                          variant={product.stock > 0 ? "default" : "destructive"}
                          className={`text-[10px] ${product.stock > 0 ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                          {product.stock > 0 ? "En stock" : "Rupture"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${product._id}`} className="flex items-center gap-2">
                              <Pencil size={14} /> Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive flex items-center gap-2"
                            onClick={() => setDeleteId(product._id)}
                          >
                            <Trash2 size={14} /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Single delete modal */}
      <ConfirmModal
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Supprimer ce produit ?"
        description="Cette action supprimera définitivement le produit du catalogue."
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={handleDelete}
      />

      {/* Bulk delete modal */}
      <ConfirmModal
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteOpen(false);
        }}
        title={`Supprimer les ${selectedIds.length} produits sélectionnés ?`}
        description={`Cette action supprimera définitivement ${selectedIds.length} produit${selectedIds.length > 1 ? "s" : ""} du catalogue. Cette opération est irréversible.`}
        confirmLabel={`Supprimer (${selectedIds.length})`}
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
