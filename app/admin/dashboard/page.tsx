"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import {
  Users,
  UserPlus,
  AlertTriangle,
  Clock,
  Activity,
  RefreshCw,
  TrendingUp,
  Inbox,
  UserX,
  Dumbbell,
  Salad,
  ShoppingCart,
  CheckCircle2,
  ChevronRight,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FadeContent from "@/components/FadeContent";
import { AnimatedText } from "@/components/dashboard/AnimatedText";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PeriodFilter, PERIODS, type PeriodValue } from "@/components/dashboard/PeriodFilter";
import { DashTable, type DashColumn } from "@/components/dashboard/DashTable";
import { PlanDistribution, StatusDonut, SubscriptionActions, SubscriptionsOverTime } from "@/components/dashboard/DashCharts";

interface SubscriptionRow {
  _id: string;
  userId?: { _id?: string; name?: string; email?: string };
  levelTemplateId?: { name?: string };
  endAt: string;
}

interface DashboardStats {
  usersTotal: number;
  usersNewByRange: number;
  activeSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  expiringSoonCount: number;
  levelsDistribution: { levelTemplateId: string; levelName: string; count: number }[];
  subscriptionActionsCount: { renew?: number; change_level?: number; cancel?: number; assign?: number };
  templatesCounts: { exercisesCount: number; sessionTemplatesCount: number; levelTemplatesCount: number };
  expiringSoonList: SubscriptionRow[];
  recentlyExpiredList: SubscriptionRow[];
}

interface ChartData {
  activeVsExpiredOverTime: { date: string; active: number; expired: number }[];
  distributionByLevel: { levelTemplateId?: string; levelName: string; count: number }[];
}

interface PlanFromDb {
  _id: string;
  name: string;
}

interface InactiveItem {
  _id: string;
  userId?: { _id?: string; name?: string };
  levelTemplateId?: { name?: string };
  lastWorkoutDate?: string;
}

const nameOf = (u?: { name?: string }) => (typeof u === "object" && u?.name ? u.name : "—");
const planOf = (l?: { name?: string }) => (typeof l === "object" && l?.name ? l.name : "—");
const daysLeftOf = (endAt?: string) => (endAt ? Math.ceil((new Date(endAt).getTime() - Date.now()) / 86400000) : null);

/** Client-side CSV export (";" separator + BOM so Excel opens accents correctly). */
function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="m-0 mb-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
      <AnimatedText text={children} />
    </h2>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [range, setRange] = useState<PeriodValue>("30d");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inactiveList, setInactiveList] = useState<InactiveItem[]>([]);
  const [renewModal, setRenewModal] = useState<{ subIds: string[]; userName: string } | null>(null);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);
  const [changeLevelModal, setChangeLevelModal] = useState<{
    subId: string; userName: string; currentLevel: string;
  } | null>(null);
  const [changeLevelId, setChangeLevelId] = useState("");
  const [changeLevelLoading, setChangeLevelLoading] = useState(false);
  const [levelTemplatesList, setLevelTemplatesList] = useState<{ _id: string; name: string }[]>([]);
  const [plansFromDb, setPlansFromDb] = useState<PlanFromDb[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statsData, chartsData, inactiveData, templatesRes] = await Promise.all([
        api.getDashboardStats({ range }),
        api.getDashboardCharts({ range }),
        api.getDashboardInactive({ days: 7 }).catch(() => ({ inactive: [] })),
        api.getLevelTemplates({ limit: 100 }).catch(() => ({ levelTemplates: [] as PlanFromDb[] })),
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setInactiveList(inactiveData.inactive || []);
      const raw = (templatesRes as { levelTemplates?: PlanFromDb[] }).levelTemplates || [];
      setPlansFromDb(
        raw
          .map((t) => ({ _id: String(t._id), name: String(t.name ?? "—") }))
          .filter((t) => t._id)
      );
    } catch (e) {
      console.error(e);
      setLoadError("Impossible de charger les données du tableau de bord.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (renewModal) setRenewEndDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  }, [renewModal]);

  useEffect(() => {
    if (changeLevelModal) {
      api.getLevelTemplates({ limit: 100 }).then((data: { levelTemplates?: { _id: string; name: string }[] }) => {
        setLevelTemplatesList(data.levelTemplates || []);
      });
      setChangeLevelId("");
    }
  }, [changeLevelModal]);

  const handleRenew = async () => {
    if (!renewModal || !renewEndDate) return;
    setRenewLoading(true);
    try {
      const results = await Promise.allSettled(
        renewModal.subIds.map((id) => api.renewSubscription(id, { newEndAt: renewEndDate + "T23:59:59.999Z" }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) {
        console.error(results);
        toast(`${renewModal.subIds.length - failed} renouvelé(s), ${failed} en échec`, "error");
      } else {
        toast(renewModal.subIds.length > 1 ? `${renewModal.subIds.length} abonnements renouvelés ✓` : "Abonnement renouvelé ✓", "success");
      }
      setRenewModal(null);
      loadAll();
    } catch (e) { console.error(e); }
    finally { setRenewLoading(false); }
  };

  const handleChangeLevel = async () => {
    if (!changeLevelModal || !changeLevelId) return;
    setChangeLevelLoading(true);
    try {
      await api.changeSubscriptionLevel(changeLevelModal.subId, { newLevelTemplateId: changeLevelId, keepDates: true });
      setChangeLevelModal(null);
      loadAll();
    } catch (e) { console.error(e); }
    finally { setChangeLevelLoading(false); }
  };

  const isEmpty = stats && stats.usersTotal === 0 && (stats.templatesCounts?.levelTemplatesCount ?? 0) === 0;
  const periodLabel = PERIODS.find((p) => p.value === range)?.label ?? "";

  const planIdSet = useMemo(() => new Set(plansFromDb.map((p) => p._id)), [plansFromDb]);

  const planNameById = useMemo(() => {
    const m = new Map<string, string>();
    plansFromDb.forEach((p) => m.set(p._id, p.name));
    return m;
  }, [plansFromDb]);

  /** Active subs par plan : uniquement les plans encore présents en base (ignore abonnements orphelins / anciens). */
  const distributionByLevelFromDb = useMemo(() => {
    if (!charts?.distributionByLevel?.length) return [];
    return charts.distributionByLevel
      .filter((row) => {
        const id = row.levelTemplateId != null ? String(row.levelTemplateId) : "";
        return id && planIdSet.has(id);
      })
      .map((row) => {
        const id = String(row.levelTemplateId);
        return {
          levelName: planNameById.get(id) ?? row.levelName,
          count: row.count,
        };
      });
  }, [charts, planIdSet, planNameById]);

  const planSubscriberCount = useMemo(() => {
    const m = new Map<string, number>();
    stats?.levelsDistribution?.forEach((row) => {
      const id = String(row.levelTemplateId);
      if (planIdSet.has(id)) m.set(id, row.count);
    });
    return m;
  }, [stats?.levelsDistribution, planIdSet]);

  /** Real trend only: change of active subscriptions between the first and last day of the chosen period. */
  const activeTrend = useMemo(() => {
    const series = charts?.activeVsExpiredOverTime;
    if (!series || series.length < 2) return undefined;
    return { delta: series[series.length - 1].active - series[0].active, label: "depuis le début de la période" };
  }, [charts]);

  // Build alerts list
  const alerts: { icon: React.ReactNode; label: string; count: number; href: string }[] = [];
  if (stats) {
    if (stats.expiringSoonCount > 0)
      alerts.push({ icon: <Clock className="h-4 w-4" />, label: "abonnements expirent dans 7 jours", count: stats.expiringSoonCount, href: "/admin/subscriptions?expiringSoon=1" });
    if (inactiveList.length > 0)
      alerts.push({ icon: <UserX className="h-4 w-4" />, label: "clients inactifs depuis 7 jours", count: inactiveList.length, href: "/admin/clients?segment=inactive" });
    if (stats.expiredSubscriptionsCount > 0)
      alerts.push({ icon: <AlertTriangle className="h-4 w-4" />, label: "abonnements expirés", count: stats.expiredSubscriptionsCount, href: "/admin/subscriptions?status=EXPIRED" });
  }

  /* ── tables ── */
  const expiringColumns: DashColumn<SubscriptionRow>[] = [
    { id: "client", header: "Client", locked: true, sortValue: (s) => nameOf(s.userId), cell: (s) => <span className="font-medium">{nameOf(s.userId)}</span> },
    { id: "plan", header: "Plan", sortValue: (s) => planOf(s.levelTemplateId), cell: (s) => <span className="text-muted-foreground">{planOf(s.levelTemplateId)}</span> },
    {
      id: "end",
      header: "Fin",
      sortValue: (s) => daysLeftOf(s.endAt),
      cell: (s) => {
        const d = daysLeftOf(s.endAt);
        return d === null ? "—" : (
          <Badge variant={d <= 2 ? "destructive" : "outline"} className="num text-xs">
            {d <= 0 ? "Aujourd'hui" : `J-${d}`}
          </Badge>
        );
      },
    },
    {
      id: "action",
      header: "Action",
      align: "right",
      locked: true,
      cell: (s) => (
        <Button size="sm" variant="outline" onClick={() => setRenewModal({ subIds: [s._id], userName: nameOf(s.userId) })}>
          Renouveler
        </Button>
      ),
    },
  ];

  const inactiveColumns: DashColumn<InactiveItem>[] = [
    { id: "client", header: "Client", locked: true, sortValue: (s) => nameOf(s.userId), cell: (s) => <span className="font-medium">{nameOf(s.userId)}</span> },
    { id: "plan", header: "Plan", sortValue: (s) => planOf(s.levelTemplateId), cell: (s) => <span className="text-muted-foreground">{planOf(s.levelTemplateId)}</span> },
    {
      id: "last",
      header: "Dernière séance",
      sortValue: (s) => (s.lastWorkoutDate ? new Date(s.lastWorkoutDate).getTime() : 0),
      cell: (s) =>
        s.lastWorkoutDate ? (
          <span className="num text-muted-foreground">{format(new Date(s.lastWorkoutDate), "dd/MM/yy")}</span>
        ) : (
          <span className="text-destructive">Jamais</span>
        ),
    },
    {
      id: "action",
      header: "Action",
      align: "right",
      locked: true,
      cell: (s) => (
        <Button size="sm" variant="outline" onClick={() => router.push(`/admin/clients/${s.userId?._id}`)}>
          Profil
        </Button>
      ),
    },
  ];

  const tableCard = "flex flex-col rounded-xl border border-border bg-card py-4 shadow-[var(--shadow-card)]";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-3xl font-semibold tracking-tight sm:text-[34px]" aria-label="Tableau de bord">
            <AnimatedText text="Tableau de bord" trigger="load" delay={70} />
          </h1>
          <div className="mt-1.5 text-sm text-muted-foreground">
            <AnimatedText text="Vue coach — alertes, activité et statistiques" trigger="load" delay={25} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter value={range} onChange={setRange} disabled={loading} />
          <Button variant="outline" size="icon" onClick={loadAll} disabled={loading} aria-label="Actualiser" title="Actualiser" className="h-9 w-9">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-[var(--trend-down-bg)] px-4 py-3 text-sm text-[var(--trend-down)]">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={loadAll}>Réessayer</Button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <AnimatedText text={fr.empty.noDataYet} className="mb-4 justify-center text-muted-foreground" />
          <Button onClick={() => router.push("/admin/level-templates")}>{fr.buttons.createFirstTemplate}</Button>
          <p className="mt-3 text-xs text-muted-foreground">{fr.empty.createFirstOrSeed} <code className="rounded bg-muted px-1.5 py-0.5">npm run seed:all</code></p>
        </div>
      )}

      {/* ── KPIs ── */}
      {!isEmpty && (
        <section aria-label="Indicateurs clés">
          <SectionTitle>Vue d&apos;ensemble</SectionTitle>
          {loading && !stats ? (
            <div className="grid gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[132px] animate-pulse rounded-xl border border-border bg-muted/60" />
              ))}
            </div>
          ) : stats ? (
            <FadeContent trigger="mount" duration={600} stagger={70} className="grid gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <KpiCard
                label="Clients actifs"
                value={stats.activeSubscriptionsCount}
                icon={<Users className="h-4 w-4" />}
                hint={`sur ${stats.usersTotal} clients au total`}
                trend={activeTrend}
              />
              <KpiCard
                label="Nouveaux clients"
                value={stats.usersNewByRange}
                icon={<UserPlus className="h-4 w-4" />}
                hint={`sur ${periodLabel.toLowerCase()}`}
              />
              <KpiCard
                label="Expirent ≤ 7 jours"
                value={stats.expiringSoonCount}
                icon={<Clock className="h-4 w-4" />}
                highlight={stats.expiringSoonCount > 0}
                hint="à renouveler"
                onClick={() => router.push("/admin/subscriptions?expiringSoon=1")}
                actionLabel="Voir"
              />
              <KpiCard
                label="Abonnements expirés"
                value={stats.expiredSubscriptionsCount}
                icon={<Inbox className="h-4 w-4" />}
                hint="à relancer"
                onClick={() => router.push("/admin/subscriptions?status=EXPIRED")}
                actionLabel="Renouveler"
              />
              <KpiCard
                label="Inactifs 7 jours"
                value={inactiveList.length}
                icon={<UserX className="h-4 w-4" />}
                hint="sans séance récente"
                onClick={() => router.push("/admin/clients?segment=inactive")}
                actionLabel="Voir"
              />
            </FadeContent>
          ) : null}
        </section>
      )}

      {/* ── Alertes ── */}
      {!isEmpty && (
        <section aria-label="Alertes">
          <SectionTitle>Alertes</SectionTitle>
          {loading && !stats ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-[var(--trend-up)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Tout est bon — aucune alerte pour le moment</span>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((a) => (
                <button
                  key={a.href}
                  onClick={() => router.push(a.href)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-[var(--shadow-card)] transition-[border-color,transform] duration-150 hover:border-foreground/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">{a.icon}</span>
                  <span className="flex-1 text-sm">
                    <span className="num mr-1.5 text-xl font-semibold">{a.count}</span>
                    <span className="text-muted-foreground">{a.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Actions rapides ── */}
      {!isEmpty && (
        <section aria-label="Actions rapides">
          <SectionTitle>Actions rapides</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => router.push("/admin/clients")}>
              <Users className="mr-2 h-4 w-4" />Mes clients
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/assignments")}>
              {fr.buttons.openAssignmentsBoard}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/subscriptions?expiringSoon=1")}>
              <Clock className="mr-2 h-4 w-4" />{fr.buttons.viewExpiringSoon}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/session-templates/new")}>
              <Dumbbell className="mr-2 h-4 w-4" />Nouvelle séance
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/recipes")}>
              <Salad className="mr-2 h-4 w-4" />Recettes
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")}>
              <ShoppingCart className="mr-2 h-4 w-4" />Commandes
            </Button>
          </div>
        </section>
      )}

      {/* ── Statistiques ── */}
      {!isEmpty && (
        <section aria-label="Statistiques">
          <SectionTitle>Statistiques</SectionTitle>
          {loading && !charts ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-[330px] animate-pulse rounded-xl border border-border bg-muted/60" />)}
            </div>
          ) : charts && stats ? (
            <FadeContent duration={600} stagger={90} className="grid gap-4 lg:grid-cols-2">
              <SubscriptionsOverTime data={charts.activeVsExpiredOverTime} />
              <StatusDonut active={stats.activeSubscriptionsCount} expired={stats.expiredSubscriptionsCount} />
              <PlanDistribution data={distributionByLevelFromDb} />
              <SubscriptionActions counts={stats.subscriptionActionsCount ?? {}} />
            </FadeContent>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
              <TrendingUp className="h-6 w-6" aria-hidden />
              <AnimatedText text={fr.empty.chartsUnavailable} className="justify-center text-sm font-medium text-foreground" />
              <AnimatedText text={fr.empty.chartsUnavailableDesc} className="justify-center text-[13px]" />
            </div>
          )}
        </section>
      )}

      {/* ── Tables : expirent bientôt + inactifs ── */}
      {!isEmpty && (
        <FadeContent duration={600} stagger={90} className="grid gap-4 xl:grid-cols-2">
          <section className={tableCard} aria-label={fr.dashboard.expiringSoonTitle}>
            <header className="mb-3 flex items-center justify-between gap-2 px-4">
              <h3 className="m-0 text-sm font-semibold"><AnimatedText text={fr.dashboard.expiringSoonTitle} /></h3>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/subscriptions?expiringSoon=1")}>
                {fr.buttons.viewAll}
              </Button>
            </header>
            <DashTable
              ariaLabel={fr.dashboard.expiringSoonTitle}
              columns={expiringColumns}
              rows={stats?.expiringSoonList ?? []}
              getId={(s) => s._id}
              loading={loading && !stats}
              error={loadError && !stats ? loadError : null}
              onRetry={loadAll}
              bulkActions={[
                {
                  label: "Renouveler",
                  icon: <RefreshCw className="h-3 w-3" />,
                  onClick: (rows) => setRenewModal({ subIds: rows.map((r) => r._id), userName: rows.length === 1 ? nameOf(rows[0].userId) : `${rows.length} clients` }),
                },
                {
                  label: "Exporter CSV",
                  icon: <Download className="h-3 w-3" />,
                  onClick: (rows) =>
                    downloadCsv("abonnements-a-renouveler.csv", ["Client", "Plan", "Fin"], rows.map((r) => [nameOf(r.userId), planOf(r.levelTemplateId), r.endAt ? format(new Date(r.endAt), "dd/MM/yyyy") : ""])),
                },
              ]}
              emptyTitle={fr.empty.noSubscriptionsExpiringSoon}
              emptyDescription={fr.empty.allGoodForNow}
              emptyIcon={<CheckCircle2 />}
            />
          </section>

          <section className={tableCard} aria-label={fr.dashboard.inactiveTitle}>
            <header className="mb-3 flex items-center justify-between gap-2 px-4">
              <h3 className="m-0 text-sm font-semibold"><AnimatedText text={fr.dashboard.inactiveTitle} /></h3>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clients?segment=inactive")}>
                {fr.buttons.viewAll}
              </Button>
            </header>
            <DashTable
              ariaLabel={fr.dashboard.inactiveTitle}
              columns={inactiveColumns}
              rows={inactiveList}
              getId={(s) => s._id}
              loading={loading && !stats}
              error={loadError && !stats ? loadError : null}
              onRetry={loadAll}
              bulkActions={[
                {
                  label: "Exporter CSV",
                  icon: <Download className="h-3 w-3" />,
                  onClick: (rows) =>
                    downloadCsv("clients-inactifs.csv", ["Client", "Plan", "Dernière séance"], rows.map((r) => [nameOf(r.userId), planOf(r.levelTemplateId), r.lastWorkoutDate ? format(new Date(r.lastWorkoutDate), "dd/MM/yyyy") : "Jamais"])),
                },
              ]}
              emptyTitle={fr.empty.noInactiveClients}
              emptyDescription={fr.empty.allActiveTrained}
              emptyIcon={<Activity />}
            />
          </section>
        </FadeContent>
      )}

      {/* ── Plans (base de données uniquement) ── */}
      {!isEmpty && (
        <section aria-label="Plans">
          <SectionTitle>Plans</SectionTitle>
          {loading && !stats ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl border border-border bg-muted" />)}
            </div>
          ) : plansFromDb.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun plan en base. Créez-en depuis{" "}
              <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => router.push("/admin/level-templates")}>
                Plans
              </button>
              .
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {plansFromDb.map((p) => {
                const n = planSubscriberCount.get(p._id) ?? 0;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => router.push(`/admin/level-templates/${p._id}`)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-[var(--shadow-card)] transition-[border-color,transform] duration-150 hover:border-foreground/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <Badge variant="secondary" className="num shrink-0">
                      {n} actif{n !== 1 ? "s" : ""}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Renew modal */}
      <Dialog open={!!renewModal} onOpenChange={(o) => !o && setRenewModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr.dashboard.renewSubscription}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {fr.dashboard.renewSubscriptionDesc.replace("{name}", renewModal?.userName ?? "")}
            </p>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="renew-end">{fr.dashboard.newEndDate}</Label>
              <input
                id="renew-end"
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewModal(null)}>{fr.buttons.cancel}</Button>
            <Button onClick={handleRenew} disabled={renewLoading}>
              {renewLoading ? fr.status.savingShort : fr.buttons.renew}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change level modal */}
      <Dialog open={!!changeLevelModal} onOpenChange={(o) => !o && setChangeLevelModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr.dashboard.upgradeDowngrade}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {fr.dashboard.upgradeDowngradeDesc.replace("{name}", changeLevelModal?.userName ?? "").replace("{current}", changeLevelModal?.currentLevel ?? "")}
            </p>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="level-select">{fr.dashboard.selectLevel}</Label>
              <select
                id="level-select"
                value={changeLevelId}
                onChange={(e) => setChangeLevelId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">{fr.dashboard.selectLevel}</option>
                {levelTemplatesList.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeLevelModal(null)}>{fr.buttons.cancel}</Button>
            <Button onClick={handleChangeLevel} disabled={changeLevelLoading || !changeLevelId}>
              {changeLevelLoading ? fr.status.savingShort : fr.buttons.changeLevel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
