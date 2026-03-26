"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "@/lib/i18n/fr";
import { Search, ChevronLeft, ChevronRight, Package } from "lucide-react";

type OrderStatus = "pending" | "pending_payment" | "paid" | "failed" | "confirmed" | "shipped" | "delivered" | "cancelled";
type PaymentStatus = "PENDING" | "PAID" | "FAILED";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  _id: string;
  reference: string;
  userId?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "CASH_ON_DELIVERY" | "CLICKTOPAY" | null;
  deliveryAddress?: {
    fullName: string;
    street: string;
    city: string;
    delegation: string;
    phone: string;
    email: string;
  };
  promoCode?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  paid: "Payée",
  failed: "Échouée",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  pending_payment: "outline",
  paid: "default",
  failed: "destructive",
  confirmed: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

const ALL_STATUSES: OrderStatus[] = ["pending", "pending_payment", "paid", "failed", "confirmed", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("confirmed");
  const [statusSaving, setStatusSaving] = useState(false);
  const LIMIT = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await api.getOrders(params as any);
      setOrders(data.orders || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.pages ?? 1);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = search.trim()
    ? orders.filter((o) =>
        o.reference.toLowerCase().includes(search.toLowerCase()) ||
        o.deliveryAddress?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        o.deliveryAddress?.phone?.includes(search) ||
        o.deliveryAddress?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setStatusSaving(true);
    try {
      await api.updateOrderStatus(selectedOrder._id, newStatus);
      setSelectedOrder(null);
      loadOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{fr.sidebar.orders}</h1>
          <p className="text-muted-foreground text-sm">{total} commande{total !== 1 ? "s" : ""} au total</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Référence, nom, téléphone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Commandes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">{fr.empty.noOrders}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Référence</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Articles</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-left font-medium">Paiement</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{order.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.deliveryAddress?.fullName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{order.deliveryAddress?.phone ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{order.items.length} article{order.items.length !== 1 ? "s" : ""}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-36">
                          {order.items.map((i) => i.name).join(", ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{order.totalPrice.toFixed(2)} TND</td>
                      <td className="px-4 py-3">
                        <div className="text-xs">{order.paymentMethod === "CASH_ON_DELIVERY" ? "Paiement à la livraison" : order.paymentMethod ?? "—"}</div>
                        <Badge
                          variant={order.paymentStatus === "PAID" ? "default" : order.paymentStatus === "FAILED" ? "destructive" : "secondary"}
                          className="text-xs mt-0.5"
                        >
                          {order.paymentStatus === "PAID" ? "Payé" : order.paymentStatus === "FAILED" ? "Échoué" : "En attente"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(order.createdAt), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedOrder(order); setNewStatus(order.status); }}
                        >
                          Gérer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} sur {totalPages} · {total} au total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Commande {selectedOrder?.reference}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Client :</span> {selectedOrder.deliveryAddress?.fullName ?? "—"}</p>
                <p><span className="text-muted-foreground">Téléphone :</span> {selectedOrder.deliveryAddress?.phone ?? "—"}</p>
                <p><span className="text-muted-foreground">Email :</span> {selectedOrder.deliveryAddress?.email ?? "—"}</p>
                <p><span className="text-muted-foreground">Adresse :</span> {selectedOrder.deliveryAddress ? `${selectedOrder.deliveryAddress.street}, ${selectedOrder.deliveryAddress.delegation}, ${selectedOrder.deliveryAddress.city}` : "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Articles</p>
                <ul className="space-y-1 text-sm">
                  {selectedOrder.items.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{(item.price * item.quantity).toFixed(2)} TND</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t mt-2 pt-2 text-sm space-y-1">
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Remise</span><span>-{selectedOrder.discount.toFixed(2)} TND</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span><span>{selectedOrder.deliveryFee.toFixed(2)} TND</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span><span>{selectedOrder.totalPrice.toFixed(2)} TND</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Changer le statut</p>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Annuler</Button>
            <Button onClick={handleUpdateStatus} disabled={statusSaving || newStatus === selectedOrder?.status}>
              {statusSaving ? "Enregistrement…" : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
