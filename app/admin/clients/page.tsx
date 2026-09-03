"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getMediaBaseUrl } from "@/lib/apiBaseUrl";
import { fr } from "@/lib/i18n/fr";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminFormErrorSummary, AdminFormSection, AdminModal, AdminModalFooter, AdminSearchableSelect, type AdminFormError } from "@/components/admin";
import { cn } from "@/lib/utils";
import {
  UserPlus, Search, RefreshCw, Users, ChevronRight, Mail, Phone,
  Activity, CalendarDays, Loader2, HeartPulse, Target, Dumbbell, LockKeyhole,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = "all" | "active" | "expired" | "expiring_soon" | "unassigned";

interface ClientRow {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  photoUri?: string | null;
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
  { value: "expired",       label: "Expirés" },
  { value: "unassigned",    label: "Non assignés" },
];

const SEGMENT_STYLE: Record<string, { dot: string; pill: string }> = {
  active:        { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  expiring_soon: { dot: "bg-amber-400",   pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
  expired:       { dot: "bg-red-500",     pill: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400" },
  unassigned:    { dot: "bg-gray-300",    pill: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500" },
};

const SEGMENT_LABEL: Record<string, string> = {
  active: "Actif", expiring_soon: "Expire bientôt",
  expired: "Expiré", unassigned: "Non assigné",
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

function clientPhotoUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return `${getMediaBaseUrl()}${value.startsWith("/") ? "" : "/"}${value}`;
}

function ClientAvatar({ client, className }: { client: ClientRow; className?: string }) {
  const photo = clientPhotoUrl(client.photoUri);
  return (
    <span className={cn("relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/85 text-sm font-bold text-primary-foreground shadow-sm ring-1 ring-black/5", className)}>
      <span>{getInitials(client.name, client.email)}</span>
      {photo ? (
        <img
          src={photo}
          alt={`Photo de ${client.name || "ce client"}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      ) : null}
    </span>
  );
}

function ClientStatus({ segment }: { segment: string }) {
  const style = SEGMENT_STYLE[segment] || SEGMENT_STYLE.unassigned;
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", style.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden="true" />
      {SEGMENT_LABEL[segment] || segment}
    </span>
  );
}

function ClientCard({ client, onClick }: { client: ClientRow; onClick: () => void }) {
  const seg = client.segment;
  const style = SEGMENT_STYLE[seg] || SEGMENT_STYLE.unassigned;
  const levelName = client.subscription?.levelName;
  const daysLeft = client.subscription ? daysUntil(client.subscription.endAt) : null;

  return (
    <button
      onClick={onClick}
      className="group w-full overflow-hidden text-left transition-colors duration-150 hover:bg-muted/35 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Avatar */}
        <ClientAvatar client={client} />

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
    <div className="overflow-hidden border-b border-border/70 bg-card animate-pulse last:border-b-0">
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

function ClientList({ clients, onOpen }: { clients: ClientRow[]; onOpen: (client: ClientRow) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3.5">Client</th>
              <th className="px-4 py-3.5">Contact</th>
              <th className="px-4 py-3.5">Abonnement</th>
              <th className="px-4 py-3.5">Dernier entraînement</th>
              <th className="px-4 py-3.5">Échéance</th>
              <th className="w-14 px-4 py-3.5"><span className="sr-only">Ouvrir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {clients.map((client) => {
              const daysLeft = client.subscription ? daysUntil(client.subscription.endAt) : null;
              return (
                <tr
                  key={client._id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Ouvrir le dossier de ${client.name || "ce client"}`}
                  onClick={() => onOpen(client)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(client); } }}
                  className="group cursor-pointer transition-colors hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ClientAvatar client={client} />
                      <div className="min-w-0"><p className="max-w-56 truncate text-sm font-semibold text-foreground">{client.name || "Client sans nom"}</p><p className="mt-0.5 text-xs text-muted-foreground">Inscrit le {format(new Date(client.createdAt), "dd MMM yyyy", { locale: dateFnsFr })}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-1 text-sm"><p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="max-w-56 truncate">{client.email || "—"}</span></p>{client.phone ? <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{client.phone}</p> : null}</div>
                  </td>
                  <td className="px-4 py-3.5"><div className="flex flex-col items-start gap-1.5"><ClientStatus segment={client.segment} />{client.subscription?.levelName ? <span className="text-xs font-medium text-muted-foreground">{client.subscription.levelName}</span> : null}</div></td>
                  <td className="px-4 py-3.5"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4 shrink-0" aria-hidden="true" />{client.lastWorkoutDate ? formatDistanceToNow(new Date(client.lastWorkoutDate), { addSuffix: true, locale: dateFnsFr }) : "Jamais entraîné"}</span></td>
                  <td className="px-4 py-3.5"><div className="space-y-1"><span className="flex items-center gap-2 text-sm text-foreground"><CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />{client.subscription ? format(new Date(client.subscription.endAt), "dd MMM yyyy", { locale: dateFnsFr }) : "—"}</span>{daysLeft !== null ? <p className={cn("pl-6 text-xs font-medium", daysLeft < 0 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-muted-foreground")}>{daysLeft < 0 ? `Expiré depuis ${Math.abs(daysLeft)} j` : `${daysLeft} j restants`}</p> : null}</div></td>
                  <td className="px-4 py-3.5 text-right"><span className="inline-grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground"><ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-border md:hidden">
        {clients.map((client) => <ClientCard key={client._id} client={client} onClick={() => onOpen(client)} />)}
      </div>
    </div>
  );
}

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
  const [addSexe, setAddSexe] = useState<"M" | "F" | "">("");
  const [addAge, setAddAge] = useState("");
  const [addTaille, setAddTaille] = useState("");
  const [addPoids, setAddPoids] = useState("");
  const [addObjectif, setAddObjectif] = useState("");
  const [addFitnessLevel, setAddFitnessLevel] = useState<"A" | "B" | "">("");
  const [addBodyFat, setAddBodyFat] = useState("");
  const [addMuscleMass, setAddMuscleMass] = useState("");
  const [addSelectedPlanId, setAddSelectedPlanId] = useState("");
  const [addPlanLevelFilter, setAddPlanLevelFilter] = useState("all");
  const [addPlanGenderFilter, setAddPlanGenderFilter] = useState("all");
  const [addPlans, setAddPlans] = useState<Array<{ _id: string; name: string; level?: string; description?: string; gender?: string; isActive?: boolean; weeks?: unknown[] }>>([]);
  const [addPlansLoading, setAddPlansLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addErrors, setAddErrors] = useState<AdminFormError[]>([]);
  const addNameRef = useRef<HTMLInputElement>(null);

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

  const loadPlans = useCallback(async () => {
    setAddPlansLoading(true);
    try {
      const data = await api.getLevelTemplates({
        page: 1,
        limit: 100,
      });
      setAddPlans(data.levelTemplates || []);
    } catch (e) {
      console.error("Failed to load plans:", e);
      setAddPlans([]);
    } finally {
      setAddPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    if (addOpen) {
      loadPlans();
    }
  }, [addOpen, loadPlans]);

  const handleAddClient = async () => {
    const errors: AdminFormError[] = [];
    if (!addEmail && !addPhone) errors.push({ field: "add-email", message: "Renseignez un email ou un numéro de téléphone." });
    if (!addPassword || addPassword.length < 6) errors.push({ field: "add-password", message: fr.clientsPage.passwordMinLength });
    if (addBodyFat && (Number(addBodyFat) < 0 || Number(addBodyFat) > 100)) errors.push({ field: "add-fat", message: "La masse grasse doit être comprise entre 0 et 100 %." });
    if (addMuscleMass && (Number(addMuscleMass) < 0 || Number(addMuscleMass) > 100)) errors.push({ field: "add-muscle", message: "La masse musculaire doit être comprise entre 0 et 100 %." });
    setAddErrors(errors);
    if (errors.length > 0) {
      requestAnimationFrame(() => document.getElementById(errors[0].field ?? "")?.focus());
      return;
    }
    setAddLoading(true);
    setAddErrors([]);
    try {
      await api.createClient({
        name: addName || undefined,
        email: addEmail || undefined,
        phone: addPhone || undefined,
        password: addPassword,
        sexe: addSexe || undefined,
        age: addAge || undefined,
        taille: addTaille || undefined,
        poids: addPoids || undefined,
        objectif: addObjectif || undefined,
        fitnessLevel: addFitnessLevel || undefined,
        assignedPlanId: addSelectedPlanId || undefined,
        bodyComposition: (addBodyFat || addMuscleMass) ? {
          bodyFatPercentage: addBodyFat ? parseFloat(addBodyFat) : undefined,
          muscleMassPercentage: addMuscleMass ? parseFloat(addMuscleMass) : undefined,
        } : undefined,
      });
      setAddOpen(false);
      setAddName(""); setAddEmail(""); setAddPhone(""); setAddPassword("");
      setAddSexe(""); setAddAge(""); setAddTaille(""); setAddPoids(""); setAddObjectif(""); setAddFitnessLevel(""); setAddBodyFat(""); setAddMuscleMass(""); setAddSelectedPlanId(""); setAddPlanLevelFilter("all"); setAddPlanGenderFilter("all");
      loadClients();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAddErrors([{ message: err.response?.data?.message || fr.clientsPage.failedToCreateClient }]);
    } finally {
      setAddLoading(false);
    }
  };

  const filteredAddPlans = useMemo(() => addPlans
    .filter((plan) => plan.isActive !== false)
    .filter((plan) => addPlanLevelFilter === "all" || plan.level === addPlanLevelFilter)
    .filter((plan) => addPlanGenderFilter === "all" || plan.gender === addPlanGenderFilter)
    .sort((a, b) => a.name.localeCompare(b.name, "fr")), [addPlanGenderFilter, addPlanLevelFilter, addPlans]);

  const selectedAddPlan = addPlans.find((plan) => plan._id === addSelectedPlanId);
  const addDirty = Boolean(addName || addEmail || addPhone || addPassword || addSexe || addAge || addTaille || addPoids || addObjectif || addFitnessLevel || addBodyFat || addMuscleMass || addSelectedPlanId);

  const resetAddForm = () => {
    setAddErrors([]); setAddName(""); setAddEmail(""); setAddPhone(""); setAddPassword("");
    setAddSexe(""); setAddAge(""); setAddTaille(""); setAddPoids(""); setAddObjectif(""); setAddFitnessLevel("");
    setAddBodyFat(""); setAddMuscleMass(""); setAddSelectedPlanId(""); setAddPlanLevelFilter("all"); setAddPlanGenderFilter("all");
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
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
            <ClientList clients={clients} onOpen={(client) => router.push(`/admin/clients/${client._id}`)} />

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

      <AdminModal
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}
        title="Créer un client"
        description="Renseignez son profil puis choisissez le plan qui déterminera automatiquement son niveau."
        icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
        size="xl"
        busy={addLoading}
        dirty={addDirty}
        initialFocusRef={addNameRef}
        footer={(requestClose) => (
          <AdminModalFooter status={addDirty ? "Modifications non enregistrées" : "Renseignez les informations du client"} statusTone={addErrors.length > 0 ? "warning" : addDirty ? "neutral" : "valid"} submitLabel="Créer le client" loadingLabel="Création…" loading={addLoading} onCancel={requestClose} onSubmit={() => void handleAddClient()} />
        )}
      >
        <div className="space-y-5">
          <AdminFormErrorSummary errors={addErrors} />

          <AdminFormSection title="Informations personnelles" description="Un email ou un téléphone est obligatoire." icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="add-name">Nom complet <span className="font-normal text-muted-foreground">(optionnel)</span></Label><Input ref={addNameRef} id="add-name" value={addName} onChange={(event) => setAddName(event.target.value)} placeholder="Ex. Amine Ben Salah" className="h-11 bg-muted/30" autoComplete="name" /></div>
              <div className="space-y-2"><Label htmlFor="add-email">Email</Label><Input id="add-email" type="email" value={addEmail} onChange={(event) => setAddEmail(event.target.value)} placeholder="client@exemple.tn" className="h-11 bg-muted/30" autoComplete="email" aria-invalid={addErrors.some((error) => error.field === "add-email")} /></div>
              <div className="space-y-2"><Label htmlFor="add-phone">Téléphone</Label><Input id="add-phone" type="tel" value={addPhone} onChange={(event) => setAddPhone(event.target.value)} placeholder="+216 20 000 000" className="h-11 bg-muted/30" autoComplete="tel" /></div>
              <div className="space-y-2"><Label htmlFor="add-password">Mot de passe *</Label><Input id="add-password" type="password" value={addPassword} onChange={(event) => setAddPassword(event.target.value)} placeholder="6 caractères minimum" className="h-11 bg-muted/30" autoComplete="new-password" aria-invalid={addErrors.some((error) => error.field === "add-password")} /></div>
              <div className="space-y-2"><Label htmlFor="add-sexe">Sexe</Label><select id="add-sexe" value={addSexe} onChange={(event) => setAddSexe(event.target.value as "M" | "F" | "")} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Non renseigné</option><option value="M">Homme</option><option value="F">Femme</option></select></div>
              <div className="space-y-2"><Label htmlFor="add-age">Âge</Label><Input id="add-age" type="number" min={1} value={addAge} onChange={(event) => setAddAge(event.target.value)} placeholder="Ex. 28" className="h-11 bg-muted/30" /></div>
              <div className="space-y-2"><Label htmlFor="add-taille">Taille</Label><div className="relative"><Input id="add-taille" type="number" min={1} value={addTaille} onChange={(event) => setAddTaille(event.target.value)} placeholder="175" className="h-11 bg-muted/30 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">cm</span></div></div>
              <div className="space-y-2"><Label htmlFor="add-poids">Poids</Label><div className="relative"><Input id="add-poids" type="number" min={1} value={addPoids} onChange={(event) => setAddPoids(event.target.value)} placeholder="78" className="h-11 bg-muted/30 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span></div></div>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Composition corporelle" description="Valeurs facultatives comprises entre 0 et 100 %." icon={<HeartPulse className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="add-fat">Masse grasse</Label><div className="relative"><Input id="add-fat" type="number" min={0} max={100} step={0.1} value={addBodyFat} onChange={(event) => setAddBodyFat(event.target.value)} className="h-11 bg-muted/30 pr-10" aria-invalid={addErrors.some((error) => error.field === "add-fat")} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></div>
              <div className="space-y-2"><Label htmlFor="add-muscle">Masse musculaire</Label><div className="relative"><Input id="add-muscle" type="number" min={0} max={100} step={0.1} value={addMuscleMass} onChange={(event) => setAddMuscleMass(event.target.value)} className="h-11 bg-muted/30 pr-10" aria-invalid={addErrors.some((error) => error.field === "add-muscle")} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></div>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Objectifs" description="Ces champs reprennent les informations actuellement acceptées par l’API client." icon={<Target className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="add-objectif">Objectif principal</Label><Input id="add-objectif" value={addObjectif} onChange={(event) => setAddObjectif(event.target.value)} placeholder="Ex. Perte de poids" className="h-11 bg-muted/30" /></div>
              <div className="space-y-2"><Label htmlFor="add-level">Niveau d’activité</Label><select id="add-level" value={addFitnessLevel} onChange={(event) => setAddFitnessLevel(event.target.value as "A" | "B" | "")} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Non renseigné</option><option value="A">Niveau A</option><option value="B">Niveau B</option></select></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Les calories et macronutriments seront configurés depuis la fiche nutrition après la création, conformément au flux API existant.</p></div>
          </AdminFormSection>

          <AdminFormSection title="Plan affecté" description="Choisissez un plan actif. Le niveau client est lu uniquement depuis le plan sélectionné." icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="plan-level-filter">Filtrer par niveau</Label><select id="plan-level-filter" value={addPlanLevelFilter} onChange={(event) => setAddPlanLevelFilter(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><option value="all">Tous les niveaux</option>{["INITIATE", "FIGHTER", "WARRIOR", "CHAMPION", "ELITE"].map((level) => <option key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="plan-gender-filter">Filtrer par sexe</Label><select id="plan-gender-filter" value={addPlanGenderFilter} onChange={(event) => setAddPlanGenderFilter(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><option value="all">Tous</option><option value="M">Homme</option><option value="F">Femme</option></select></div>
            </div>
            <AdminSearchableSelect items={filteredAddPlans} selectedKeys={addSelectedPlanId ? [addSelectedPlanId] : []} onSelectionChange={(keys) => setAddSelectedPlanId(keys[0] || "")} getKey={(plan) => plan._id} getLabel={(plan) => plan.name} getSearchText={(plan) => `${plan.name} ${plan.level || ""} ${plan.gender || ""}`} renderMeta={(plan) => `${plan.level ? plan.level.charAt(0) + plan.level.slice(1).toLowerCase() : "Niveau non renseigné"} · ${plan.gender === "M" ? "Homme" : plan.gender === "F" ? "Femme" : "Tous"} · ${plan.weeks?.length ?? 5} semaines`} placeholder="Rechercher un plan par nom…" emptyText="Aucun plan actif ne correspond aux filtres." loading={addPlansLoading} label="Plans actifs disponibles" />
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground" aria-live="polite"><p className="font-semibold">Niveau automatique : {selectedAddPlan?.level ? selectedAddPlan.level.charAt(0) + selectedAddPlan.level.slice(1).toLowerCase() : "Aucun plan sélectionné"}</p><p className="mt-1 text-muted-foreground">Le niveau est déterminé par le plan sélectionné et n’est jamais envoyé comme propriété éditable du client.</p></div>
          </AdminFormSection>
        </div>
      </AdminModal>
    </div>
  );
}
