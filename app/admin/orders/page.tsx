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
import { AdminConfirmDialog, AdminDrawer, AdminFormSection, AdminModalFooter } from "@/components/admin";
import { format } from "date-fns";
import { fr } from "@/lib/i18n/fr";
import { Search, ChevronLeft, ChevronRight, Package, User, MapPin, CreditCard, Truck, CalendarDays } from "lucide-react";

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
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const LIMIT = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; status?: string } = { page, limit: LIMIT };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await api.getOrders(params);
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

      <AdminDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}
        title={`Commande ${selectedOrder?.reference ?? ""}`}
        description={selectedOrder ? `Créée le ${format(new Date(selectedOrder.createdAt), "dd/MM/yyyy à HH:mm")}` : undefined}
        eyebrow={selectedOrder ? STATUS_LABELS[selectedOrder.status] : undefined}
        icon={<Package className="h-5 w-5" aria-hidden="true" />}
        size="lg"
        busy={statusSaving}
        dirty={!!selectedOrder && newStatus !== selectedOrder.status}
        footer={(requestClose) => (
          <AdminModalFooter
            status={selectedOrder && newStatus !== selectedOrder.status ? `Nouveau statut : ${STATUS_LABELS[newStatus]}` : "Aucun changement de statut"}
            statusTone={selectedOrder && newStatus !== selectedOrder.status ? "warning" : "valid"}
            submitLabel="Confirmer le statut"
            loadingLabel="Enregistrement…"
            loading={statusSaving}
            submitDisabled={!selectedOrder || newStatus === selectedOrder.status}
            onCancel={requestClose}
            onSubmit={() => setStatusConfirmOpen(true)}
          />
        )}
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Référence</p>
                <p className="mt-1 font-mono text-base font-semibold text-slate-950">{selectedOrder.reference}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[selectedOrder.status]}>{STATUS_LABELS[selectedOrder.status]}</Badge>
            </div>

            <AdminFormSection title="Client et contact" icon={<User className="h-5 w-5" aria-hidden="true" />}>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-slate-500">Nom</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedOrder.deliveryAddress?.fullName ?? "—"}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Téléphone</dt><dd className="mt-1 text-sm text-slate-900">{selectedOrder.deliveryAddress?.phone ?? "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-medium text-slate-500">Email</dt><dd className="mt-1 break-all text-sm text-slate-900">{selectedOrder.deliveryAddress?.email ?? "—"}</dd></div>
              </dl>
            </AdminFormSection>

            <AdminFormSection title="Livraison" icon={<MapPin className="h-5 w-5" aria-hidden="true" />}>
              <p className="text-sm leading-6 text-slate-700">{selectedOrder.deliveryAddress ? `${selectedOrder.deliveryAddress.street}, ${selectedOrder.deliveryAddress.delegation}, ${selectedOrder.deliveryAddress.city}` : "Aucune adresse renseignée."}</p>
            </AdminFormSection>

            <AdminFormSection title="Articles" description={`${selectedOrder.items.length} ligne${selectedOrder.items.length !== 1 ? "s" : ""} dans cette commande.`} icon={<Package className="h-5 w-5" aria-hidden="true" />}>
              <ul className="space-y-3">
                {selectedOrder.items.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {item.image ? <div role="img" aria-label={`Image de ${item.name}`} className="h-12 w-12 shrink-0 rounded-lg bg-slate-200 bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500"><Package className="h-5 w-5" aria-hidden="true" /></div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.quantity} × {item.price.toFixed(2)} TND</p></div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">{(item.price * item.quantity).toFixed(2)} TND</p>
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-0 mt-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <div className="flex justify-between text-slate-600"><span>Sous-total</span><span className="tabular-nums">{selectedOrder.subtotal.toFixed(2)} TND</span></div>
                {selectedOrder.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Remise</span><span className="tabular-nums">−{selectedOrder.discount.toFixed(2)} TND</span></div>}
                <div className="flex justify-between text-slate-600"><span>Livraison</span><span className="tabular-nums">{selectedOrder.deliveryFee.toFixed(2)} TND</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-950"><span>Total</span><span className="tabular-nums">{selectedOrder.totalPrice.toFixed(2)} TND</span></div>
              </div>
            </AdminFormSection>

            <AdminFormSection title="Paiement" icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}>
              <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-medium text-slate-500">Méthode</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedOrder.paymentMethod === "CASH_ON_DELIVERY" ? "Paiement à la livraison" : selectedOrder.paymentMethod === "CLICKTOPAY" ? "ClickToPay" : "—"}</dd></div><div><dt className="text-xs font-medium text-slate-500">Statut</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedOrder.paymentStatus}</dd></div></dl>
            </AdminFormSection>

            <AdminFormSection title="Statut de la commande" description="Chaque changement demande une confirmation et utilise l’action existante de l’API." icon={<Truck className="h-5 w-5" aria-hidden="true" />}>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
              </Select>
              <p className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-4 w-4" aria-hidden="true" /> La date et l’historique existants restent inchangés.</p>
            </AdminFormSection>
          </div>
        )}
      </AdminDrawer>

      <AdminConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={newStatus === "cancelled" ? "Annuler la commande ?" : "Changer le statut de la commande ?"}
        description={selectedOrder ? `La commande « ${selectedOrder.reference} » passera de « ${STATUS_LABELS[selectedOrder.status]} » à « ${STATUS_LABELS[newStatus]} ».` : undefined}
        confirmLabel={newStatus === "cancelled" ? "Annuler la commande" : "Confirmer le changement"}
        cancelLabel="Continuer la vérification"
        variant={newStatus === "cancelled" ? "destructive" : "default"}
        loading={statusSaving}
        onConfirm={handleUpdateStatus}
      />
    </div>
  );
}
