"use client";

import { useState } from "react";
import { api, StockMovement } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Boxes,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";

interface ProductStockManagerProps {
  sku: string;
  onSkuChange: (sku: string) => void;
  stock: string;
  onStockChange: (stock: string) => void;
  trackStock: boolean;
  onTrackStockChange: (track: boolean) => void;
  lowStockThreshold: string;
  onLowStockThresholdChange: (threshold: string) => void;
  productId?: string;
  disabled?: boolean;
}

export function ProductStockManager({
  sku,
  onSkuChange,
  stock,
  onStockChange,
  trackStock,
  onTrackStockChange,
  lowStockThreshold,
  onLowStockThresholdChange,
  productId,
  disabled = false,
}: ProductStockManagerProps) {
  const { toast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Quick Adjustment Modal State
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("Réapprovisionnement");
  const [adjusting, setAdjusting] = useState(false);

  const stockNum = parseInt(stock) || 0;
  const thresholdNum = parseInt(lowStockThreshold) || 5;

  // Compute live stock status
  const getStatusBadge = () => {
    if (!trackStock) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          Suivi désactivé
        </span>
      );
    }

    if (stockNum <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          🔴 Rupture de stock
        </span>
      );
    }

    if (stockNum <= thresholdNum) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          🟠 Stock faible — {stockNum} restant{stockNum > 1 ? "s" : ""}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        🟢 {stockNum} disponibles (En stock)
      </span>
    );
  };

  const loadHistory = async () => {
    if (!productId) return;
    setLoadingHistory(true);
    try {
      const data = await api.getProductStockHistory(productId);
      setMovements(data.movements || []);
    } catch (err: any) {
      toast(err.message || "Impossible de charger l'historique du stock.", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setHistoryOpen(true);
    loadHistory();
  };

  const handleAdjustStock = async () => {
    if (!productId) {
      toast("Veuillez sauvegarder le produit d'abord pour enregistrer un ajustement.", "error");
      return;
    }
    const newQty = parseInt(adjustQuantity);
    if (isNaN(newQty) || newQty < 0) {
      toast("Veuillez saisir une quantité valide (≥ 0).", "error");
      return;
    }

    setAdjusting(true);
    try {
      const res = await api.adjustProductStock(productId, newQty, adjustReason);
      onStockChange(String(res.product?.stock ?? newQty));
      toast("Stock ajusté avec succès.", "success");
      setAdjustOpen(false);
      loadHistory();
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de l'ajustement", "error");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              Stock & disponibilité
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Gérez les quantités, le SKU, le seuil d'alerte et suivez chaque mouvement d'inventaire.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {productId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenHistory}
                className="gap-1.5 text-xs h-8"
              >
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                Historique du stock
              </Button>
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* SKU / Référence */}
          <div className="space-y-1.5">
            <Label htmlFor="product-sku">SKU / Référence</Label>
            <Input
              id="product-sku"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value.toUpperCase())}
              placeholder="Ex: PROT-WHEY-01"
              disabled={disabled}
              className="font-mono text-xs uppercase"
            />
          </div>

          {/* Quantité en stock */}
          <div className="space-y-1.5">
            <Label htmlFor="product-stock">Quantité en stock *</Label>
            <Input
              id="product-stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => onStockChange(e.target.value)}
              placeholder="45"
              disabled={disabled}
            />
          </div>

          {/* Seuil stock faible */}
          <div className="space-y-1.5">
            <Label htmlFor="product-threshold">Seuil stock faible</Label>
            <Input
              id="product-threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => onLowStockThresholdChange(e.target.value)}
              placeholder="5"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Tracking checkbox */}
        <div className="pt-1 flex items-center justify-between border-t border-border/50">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trackStock}
              onChange={(e) => onTrackStockChange(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">
              Suivre le stock automatiquement pour ce produit
            </span>
          </label>

          {productId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdjustQuantity(stock);
                setAdjustOpen(true);
              }}
              className="text-xs text-primary hover:text-primary gap-1"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ajustement avec motif
            </Button>
          )}
        </div>
      </CardContent>

      {/* STOCK HISTORY MODAL */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historique des mouvements de stock
            </DialogTitle>
            <DialogDescription>
              Traçabilité complète des réapprovisionnements, commandes et ajustements manuels.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                Chargement de l'historique…
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Aucun mouvement de stock enregistré pour l'instant.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {movements.map((mov) => {
                  const isPositive = mov.quantityChange > 0;
                  const isNegative = mov.quantityChange < 0;

                  return (
                    <div key={mov._id} className="py-3 flex items-center justify-between text-sm">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {mov.reason || "Mouvement de stock"}
                          </span>
                          {mov.orderId?.reference && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {mov.orderId.reference}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {mov.createdAt
                              ? format(new Date(mov.createdAt), "dd MMM yyyy, HH:mm", { locale: dateFnsFr })
                              : "—"}
                          </span>
                          {mov.performedBy?.name && (
                            <span>• Effectué par {mov.performedBy.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-sm flex items-center justify-end gap-0.5 ${
                            isPositive
                              ? "text-emerald-500"
                              : isNegative
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : isNegative ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : null}
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {mov.previousQuantity} → {mov.newQuantity}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Ajuster le stock
            </DialogTitle>
            <DialogDescription>
              Modifiez la quantité en précisant le motif pour l'historique d'inventaire.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">Nouvelle quantité en stock</Label>
              <Input
                id="adj-qty"
                type="number"
                min="0"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="60"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Motif de l'ajustement</Label>
              <select
                id="adj-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Réapprovisionnement">Réapprovisionnement</option>
                <option value="Correction inventaire">Correction inventaire</option>
                <option value="Retour client">Retour client</option>
                <option value="Produit endommagé">Produit endommagé</option>
                <option value="Ajustement manuel">Ajustement manuel</option>
              </select>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)} disabled={adjusting}>
              Annuler
            </Button>
            <Button onClick={handleAdjustStock} disabled={adjusting} className="gap-2">
              {adjusting && <RefreshCw className="h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
