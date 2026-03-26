"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Tag, Star } from "lucide-react";

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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteId);
      setDeleteId(null);
      fetchProducts();
    } finally {
      setDeleting(false);
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
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const hasUhPrice = product.uhPrice != null && product.uhPrice > 0;
                const savings = hasUhPrice ? Math.round(product.price - product.uhPrice!) : 0;
                return (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.brand}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.price} DT
                      {product.discount ? (
                        <span className="ml-1 text-xs text-orange-500">-{product.discount}%</span>
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
                      <span className={product.stock === 0 ? "text-red-500" : "text-green-500"}>
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
                        <Badge variant={product.stock > 0 ? "default" : "destructive"} className="text-[10px]">
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

      <ConfirmModal
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Supprimer le produit ?"
        description="Cette action mettra le stock à 0 et retirera le produit de la boutique."
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
