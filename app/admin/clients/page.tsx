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

function ClientCard({ client, onClick }: { client: ClientRow; onClick: () => void }) {
  const seg = client.segment;
  const style = SEGMENT_STYLE[seg] || SEGMENT_STYLE.unassigned;
  const levelName = client.subscription?.levelName;
  const daysLeft = client.subscription ? daysUntil(client.subscription.endAt) : null;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-black/5 transition-all duration-150 overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Avatar */}
        <div className="relative h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm overflow-hidden bg-primary/80">
          {client.photoUri ? (
            <img
              src={client.photoUri}
              alt={client.name || "Client"}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <span>{getInitials(client.name, client.email)}</span>
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
  const [addSexe, setAddSexe] = useState<"M" | "F" | "">("");
  const [addAge, setAddAge] = useState("");
  const [addTaille, setAddTaille] = useState("");
  const [addPoids, setAddPoids] = useState("");
  const [addObjectif, setAddObjectif] = useState("");
  const [addFitnessLevel, setAddFitnessLevel] = useState<"A" | "B" | "">("");
  const [addBodyFat, setAddBodyFat] = useState("");
  const [addMuscleMass, setAddMuscleMass] = useState("");
  const [addSelectedPlanId, setAddSelectedPlanId] = useState("");
  const [addPlanSearch, setAddPlanSearch] = useState("");
  const [addPlans, setAddPlans] = useState<Array<{ _id: string; name: string; level: string }>>([]);
  const [addPlansLoading, setAddPlansLoading] = useState(false);
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

  const loadPlans = useCallback(async () => {
    setAddPlansLoading(true);
    try {
      const data = await api.getLevelTemplates({
        page: 1,
        limit: 100,
        search: addPlanSearch || undefined,
      });
      setAddPlans(data.templates || []);
    } catch (e) {
      console.error("Failed to load plans:", e);
      setAddPlans([]);
    } finally {
      setAddPlansLoading(false);
    }
  }, [addPlanSearch]);

  useEffect(() => {
    if (addOpen) {
      loadPlans();
    }
  }, [addOpen, loadPlans]);

  const handleAddClient = async () => {
    if (!addEmail && !addPhone) { setAddError("Email ou téléphone requis"); return; }
    if (!addPassword || addPassword.length < 6) { setAddError(fr.clientsPage.passwordMinLength); return; }
    setAddLoading(true);
    setAddError("");
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
      setAddSexe(""); setAddAge(""); setAddTaille(""); setAddPoids(""); setAddObjectif(""); setAddFitnessLevel(""); setAddBodyFat(""); setAddMuscleMass(""); setAddSelectedPlanId(""); setAddPlanSearch("");
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
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddError(""); setAddName(""); setAddEmail(""); setAddPhone(""); setAddPassword(""); setAddSexe(""); setAddAge(""); setAddTaille(""); setAddPoids(""); setAddObjectif(""); setAddFitnessLevel(""); setAddBodyFat(""); setAddMuscleMass(""); setAddSelectedPlanId(""); setAddPlanSearch(""); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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

          <DialogBody className="space-y-4">
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

            {/* Profil Physique (Sexe, Âge, Taille, Poids) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profil Physique</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label htmlFor="add-sexe" className="text-xs text-muted-foreground mb-1 block">Sexe</Label>
                  <select
                    id="add-sexe"
                    value={addSexe}
                    onChange={(e) => setAddSexe(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring animate-none"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="M">Homme (M)</option>
                    <option value="F">Femme (F)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="add-age" className="text-xs text-muted-foreground mb-1 block">Âge</Label>
                  <Input
                    id="add-age"
                    type="number"
                    value={addAge}
                    onChange={(e) => setAddAge(e.target.value)}
                    placeholder="Ex: 28"
                  />
                </div>
                <div>
                  <Label htmlFor="add-taille" className="text-xs text-muted-foreground mb-1 block">Taille (cm)</Label>
                  <Input
                    id="add-taille"
                    type="number"
                    value={addTaille}
                    onChange={(e) => setAddTaille(e.target.value)}
                    placeholder="Ex: 175"
                  />
                </div>
                <div>
                  <Label htmlFor="add-poids" className="text-xs text-muted-foreground mb-1 block">Poids (kg)</Label>
                  <Input
                    id="add-poids"
                    type="number"
                    value={addPoids}
                    onChange={(e) => setAddPoids(e.target.value)}
                    placeholder="Ex: 78"
                  />
                </div>
              </div>
            </div>

            {/* Objectif & Niveau */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="add-objectif" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objectif</Label>
                <Input
                  id="add-objectif"
                  value={addObjectif}
                  onChange={(e) => setAddObjectif(e.target.value)}
                  placeholder="Ex: Perte de poids"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-level" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Niveau d'activité</Label>
                <select
                  id="add-level"
                  value={addFitnessLevel}
                  onChange={(e) => setAddFitnessLevel(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring animate-none"
                >
                  <option value="">Sélectionner...</option>
                  <option value="A">Niveau A</option>
                  <option value="B">Niveau B</option>
                </select>
              </div>
            </div>

            {/* Composition Corporelle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Composition Corporelle (%)</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label htmlFor="add-fat" className="text-xs text-muted-foreground mb-1 block">Masse grasse (%)</Label>
                  <Input
                    id="add-fat"
                    type="number"
                    step="0.1"
                    value={addBodyFat}
                    onChange={(e) => setAddBodyFat(e.target.value)}
                    placeholder="Ex: 18.5"
                  />
                </div>
                <div>
                  <Label htmlFor="add-muscle" className="text-xs text-muted-foreground mb-1 block">Masse musculaire (%)</Label>
                  <Input
                    id="add-muscle"
                    type="number"
                    step="0.1"
                    value={addMuscleMass}
                    onChange={(e) => setAddMuscleMass(e.target.value)}
                    placeholder="Ex: 42.1"
                  />
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div className="space-y-1.5 border-t border-border pt-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan d'entraînement (Optionnel)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={addPlanSearch}
                  onChange={(e) => setAddPlanSearch(e.target.value)}
                  placeholder="Rechercher un plan..."
                  className="pl-9"
                />
              </div>
              {addPlansLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : addPlans.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                  {addPlans.map((plan) => (
                    <button
                      key={plan._id}
                      onClick={() => setAddSelectedPlanId(plan._id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors text-sm",
                        addSelectedPlanId === plan._id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      )}
                    >
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs opacity-70">{plan.level}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Aucun plan disponible</p>
              )}
              {addSelectedPlanId && (
                <div className="text-xs text-muted-foreground">
                  Plan sélectionné: <span className="font-medium text-foreground">{addPlans.find(p => p._id === addSelectedPlanId)?.name}</span>
                </div>
              )}
            </div>
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
