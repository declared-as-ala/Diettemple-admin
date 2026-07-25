"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageLoader } from "@/components/ui/loading";
import { WeekPlanner } from "@/components/planner/WeekPlanner";
import {
  apiWeeksToState,
  weeksToApiPayload,
  countWeekSessions,
  DAY_KEYS,
  type WeekState,
  type DayKey,
} from "@/lib/plannerHelpers";
import {
  ArrowLeft, Save, RotateCcw, Check, AlertCircle,
  User, Users, Calendar, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelImageUrl, normalizeLevelName } from "@/lib/levelAssets";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { AdminFormErrorSummary, AdminFormSection, type AdminFormError } from "@/components/admin";
import { Textarea } from "@/components/ui/textarea";

const LEVEL_COLORS: Record<string, string> = {
  Intiate:  "from-slate-600 to-slate-800",
  Fighter:  "from-blue-600 to-blue-900",
  Champion: "from-amber-500 to-amber-800",
  Elite:    "from-rose-600 to-rose-900",
};

export default function LevelTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [levelTemplate, setLevelTemplate] = useState<Record<string, unknown> | null>(null);
  const [sessionTemplates, setSessionTemplates] = useState<Array<{ _id: string; title?: string; durationMinutes?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<WeekState[]>([]);
  const [initialWeeks, setInitialWeeks] = useState<WeekState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tab, setTab] = useState<"info" | "planner">(
    searchParams?.get("tab") === "info" ? "info" : "planner"
  );
  const [editName, setEditName] = useState("");
  const [editClientDisplayName, setEditClientDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [sessionSearch, setSessionSearch] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoErrors, setInfoErrors] = useState<AdminFormError[]>([]);
  const [resetWeekIndex, setResetWeekIndex] = useState<number | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const loadLevel = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getLevelTemplate(id);
      const plan = data.levelTemplate;
      if (!plan) return;
      setLevelTemplate(plan);
      setEditName(String(plan.name ?? ""));
      setEditClientDisplayName(String(plan.clientDisplayName || plan.name || ""));
      setEditDescription(String(plan.description ?? ""));
      setEditIsActive(plan.isActive !== false);
      const rawWeeks = plan.weeks && Array.isArray(plan.weeks) ? plan.weeks : [];
      const state = apiWeeksToState(rawWeeks as Parameters<typeof apiWeeksToState>[0]);
      setWeeks(state);
      setInitialWeeks(state);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Erreur de chargement", "error");
    }
  }, [id, toast]);

  const loadSessionTemplates = useCallback(async () => {
    try {
      const data = await api.getSessionTemplates({ limit: 100, search: sessionSearch || undefined });
      setSessionTemplates(data.sessionTemplates || []);
    } catch {
      setSessionTemplates([]);
    }
  }, [sessionSearch]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadLevel().finally(() => setLoading(false));
  }, [id, loadLevel]);

  useEffect(() => { loadSessionTemplates(); }, [loadSessionTemplates]);

  useEffect(() => {
    setDirty(JSON.stringify(weeksToApiPayload(weeks)) !== JSON.stringify(weeksToApiPayload(initialWeeks)));
  }, [weeks, initialWeeks]);

  const infoDirty = Boolean(levelTemplate && (
    editName !== String(levelTemplate.name ?? "") ||
    editClientDisplayName !== String(levelTemplate.clientDisplayName ?? levelTemplate.name ?? "") ||
    editDescription !== String(levelTemplate.description ?? "") ||
    editIsActive !== (levelTemplate.isActive !== false)
  ));
  const anyDirty = dirty || infoDirty;

  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }> = {};
  sessionTemplates.forEach((s) => { sessionTemplateById[s._id] = { title: s.title, durationMinutes: s.durationMinutes }; });

  const handleSaveInfo = async () => {
    const errors: AdminFormError[] = [];
    if (!editName.trim()) {
      errors.push({ field: "edit-plan-name", message: "Le nom interne du plan est obligatoire." });
    }
    if (!editClientDisplayName.trim()) {
      errors.push({ field: "edit-plan-client-name", message: "Veuillez saisir le nom affiché au client." });
    }
    setInfoErrors(errors);
    if (errors.length > 0) {
      requestAnimationFrame(() => document.getElementById(errors[0].field ?? "")?.focus());
      return;
    }
    setInfoSaving(true);
    try {
      await api.updateLevelTemplate(id, {
        name: editName.trim(),
        clientDisplayName: editClientDisplayName.trim(),
        description: editDescription.trim(),
        isActive: editIsActive,
      });
      setLevelTemplate((p) => (p ? { ...p, name: editName.trim(), clientDisplayName: editClientDisplayName.trim(), description: editDescription.trim(), isActive: editIsActive } : p));
      setLastSaved(new Date());
      toast("Informations sauvegardées", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e.response?.data?.message || e.message || "Impossible d’enregistrer les informations.";
      setInfoErrors([{ message }]);
      toast(message, "error");
    } finally {
      setInfoSaving(false);
    }
  };

  const handleSaveWeeks = async () => {
    setSaving(true);
    try {
      await api.updateLevelTemplateWeeks(id, weeksToApiPayload(weeks));
      setInitialWeeks(weeks);
      setDirty(false);
      setLastSaved(new Date());
      toast("Planning sauvegardé ✓", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Erreur de sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetWeek = (weekIndex: number) => {
    setWeeks((prev) =>
      prev.map((w, wi) =>
        wi === weekIndex
          ? {
              ...w,
              sessions: [],
              minimumCompletedSessions: 0,
              isRestWeek: false,
              days: DAY_KEYS.reduce((acc, d) => { acc[d] = []; return acc; }, {} as Record<DayKey, WeekState["days"]["mon"]>),
            }
          : w
      )
    );
    setResetWeekIndex(null);
  };

  const requestLeave = () => {
    if (anyDirty) setLeaveConfirmOpen(true);
    else router.push("/admin/level-templates");
  };

  const canSave = true;
  const levelName = levelTemplate ? String(levelTemplate.name ?? "") : "";
  const clientDisplayName = levelTemplate ? String(levelTemplate.clientDisplayName || levelTemplate.name || "") : "";
  const gender = levelTemplate ? String(levelTemplate.gender ?? "M") : "M";
  const tierForUi = normalizeLevelName(levelName);
  const gradientClass = LEVEL_COLORS[tierForUi] ?? "from-gray-600 to-gray-900";
  const levelImage = getLevelImageUrl(levelName);

  if (loading || !levelTemplate) return <PageLoader />;

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* ── HEADER ── */}
      <div className={cn("relative bg-gradient-to-r overflow-hidden", gradientClass)}>
        <img
          src={levelImage}
          alt=""
          className="absolute right-0 top-0 h-full w-48 object-cover object-center opacity-15 pointer-events-none select-none"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="relative z-10 flex items-center gap-4 px-6 py-4">
          <button
            onClick={requestLeave}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Plans
          </button>

          <div className="w-px h-5 bg-white/20" />

          <img
            src={levelImage}
            alt={levelName}
            className="h-10 w-10 rounded-full object-cover border-2 border-white/30 shadow-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg">{levelName}</h1>
              <span className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                {gender === "F" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {gender === "F" ? "Femme" : "Homme"}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", levelTemplate.isActive !== false ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50")}>
                {levelTemplate.isActive !== false ? "Actif" : "Inactif"}
              </span>
            </div>
            <p className="text-white/80 text-xs font-medium mt-0.5">
              Nom client : {clientDisplayName}
            </p>
            {levelTemplate.description ? (
              <p className="text-white/50 text-xs mt-0.5">{String(levelTemplate.description)}</p>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {lastSaved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-white/60">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {anyDirty && (
              <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Non sauvegardé
              </span>
            )}
            <Button
              size="sm"
              className="bg-white text-gray-900 hover:bg-white/90 font-semibold"
              onClick={tab === "info" ? handleSaveInfo : handleSaveWeeks}
              disabled={tab === "planner" ? !canSave || saving : infoSaving || !infoDirty}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving || infoSaving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative z-10 flex gap-1 px-6 pb-0">
          {[
            { key: "planner" as const, label: "Planning 5 semaines", icon: Calendar },
            { key: "info" as const, label: "Informations", icon: Info },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
                tab === key
                  ? "bg-background text-foreground"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-6">
        {/* INFO TAB */}
        {tab === "info" && (
          <div className="mx-auto max-w-3xl space-y-5">
            <AdminFormErrorSummary errors={infoErrors} />
            <AdminFormSection title="Informations générales" description="Modifiez l’identité et la visibilité du plan. Le niveau et le sexe restent liés au plan existant." icon={<Info className="h-5 w-5" aria-hidden="true" />}>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-plan-name" className="font-semibold">Nom interne du plan *</Label>
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Visible uniquement par l'équipe</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Visible uniquement par les coachs et les administrateurs.</p>
                  <Input id="edit-plan-name" value={editName} onChange={(event) => setEditName(event.target.value)} className="h-11 bg-card" aria-invalid={infoErrors.some((error) => error.field === "edit-plan-name")} />
                  {infoErrors.some((error) => error.field === "edit-plan-name") && (
                    <p className="text-sm text-destructive font-medium">Le nom interne du plan est obligatoire.</p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-plan-client-name" className="font-semibold">Nom affiché au client *</Label>
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">Visible application & espaces clients</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Nom propre et compréhensible affiché dans l’application mobile et les espaces clients.</p>
                  <Input id="edit-plan-client-name" value={editClientDisplayName} onChange={(event) => setEditClientDisplayName(event.target.value)} className="h-11 bg-card" aria-invalid={infoErrors.some((error) => error.field === "edit-plan-client-name")} />
                  {infoErrors.some((error) => error.field === "edit-plan-client-name") && (
                    <p className="text-sm text-destructive font-medium">Veuillez saisir le nom affiché au client.</p>
                  )}
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-1" aria-live="polite">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Aperçu dans l’application</p>
                  <p className="text-base font-bold text-foreground">
                    {editClientDisplayName.trim() || editName.trim() || "Programme Initiate — Fondations"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plan-description">Description</Label>
                  <Textarea id="edit-plan-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Décrivez l’objectif, le public cible et la structure du plan." className="min-h-28 bg-card" />
                </div>

                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <input type="checkbox" checked={editIsActive} onChange={(event) => setEditIsActive(event.target.checked)} className="h-4 w-4 accent-primary" />
                  Plan actif et disponible à l’affectation
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Sexe / dossier</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{gender === "F" ? "Femme" : "Homme"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Durée du planning</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{weeks.length || 5} semaines</p>
                  </div>
                </div>
              </div>
            </AdminFormSection>
            <Button onClick={handleSaveInfo} className="h-11 w-full" disabled={infoSaving || !infoDirty}>
              <Save className="h-4 w-4 mr-2" />
              {infoSaving ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
          </div>
        )}

        {/* PLANNER TAB */}
        {tab === "planner" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Rechercher des séances…"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="h-8 text-sm w-56"
                />
                <p className="text-sm text-muted-foreground">
                  {weeks.reduce((s, w) => s + countWeekSessions(w), 0)} séances planifiées
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {weeks.map((w, wi) => (
                  <Button key={w.weekNumber} variant="outline" size="sm" onClick={() => setResetWeekIndex(wi)} className="text-xs h-9 px-2 text-muted-foreground hover:text-destructive">
                    <RotateCcw className="h-3 w-3 mr-1" />S{w.weekNumber}
                  </Button>
                ))}
              </div>
            </div>

            <WeekPlanner
              weeks={weeks}
              onChange={setWeeks}
              sessionTemplateById={sessionTemplateById}
              librarySessions={sessionTemplates}
            />

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveWeeks} disabled={!canSave || saving} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Sauvegarde en cours…" : "Sauvegarder le planning"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal open={resetWeekIndex !== null} onOpenChange={(open) => { if (!open) setResetWeekIndex(null); }} title="Réinitialiser cette semaine ?" description={resetWeekIndex !== null ? `Toutes les séances de la semaine ${weeks[resetWeekIndex]?.weekNumber ?? resetWeekIndex + 1} seront retirées du planning. Les autres semaines resteront intactes.` : undefined} confirmLabel="Réinitialiser la semaine" cancelLabel="Continuer la modification" variant="destructive" onConfirm={() => { if (resetWeekIndex !== null) handleResetWeek(resetWeekIndex); }} />
      <ConfirmModal open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen} title="Abandonner les modifications ?" description="Les informations et changements de planning non enregistrés seront perdus." confirmLabel="Abandonner" cancelLabel="Continuer la modification" variant="destructive" onConfirm={() => router.push("/admin/level-templates")} />
    </div>
  );
}
