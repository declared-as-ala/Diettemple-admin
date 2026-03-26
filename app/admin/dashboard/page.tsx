"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { fr } from "@/lib/i18n/fr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CreditCard,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardStats {
  usersTotal: number;
  usersNewByRange: number;
  activeSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  expiringSoonCount: number;
  levelsDistribution: { levelTemplateId: string; levelName: string; count: number }[];
  subscriptionActionsCount: { renew?: number; change_level?: number; cancel?: number; assign?: number };
  templatesCounts: { exercisesCount: number; sessionTemplatesCount: number; levelTemplatesCount: number };
  expiringSoonList: Array<{
    _id: string;
    userId?: { _id?: string; name?: string; email?: string };
    levelTemplateId?: { name?: string };
    endAt: string;
  }>;
  recentlyExpiredList: Array<{
    _id: string;
    userId?: { _id?: string; name?: string; email?: string };
    levelTemplateId?: { name?: string };
    endAt: string;
  }>;
}

interface ChartData {
  activeVsExpiredOverTime: { date: string; active: number; expired: number }[];
  distributionByLevel: { levelName: string; count: number }[];
}

interface InactiveItem {
  _id: string;
  userId?: { _id?: string; name?: string };
  levelTemplateId?: { name?: string };
  lastWorkoutDate?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [inactiveList, setInactiveList] = useState<InactiveItem[]>([]);
  const [renewModal, setRenewModal] = useState<{ subId: string; userName: string } | null>(null);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);
  const [changeLevelModal, setChangeLevelModal] = useState<{
    subId: string; userName: string; currentLevel: string;
  } | null>(null);
  const [changeLevelId, setChangeLevelId] = useState("");
  const [changeLevelLoading, setChangeLevelLoading] = useState(false);
  const [levelTemplatesList, setLevelTemplatesList] = useState<{ _id: string; name: string }[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setChartsLoading(true);
    try {
      const [statsData, chartsData, inactiveData] = await Promise.all([
        api.getDashboardStats({ range: "30d" }),
        api.getDashboardCharts({ range: "30d" }),
        api.getDashboardInactive({ days: 7 }).catch(() => ({ inactive: [] })),
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setInactiveList(inactiveData.inactive || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setChartsLoading(false);
    }
  }, []);

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
      await api.renewSubscription(renewModal.subId, { newEndAt: renewEndDate + "T23:59:59.999Z" });
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

  // Build alerts list
  const alerts: { icon: React.ReactNode; label: string; count: number; color: string; href: string }[] = [];
  if (stats) {
    if (stats.expiringSoonCount > 0)
      alerts.push({ icon: <Clock className="h-4 w-4" />, label: "abonnements expirent dans 7 jours", count: stats.expiringSoonCount, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", href: "/admin/subscriptions?expiringSoon=1" });
    if (inactiveList.length > 0)
      alerts.push({ icon: <UserX className="h-4 w-4" />, label: "clients inactifs depuis 7 jours", count: inactiveList.length, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", href: "/admin/clients?segment=inactive" });
    if (stats.expiredSubscriptionsCount > 0)
      alerts.push({ icon: <AlertTriangle className="h-4 w-4" />, label: "abonnements expirés", count: stats.expiredSubscriptionsCount, color: "text-red-500 bg-red-500/10 border-red-500/20", href: "/admin/subscriptions?status=EXPIRED" });
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue coach — alertes, activité et statistiques"
        actions={
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        }
      />

      {/* Empty state */}
      {isEmpty && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">{fr.empty.noDataYet}</p>
            <Button onClick={() => router.push("/admin/level-templates")}>{fr.buttons.createFirstTemplate}</Button>
            <p className="text-xs text-muted-foreground mt-3">{fr.empty.createFirstOrSeed} <code className="bg-muted px-1.5 py-0.5 rounded">npm run seed:all</code></p>
          </CardContent>
        </Card>
      )}

      {/* ── ALERTES COACH ── */}
      {!isEmpty && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alertes</h2>
          {loading ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Tout est bon — aucune alerte pour le moment</span>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => router.push(a.href)}
                  className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-opacity hover:opacity-80", a.color)}
                >
                  <span className="flex-shrink-0">{a.icon}</span>
                  <span className="text-sm font-semibold flex-1">
                    <span className="text-xl font-bold mr-1.5">{a.count}</span>
                    {a.label}
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ── */}
      {!isEmpty && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vue d'ensemble</h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => (
                <Card key={i} className="bg-card border-border">
                  <CardHeader className="pb-2"><div className="h-4 w-24 rounded bg-muted animate-pulse" /></CardHeader>
                  <CardContent><div className="h-8 w-16 rounded bg-muted animate-pulse" /></CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clients actifs</CardTitle>
                  <Users className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.activeSubscriptionsCount}</p>
                  <p className="text-xs text-muted-foreground">sur {stats.usersTotal} au total</p>
                </CardContent>
              </Card>
              <Card className={cn("border", stats.expiringSoonCount > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-card border-border")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Expirent ≤ 7 jours</CardTitle>
                  <Clock className={cn("h-4 w-4", stats.expiringSoonCount > 0 ? "text-amber-500" : "text-muted-foreground")} />
                </CardHeader>
                <CardContent>
                  <p className={cn("text-2xl font-bold", stats.expiringSoonCount > 0 && "text-amber-500")}>{stats.expiringSoonCount}</p>
                  <button onClick={() => router.push("/admin/subscriptions?expiringSoon=1")} className="text-xs text-muted-foreground hover:underline">
                    Voir les abonnements →
                  </button>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Abonnements expirés</CardTitle>
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.expiredSubscriptionsCount}</p>
                  <button onClick={() => router.push("/admin/subscriptions?status=EXPIRED")} className="text-xs text-muted-foreground hover:underline">
                    Voir et renouveler →
                  </button>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Inactifs 7 jours</CardTitle>
                  <UserX className={cn("h-4 w-4", inactiveList.length > 0 ? "text-blue-500" : "text-muted-foreground")} />
                </CardHeader>
                <CardContent>
                  <p className={cn("text-2xl font-bold", inactiveList.length > 0 && "text-blue-500")}>{inactiveList.length}</p>
                  <button onClick={() => router.push("/admin/clients?segment=inactive")} className="text-xs text-muted-foreground hover:underline">
                    Voir les clients →
                  </button>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}

      {/* ── ACTIONS RAPIDES ── */}
      {!isEmpty && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions rapides</h2>
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
        </div>
      )}

      {/* ── CHARTS (2 max) ── */}
      {!isEmpty && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Statistiques</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {chartsLoading ? (
              <>
                <ChartCard title="Abonnements dans le temps" description="Actifs vs expirés par jour">
                  <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">{fr.status.loading}</div>
                </ChartCard>
                <ChartCard title="Répartition par plan" description="Clients actifs par plan d'entraînement">
                  <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">{fr.status.loading}</div>
                </ChartCard>
              </>
            ) : charts ? (
              <>
                <ChartCard title="Abonnements dans le temps" description="Actifs vs expirés (30 derniers jours)">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={charts.activeVsExpiredOverTime}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Legend />
                        <Area type="monotone" dataKey="active" stackId="1" stroke="oklch(0.6 0.2 145)" fill="oklch(0.6 0.2 145 / 0.4)" name="Actifs" />
                        <Area type="monotone" dataKey="expired" stackId="1" stroke="oklch(0.55 0.2 25)" fill="oklch(0.55 0.2 25 / 0.4)" name="Expirés" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
                <ChartCard title="Répartition par plan" description="Clients actifs par plan d'entraînement">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.distributionByLevel} layout="vertical" margin={{ left: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="levelName" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={70} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Clients" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </>
            ) : (
              <EmptyState title={fr.empty.chartsUnavailable} description={fr.empty.chartsUnavailableDesc} icon={<TrendingUp />} />
            )}
          </div>
        </div>
      )}

      {/* ── TABLES : Expirent bientôt + Inactifs ── */}
      {!isEmpty && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Expirent bientôt */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{fr.dashboard.expiringSoonTitle}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/subscriptions?expiringSoon=1")}>
                {fr.buttons.viewAll}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <SkeletonTable rows={4} cols={3} /> : stats?.expiringSoonList?.length ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-medium">Client</th>
                        <th className="text-left p-3 font-medium">Plan</th>
                        <th className="text-left p-3 font-medium">Fin</th>
                        <th className="text-right p-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.expiringSoonList.slice(0, 6).map((s) => {
                        const name = typeof s.userId === "object" && s.userId?.name ? s.userId.name : "—";
                        const level = typeof s.levelTemplateId === "object" && s.levelTemplateId?.name ? s.levelTemplateId.name : "—";
                        const daysLeft = s.endAt ? Math.ceil((new Date(s.endAt).getTime() - Date.now()) / 86400000) : null;
                        return (
                          <tr key={s._id} className="border-t border-border hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-medium">{name}</td>
                            <td className="p-3 text-muted-foreground">{level}</td>
                            <td className="p-3">
                              {daysLeft !== null ? (
                                <Badge variant={daysLeft <= 2 ? "destructive" : "outline"} className="text-xs">
                                  {daysLeft <= 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                                </Badge>
                              ) : "—"}
                            </td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="outline" onClick={() => setRenewModal({ subId: s._id, userName: name })}>
                                Renouveler
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title={fr.empty.noSubscriptionsExpiringSoon} description={fr.empty.allGoodForNow} icon={<CheckCircle2 />} />
              )}
            </CardContent>
          </Card>

          {/* Clients inactifs */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{fr.dashboard.inactiveTitle}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clients?segment=inactive")}>
                {fr.buttons.viewAll}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <SkeletonTable rows={4} cols={3} /> : inactiveList.length ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-medium">Client</th>
                        <th className="text-left p-3 font-medium">Plan</th>
                        <th className="text-left p-3 font-medium">Dernière séance</th>
                        <th className="text-right p-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inactiveList.slice(0, 6).map((s) => {
                        const name = typeof s.userId === "object" && s.userId?.name ? s.userId.name : "—";
                        const level = typeof s.levelTemplateId === "object" && s.levelTemplateId?.name ? s.levelTemplateId.name : "—";
                        return (
                          <tr key={s._id} className="border-t border-border hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-medium">{name}</td>
                            <td className="p-3 text-muted-foreground">{level}</td>
                            <td className="p-3 text-muted-foreground">
                              {s.lastWorkoutDate ? format(new Date(s.lastWorkoutDate), "dd/MM/yy") : <span className="text-red-500">Jamais</span>}
                            </td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="outline" onClick={() => router.push(`/admin/clients/${(s.userId as any)?._id}`)}>
                                Profil
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title={fr.empty.noInactiveClients} description={fr.empty.allActiveTrained} icon={<Activity />} />
              )}
            </CardContent>
          </Card>
        </div>
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
          <div className="grid gap-4 py-4">
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
          </div>
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
          <div className="grid gap-4 py-4">
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
          </div>
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
