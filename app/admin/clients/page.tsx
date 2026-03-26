"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fr } from "@/lib/i18n/fr";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  UserPlus, Search, RefreshCw, Users, ChevronRight,
  Activity, CalendarDays, Loader2, AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = "all" | "active" | "expired" | "expiring_soon" | "inactive" | "unassigned";

interface ClientRow {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  subscription: {
    _id: string;
    levelName?: string;
    effectiveStatus: string;
    endAt: string;
  } | null;
  lastWorkoutDate: string | null;
  segment: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all",           label: "Tous" },
  { value: "active",        label: "Actifs" },
  { value: "expiring_soon", label: "Expire bientôt" },
  { value: "inactive",      label: "Inactifs" },
  { value: "expired",       label: "Expirés" },
  { value: "unassigned",    label: "Non assignés" },
];

const SEGMENT_STYLE: Record<string, { dot: string; pill: string }> = {
  active:        { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  expiring_soon: { dot: "bg-amber-400",   pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
  inactive:      { dot: "bg-gray-400",    pill: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  expired:       { dot: "bg-red-500",     pill: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400" },
  unassigned:    { dot: "bg-gray-300",    pill: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500" },
};

const SEGMENT_LABEL: Record<string, string> = {
  active: "Actif", expiring_soon: "Expire bientôt",
  inactive: "Inactif", expired: "Expiré", unassigned: "Non assigné",
};

const LEVEL_AVATAR: Record<string, string> = {
  Intiate:  "bg-slate-500",
  Fighter:  "bg-blue-500",
  Warrior:  "bg-emerald-600",
  Champion: "bg-amber-500",
  Elite:    "bg-rose-500",
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function getInitials(name?: string, email?: string): string {
  if (name) return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ client, onClick }: { client: ClientRow; onClick: () => void }) {
  const seg = client.segment;
  const style = SEGMENT_STYLE[seg] || SEGMENT_STYLE.inactive;
  const levelName = client.subscription?.levelName;
  const avatarColor = LEVEL_AVATAR[levelName || ""] || "bg-primary/80";
  const daysLeft = client.subscription ? daysUntil(client.subscription.endAt) : null;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-black/5 transition-all duration-150 overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Avatar */}
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm",
          avatarColor
        )}>
          {getInitials(client.name, client.email)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {client.name || "Client sans nom"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {client.email || client.phone || "—"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 mt-0.5 transition-colors" />
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Status pill */}
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", style.pill)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
              {SEGMENT_LABEL[seg] || seg}
            </span>

            {/* Level pill */}
            {levelName && (
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {levelName}
              </span>
            )}

            {/* Days remaining */}
            {client.subscription && daysLeft !== null && (
              <span className={cn(
                "text-[11px] font-medium",
                daysLeft < 0 ? "text-red-500" :
                daysLeft <= 7 ? "text-amber-500" :
                "text-muted-foreground"
              )}>
                {daysLeft < 0 ? `Expiré J+${Math.abs(daysLeft)}` : `J-${daysLeft}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between bg-muted/20">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Activity className="h-3 w-3" />
          {client.lastWorkoutDate
            ? formatDistanceToNow(new Date(client.lastWorkoutDate), { addSuffix: true, locale: dateFnsFr })
            : "Jamais entraîné"}
        </span>
        {client.subscription && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {format(new Date(client.subscription.endAt), "dd MMM yyyy")}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-24" />
          <div className="flex gap-2 mt-1">
            <div className="h-4 bg-muted rounded-full w-16" />
            <div className="h-4 bg-muted rounded-full w-12" />
          </div>
        </div>
      </div>
      <div className="border-t border-border/50 px-4 py-2 bg-muted/20">
        <div className="h-3 bg-muted rounded w-28" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<Segment>("all");
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(false);
  const { query, setQuery, effectiveQuery, isDebouncing } = useDebouncedSearch({ debounceMs: 400, minLength: 2 });

  // Add client modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const loadClients = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const data = await api.getClients(
        { segment, search: effectiveQuery || undefined, page: pagination.page, limit: pagination.limit },
        { signal }
      );
      if (signal.aborted) return;
      hasLoadedOnce.current = true;
      setClients(data.clients || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (e: unknown) {
      const err = e as { name?: string; code?: string };
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
      setClients([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [segment, effectiveQuery, pagination.page, pagination.limit]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [effectiveQuery, segment]);

  const handleAddClient = async () => {
    if (!addEmail && !addPhone) { setAddError("Email ou téléphone requis"); return; }
    if (!addPassword || addPassword.length < 6) { setAddError(fr.clientsPage.passwordMinLength); return; }
    setAddLoading(true);
    setAddError("");
    try {
      await api.createClient({ name: addName || undefined, email: addEmail || undefined, phone: addPhone || undefined, password: addPassword });
      setAddOpen(false);
      setAddName(""); setAddEmail(""); setAddPhone(""); setAddPassword("");
      loadClients();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAddError(err.response?.data?.message || fr.clientsPage.failedToCreateClient);
    } finally {
      setAddLoading(false);
    }
  };

  const isSearching = isDebouncing || (!!effectiveQuery && loading);

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">

      {/* ── PAGE HEADER ── */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pagination.total > 0
                ? `${pagination.total} client${pagination.total > 1 ? "s" : ""} au total`
                : "Gérez vos clients et leurs programmes"}
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            Nouveau client
          </Button>
        </div>

        {/* Search + Refresh */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher nom, email, téléphone…"
              className="pl-9 pr-9 h-9 bg-background"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => loadClients()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Segment filter pills */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full transition-all",
                segment === s.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-foreground">Aucun client trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">
              {segment !== "all"
                ? `Aucun client dans le segment "${SEGMENTS.find(s => s.value === segment)?.label}".`
                : "Ajoutez votre premier client pour commencer."}
            </p>
            {segment === "all" && (
              <Button className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Nouveau client
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((c) => (
                <ClientCard
                  key={c._id}
                  client={c}
                  onClick={() => router.push(`/admin/clients/${c._id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} / {pagination.pages} · {pagination.total} clients
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>
                    Précédent
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ADD CLIENT MODAL ── */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddError(""); setAddName(""); setAddEmail(""); setAddPhone(""); setAddPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Nouveau client</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Créez un compte client et configurez-le ensuite depuis sa fiche.</p>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {addError && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            {/* Identité */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identité</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Nom complet (optionnel)"
              />
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contact <span className="text-primary font-medium normal-case tracking-normal">· au moins un</span>
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="Email"
                />
                <Input
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="Téléphone"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mot de passe</Label>
              <Input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Min. 6 caractères"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Après la création, assignez un plan d&apos;entraînement et un diet depuis la fiche client.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAddClient} disabled={addLoading} className="gap-2">
              {addLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Création…</>
                : <><UserPlus className="h-4 w-4" />Créer le client</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
