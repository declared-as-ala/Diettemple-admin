"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { fr } from "@/lib/i18n/fr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { DateRangeTabs, type DateRange } from "@/components/shared/DateRangeTabs";
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
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  CreditCard,
  AlertTriangle,
  Calendar,
  LayoutTemplate,
  Activity,
  RefreshCw,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";

interface DashboardStats {
  usersTotal: number;
  usersNewByRange: number;
  activeSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  expiringSoonCount: number;
  levelsDistribution: { levelTemplateId: string; levelName: string; count: number }[];
  subscriptionActionsCount: { renew?: number; change_level?: number; cancel?: number; assign?: number };
  templatesCounts: { exercisesCount: number; sessionTemplatesCount: number; levelTemplatesCount: number };
  trainingTemplateUsage: { sessionTemplateId: string; count: number }[];
  expiringSoonList: Array<{
    _id: string;
    userId?: { name?: string; email?: string };
    levelTemplateId?: { name?: string };
    endAt: string;
  }>;
  recentlyExpiredList: Array<{
    _id: string;
    userId?: { name?: string; email?: string };
    levelTemplateId?: { name?: string };
    endAt: string;
  }>;
}

interface ChartData {
  signupsOverTime: { date: string; count: number }[];
  activeVsExpiredOverTime: { date: string; active: number; expired: number }[];
  distributionByLevel: { levelName: string; count: number }[];
  expiringByDay: { day: string; label: string; count: number }[];
  topSessionTemplates: { title: string; count: number }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>("30d");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [renewModal, setRenewModal] = useState<{ subId: string; userName: string } | null>(null);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);
  const [changeLevelModal, setChangeLevelModal] = useState<{
    subId: string;
    userName: string;
    currentLevel: string;
  } | null>(null);
  const [changeLevelId, setChangeLevelId] = useState("");
  const [changeLevelLoading, setChangeLevelLoading] = useState(false);
  const [levelTemplatesList, setLevelTemplatesList] = useState<{ _id: string; name: string }[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [inactiveList, setInactiveList] = useState<
    Array<{
      _id: string;
      userId?: { _id?: string; name?: string };
      levelTemplateId?: { name?: string };
      lastWorkoutDate?: string;
    }>
  >([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats({ range });
      setStats(data);
    } catch (e) {
      console.error(e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const data = await api.getDashboardCharts({ range });
      setCharts(data);
    } catch (e) {
      console.error(e);
      setCharts(null);
    } finally {
      setChartsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const loadInactive = useCallback(async () => {
    setInactiveLoading(true);
    try {
      const data = await api.getDashboardInactive({ days: 7 });
      setInactiveList(data.inactive || []);
    } catch (e) {
      console.error(e);
      setInactiveList([]);
    } finally {
      setInactiveLoading(false);
    }
  }, []);

  const isEmpty = stats && stats.usersTotal === 0 && (stats.templatesCounts?.levelTemplatesCount ?? 0) === 0;

  useEffect(() => {
    if (!isEmpty && stats) loadInactive();
  }, [isEmpty, stats, loadInactive]);

  useEffect(() => {
    if (renewModal) {
      setRenewEndDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    }
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
      loadStats();
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setRenewLoading(false);
    }
  };

  const handleChangeLevel = async () => {
    if (!changeLevelModal || !changeLevelId) return;
    setChangeLevelLoading(true);
    try {
      await api.changeSubscriptionLevel(changeLevelModal.subId, {
        newLevelTemplateId: changeLevelId,
        keepDates: true,
      });
      setChangeLevelModal(null);
      setChangeLevelId("");
      loadStats();
      loadCharts();
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setChangeLevelLoading(false);
    }
  };

  const levelTemplatesForSelect = levelTemplatesList.map((l) => ({
    id: l._id,
    name: l.name,
  }));

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title={fr.dashboard.title}
        subtitle={fr.dashboard.subtitle}
        actions={
          <DateRangeTabs value={range} onChange={setRange} />
        }
      />

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="default" size="sm" onClick={() => router.push("/admin/clients")}>
          <Users className="mr-2 h-4 w-4" />
          {fr.sidebar.clients}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/assignments")}>
          {fr.buttons.openAssignmentsBoard}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/level-templates")}>
          {fr.buttons.createLevelTemplate}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/session-templates/new")}>
          {fr.buttons.createSessionTemplate}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/exercises")}>
          {fr.buttons.addExercise}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/subscriptions?expiringSoon=1")}>
          {fr.buttons.viewExpiringSoon}
        </Button>
      </div>

      {/* Empty state when no data */}
      {isEmpty && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">{fr.empty.noDataYet}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => router.push("/admin/level-templates")}>{fr.buttons.createFirstTemplate}</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{fr.empty.createFirstOrSeed} <code className="bg-muted px-1.5 py-0.5 rounded">npm run seed:all</code> dans le backend.</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards — hide when empty so we don't show a wall of zeros */}
      {!isEmpty && loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isEmpty && stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{fr.dashboard.totalUsers}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.usersTotal}</p>
              <p className="text-xs text-muted-foreground">+{stats.usersNewByRange} {fr.dashboard.inRange}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{fr.dashboard.activeSubs}</CardTitle>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.activeSubscriptionsCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{fr.dashboard.expired}</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.expiredSubscriptionsCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{fr.dashboard.expiringSoon}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.expiringSoonCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{fr.dashboard.templates}</CardTitle>
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                E : {stats.templatesCounts.exercisesCount} · S : {stats.templatesCounts.sessionTemplatesCount} · L :{" "}
                {stats.templatesCounts.levelTemplatesCount}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{fr.dashboard.actionsInRange}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-foreground">
                Renouvel. : {stats.subscriptionActionsCount.renew ?? 0} · Changement :{" "}
                {stats.subscriptionActionsCount.change_level ?? 0} · Annul. :{" "}
                {stats.subscriptionActionsCount.cancel ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts — hide when empty */}
      {!isEmpty && (
      <div className="grid gap-6 md:grid-cols-2">
        {chartsLoading ? (
          <>
            <ChartCard title={fr.dashboard.signups} description={fr.dashboard.signupsDesc}>
              <div className="h-64 flex items-center justify-center text-muted-foreground">{fr.status.loading}</div>
            </ChartCard>
            <ChartCard title={fr.dashboard.activeVsExpired} description={fr.dashboard.activeVsExpiredDesc}>
              <div className="h-64 flex items-center justify-center text-muted-foreground">{fr.status.loading}</div>
            </ChartCard>
          </>
        ) : charts ? (
          <>
            <ChartCard title={fr.dashboard.signupsOverTime} description={fr.dashboard.signupsDesc}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.signupsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title={fr.dashboard.activeVsExpired + " (dans le temps)"} description={fr.dashboard.activeVsExpiredDesc}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.activeVsExpiredOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="active" stackId="1" stroke="oklch(0.6 0.2 145)" fill="oklch(0.6 0.2 145 / 0.5)" name={fr.dashboard.active} />
                    <Area type="monotone" dataKey="expired" stackId="1" stroke="oklch(0.55 0.2 25)" fill="oklch(0.55 0.2 25 / 0.5)" name={fr.dashboard.expiredLabel} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Active subs by level" description="Distribution by level template">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.distributionByLevel} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="levelName" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={fr.dashboard.subs} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Expiring by day (next 7 days)" description="Subscriptions ending per day">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.expiringByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="count" fill="oklch(0.75 0.15 85)" radius={[4, 4, 0, 0]} name={fr.dashboard.expiring} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Top session templates (usage in planning)" description="By placements in level templates" className="md:col-span-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.topSessionTemplates} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="title" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name={fr.dashboard.placements} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </>
        ) : (
          <EmptyState title={fr.empty.chartsUnavailable} description={fr.empty.chartsUnavailableDesc} icon={<TrendingUp />} />
        )}
      </div>
      )}

      {/* Expiring soon & Recently expired tables — hide when empty */}
      {!isEmpty && (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{fr.dashboard.expiringSoonTitle}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/subscriptions?expiringSoon=1")}>
              {fr.buttons.viewAll}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : stats?.expiringSoonList?.length ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.user}</th>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.level}</th>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.ends}</th>
                      <th className="text-right p-3 font-medium text-foreground">{fr.dashboard.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.expiringSoonList.map((s) => (
                      <tr key={s._id} className="border-t border-border">
                        <td className="p-3 text-foreground">
                          {typeof s.userId === "object" && s.userId?.name ? s.userId.name : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {typeof s.levelTemplateId === "object" && s.levelTemplateId?.name
                            ? s.levelTemplateId.name
                            : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">{s.endAt ? format(new Date(s.endAt), "PP") : "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setRenewModal({
                                  subId: s._id,
                                  userName:
                                    (typeof s.userId === "object" && s.userId?.name) || fr.dashboard.user,
                                })
                              }
                            >
                              {fr.buttons.renew}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setChangeLevelModal({
                                  subId: s._id,
                                  userName: (typeof s.userId === "object" && s.userId?.name) || fr.dashboard.user,
                                  currentLevel:
                                    (typeof s.levelTemplateId === "object" && s.levelTemplateId?.name) || "",
                                })
                              }
                            >
                              {fr.buttons.changeLevel}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title={fr.empty.noSubscriptionsExpiringSoon} description={fr.empty.allGoodForNow} icon={<Calendar />} />
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{fr.dashboard.recentlyExpiredTitle}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/subscriptions?status=EXPIRED")}>
              {fr.buttons.viewAll}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : stats?.recentlyExpiredList?.length ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.user}</th>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.level}</th>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.ended}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentlyExpiredList.map((s) => (
                      <tr key={s._id} className="border-t border-border">
                        <td className="p-3 text-foreground">
                          {typeof s.userId === "object" && s.userId?.name ? s.userId.name : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {typeof s.levelTemplateId === "object" && s.levelTemplateId?.name
                            ? s.levelTemplateId.name
                            : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">{s.endAt ? format(new Date(s.endAt), "PP") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title={fr.empty.noRecentlyExpired} description={fr.empty.noRecentlyExpired} icon={<Inbox />} />
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{fr.dashboard.inactiveTitle}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clients?segment=inactive")}>
              {fr.buttons.viewAll}
            </Button>
          </CardHeader>
          <CardContent>
            {inactiveLoading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : inactiveList.length ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.user}</th>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.level}</th>
                      <th className="text-left p-3 font-medium text-foreground">{fr.dashboard.lastWorkout}</th>
                      <th className="text-right p-3 font-medium text-foreground">{fr.dashboard.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveList.slice(0, 5).map((s) => (
                      <tr key={s._id} className="border-t border-border">
                        <td className="p-3 text-foreground">
                          {typeof s.userId === "object" && s.userId?.name ? s.userId.name : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {typeof s.levelTemplateId === "object" && s.levelTemplateId?.name ? s.levelTemplateId.name : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {s.lastWorkoutDate ? format(new Date(s.lastWorkoutDate), "PP") : fr.dashboard.never}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/clients/${(s.userId as any)?._id}`)}
                          >
                            {fr.buttons.openProfile}
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                {levelTemplatesForSelect.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
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
