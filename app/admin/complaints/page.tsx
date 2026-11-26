"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";
import { Inbox, Loader2, MessageSquareWarning, RefreshCw, Search } from "lucide-react";
import { api, type ComplaintStats, type ComplaintSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITY, COMPLAINT_STATUS, PRIORITY_ORDER, STATUS_ORDER } from "@/components/complaints/complaintMeta";

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold text-foreground", tone)}>{value}</p>
    </div>
  );
}

export default function ComplaintsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [stats, setStats] = useState<ComplaintStats | null>(null);
  const [rows, setRows] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const clientId = params.get("clientId") || "";
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (silent = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!silent) setLoading(true);
      setError(false);
      try {
        const [list, s] = await Promise.all([
          api.getComplaints(
            {
              q: q.trim() || undefined,
              status: status || undefined,
              category: category || undefined,
              priority: priority || undefined,
              clientId: clientId || undefined,
              from: from ? new Date(from).toISOString() : undefined,
              to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
              unread: unreadOnly ? "1" : undefined,
            },
            { signal: controller.signal }
          ),
          api.getComplaintStats(),
        ]);
        setRows(list);
        setStats(s);
      } catch (e) {
        if ((e as { code?: string }).code === "ERR_CANCELED") return;
        setError(true);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [q, status, category, priority, from, to, unreadOnly, clientId]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // New complaints and replies show up without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => void load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const hasFilters = !!(q || status || category || priority || from || to || unreadOnly || clientId);
  const reset = () => {
    setQ(""); setStatus(""); setCategory(""); setPriority(""); setFrom(""); setTo(""); setUnreadOnly(false);
    if (clientId) router.replace("/admin/complaints");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center gap-2">
          <MessageSquareWarning className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Réclamations</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{"Les demandes d'assistance envoyées par vos clients depuis l'application."}</p>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Total" value={stats?.total ?? "—"} />
          <StatCard label="Nouvelles" value={stats?.new ?? "—"} tone="text-sky-500" />
          <StatCard label="En attente" value={stats?.pending ?? "—"} tone="text-amber-500" />
          <StatCard label="Résolues" value={stats?.resolved ?? "—"} tone="text-emerald-500" />
          <StatCard label="Non lues" value={stats?.unread ?? "—"} tone={stats && stats.unread > 0 ? "text-primary" : undefined} />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Client, e-mail, référence, sujet…" className="h-9 bg-background pl-9" aria-label="Rechercher une réclamation" />
          </div>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{COMPLAINT_STATUS[s].label}</option>)}
          </select>
          <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorité">
            <option value="">Toutes les priorités</option>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{COMPLAINT_PRIORITY[p].label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">Du <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} /></label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">au <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} /></label>
          <label className="flex h-9 items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="h-4 w-4" />
            Non lues
          </label>
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Actualiser"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
          {hasFilters ? <Button variant="ghost" size="sm" onClick={reset}>Réinitialiser</Button> : null}
        </div>
        {clientId ? <p className="text-xs text-muted-foreground">Filtré sur un client. <button className="underline" onClick={reset}>Voir toutes les réclamations</button></p> : null}

        {error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Impossible de charger les réclamations.</p>
            <Button className="mt-3" size="sm" onClick={() => void load()}>Réessayer</Button>
          </div>
        ) : loading && rows.length === 0 ? (
          <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">{hasFilters ? "Aucune réclamation ne correspond" : "Aucune réclamation pour le moment"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{hasFilters ? "Modifiez ou réinitialisez les filtres." : "Quand un client en enverra une, elle apparaîtra ici."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/complaints/${c.id}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.unread > 0 ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" /> : null}
                      <span className={cn("truncate font-medium text-foreground", c.unread > 0 && "font-semibold")}>{c.subject}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", COMPLAINT_STATUS[c.status].className)}>{COMPLAINT_STATUS[c.status].label}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", COMPLAINT_PRIORITY[c.priority].className)}>{COMPLAINT_PRIORITY[c.priority].label}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.client.name || c.client.email || "Client"} · {c.categoryLabel} · {c.reference}
                    </p>
                    {c.lastMessagePreview ? <p className="mt-1 truncate text-sm text-muted-foreground">{c.lastMessagePreview}</p> : null}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                    {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true, locale: dateFnsFr })}
                    <div>{c.messageCount} message{c.messageCount > 1 ? "s" : ""}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {loading && rows.length > 0 ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
    </div>
  );
}
