"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  CreditCard,
  UtensilsCrossed,
  Calendar,
  Activity,
  ListOrdered,
  MessageSquarePlus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

type TabId = "overview" | "training" | "nutrition" | "adherence" | "timeline";

interface ProfileData {
  client: { _id: string; name?: string; email?: string; phone?: string };
  subscription: {
    _id: string;
    levelTemplateId?: { name?: string };
    effectiveStatus: string;
    startAt: string;
    endAt: string;
    history?: Array<{ action: string; date: string; note?: string }>;
  } | null;
  nutritionAssignment: {
    _id: string;
    nutritionPlanTemplateId?: { name?: string; dailyCalories?: number; macros?: { proteinG?: number; carbsG?: number; fatG?: number } };
    startAt: string;
    endAt: string;
    status: string;
    adjustments?: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string };
  } | null;
  lastCoachNote: { date: string; message?: string; title?: string } | null;
  lastWorkoutDate: string | null;
  setupChecklist: { subscription: boolean; trainingPlan: boolean; dietPlan: boolean; nextCheckIn: boolean };
}

interface NutritionData {
  assignment: {
    _id: string;
    nutritionPlanTemplateId?: { name?: string; dailyCalories?: number; macros?: { proteinG?: number; carbsG?: number; fatG?: number } };
    startAt: string;
    endAt: string;
    status: string;
    adjustments?: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string };
  } | null;
  logs: Array<{ date: string; consumedCalories?: number; consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number } }>;
}

interface TimelineEvent {
  type: string;
  date: string;
  title?: string;
  meta?: Record<string, unknown>;
}

export default function AdminClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tab, setTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewModal, setRenewModal] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [noteDate, setNoteDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [noteMessage, setNoteMessage] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [targetsSaving, setTargetsSaving] = useState(false);
  const [targetDailyCal, setTargetDailyCal] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [targetFat, setTargetFat] = useState("");

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getClient(id);
      setProfile(data);
    } catch (e) {
      console.error(e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTimeline = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getClientTimeline(id, { limit: 50 });
      setTimeline(data.timeline || []);
    } catch (e) {
      console.error(e);
      setTimeline([]);
    }
  }, [id]);

  const loadNutrition = useCallback(async () => {
    if (!id) return;
    setNutritionLoading(true);
    try {
      const data = await api.getClientNutrition(id);
      setNutritionData(data);
      const a = data?.assignment;
      if (a) {
        const t = a.nutritionPlanTemplateId as any;
        const adj = a.adjustments || {};
        setTargetDailyCal(String(adj.dailyCalories ?? t?.dailyCalories ?? "").replace(/^0$/, "") || "");
        setTargetProtein(String(adj.proteinG ?? t?.macros?.proteinG ?? "").replace(/^0$/, "") || "");
        setTargetCarbs(String(adj.carbsG ?? t?.macros?.carbsG ?? "").replace(/^0$/, "") || "");
        setTargetFat(String(adj.fatG ?? t?.macros?.fatG ?? "").replace(/^0$/, "") || "");
      }
    } catch (e) {
      console.error(e);
      setNutritionData(null);
    } finally {
      setNutritionLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (tab === "timeline") loadTimeline();
  }, [tab, loadTimeline]);

  useEffect(() => {
    if (tab === "nutrition") loadNutrition();
  }, [tab, loadNutrition]);

  const handleRenew = async () => {
    if (!profile?.subscription?._id || !renewEndDate) return;
    setRenewLoading(true);
    try {
      await api.renewSubscription(profile.subscription._id, {
        newEndAt: renewEndDate + "T23:59:59.999Z",
      });
      setRenewModal(false);
      loadProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setRenewLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteMessage.trim()) return;
    setNoteLoading(true);
    try {
      await api.addCoachNote(id, {
        date: noteDate,
        message: noteMessage.trim(),
        title: noteTitle.trim() || undefined,
      });
      setNoteModal(false);
      setNoteMessage("");
      setNoteTitle("");
      loadProfile();
      if (tab === "timeline") loadTimeline();
    } catch (e) {
      console.error(e);
    } finally {
      setNoteLoading(false);
    }
  };

  const handleSaveTargets = async () => {
    const assignment = nutritionData?.assignment ?? profile?.nutritionAssignment;
    if (!assignment?._id) return;
    setTargetsSaving(true);
    try {
      const adjustments: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number } = {};
      const c = parseInt(targetDailyCal, 10);
      const p = parseInt(targetProtein, 10);
      const g = parseInt(targetCarbs, 10);
      const f = parseInt(targetFat, 10);
      if (!Number.isNaN(c)) adjustments.dailyCalories = c;
      if (!Number.isNaN(p)) adjustments.proteinG = p;
      if (!Number.isNaN(g)) adjustments.carbsG = g;
      if (!Number.isNaN(f)) adjustments.fatG = f;
      await api.updateNutritionAssignment(assignment._id, adjustments);
      loadNutrition();
      loadProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setTargetsSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push("/admin/clients")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
        <p className="mt-4 text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: ListOrdered },
    { id: "training", label: "Training", icon: Activity },
    { id: "nutrition", label: "Nutrition", icon: UtensilsCrossed },
    { id: "adherence", label: "Adherence", icon: TrendingUp },
    { id: "timeline", label: "Timeline", icon: Calendar },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{profile.client.name || "Unnamed client"}</h1>
            <p className="text-muted-foreground">
              {profile.client.email || profile.client.phone || "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.subscription?.effectiveStatus === "ACTIVE" && (
            <Button variant="outline" size="sm" onClick={() => setRenewModal(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Renew
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/subscriptions?userId=${id}`)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Subscription
          </Button>
          <Button size="sm" onClick={() => { setNoteDate(format(new Date(), "yyyy-MM-dd")); setNoteMessage(""); setNoteTitle(""); setNoteModal(true); }}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Add Coach Note
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(t.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Checklist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                {profile.setupChecklist.subscription ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span>Subscription</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.setupChecklist.trainingPlan ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span>Training plan</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.setupChecklist.dietPlan ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span>Diet plan</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.setupChecklist.nextCheckIn ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span>Next check-in</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.subscription ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <Badge variant={profile.subscription.effectiveStatus === "ACTIVE" ? "default" : "secondary"}>
                        {profile.subscription.effectiveStatus}
                      </Badge>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Level:</span>{" "}
                      {(profile.subscription.levelTemplateId as any)?.name ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">End:</span>{" "}
                      {format(new Date(profile.subscription.endAt), "dd MMM yyyy")}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No subscription. Assign from Subscriptions or Assignments Board.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.nutritionAssignment ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Plan:</span>{" "}
                      {(profile.nutritionAssignment.nutritionPlanTemplateId as any)?.name ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">End:</span>{" "}
                      {format(new Date(profile.nutritionAssignment.endAt), "dd MMM yyyy")}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No nutrition plan assigned.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {(profile.lastWorkoutDate || profile.lastCoachNote) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {profile.lastWorkoutDate && (
                  <p>Last workout: {format(new Date(profile.lastWorkoutDate), "dd MMM yyyy")}</p>
                )}
                {profile.lastCoachNote && (
                  <p>Last coach note: {format(new Date(profile.lastCoachNote.date), "dd MMM yyyy")}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "training" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Base: {profile.subscription ? (profile.subscription.levelTemplateId as any)?.name ?? "—" : "Assign subscription first."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Week override and session customization (Phase 1) can be added here: customize week schedule and session builder.
            </p>
          </CardContent>
        </Card>
      )}

      {tab === "nutrition" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Objectifs nutrition (par jour)</CardTitle>
            </CardHeader>
            <CardContent>
              {nutritionLoading ? (
                <p className="text-muted-foreground">Chargement…</p>
              ) : nutritionData?.assignment ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Plan : {(nutritionData.assignment.nutritionPlanTemplateId as any)?.name ?? "—"} ·{" "}
                    {format(new Date(nutritionData.assignment.startAt), "dd MMM yyyy")} –{" "}
                    {format(new Date(nutritionData.assignment.endAt), "dd MMM yyyy")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Calories (kcal/jour)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetDailyCal}
                        onChange={(e) => setTargetDailyCal(e.target.value)}
                        placeholder="ex. 2200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Protéines (g)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetProtein}
                        onChange={(e) => setTargetProtein(e.target.value)}
                        placeholder="ex. 120"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Glucides (g)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetCarbs}
                        onChange={(e) => setTargetCarbs(e.target.value)}
                        placeholder="ex. 250"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lipides (g)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetFat}
                        onChange={(e) => setTargetFat(e.target.value)}
                        placeholder="ex. 75"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveTargets} disabled={targetsSaving}>
                    {targetsSaving ? "Enregistrement…" : "Enregistrer les objectifs"}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun plan nutrition affecté. Affectez un plan depuis Affectations nutrition.</p>
              )}
            </CardContent>
          </Card>
          {nutritionData?.logs && nutritionData.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Derniers journaux</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {nutritionData.logs.slice(0, 10).map((log, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{format(new Date(log.date), "dd MMM yyyy")}</span>
                      <span>{log.consumedCalories ?? "—"} kcal</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "adherence" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adherence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Workout completion rate and nutrition adherence (Phase 2). Use GET /admin/clients/:id/analytics for stats.
            </p>
          </CardContent>
        </Card>
      )}

      {tab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-3">
                {timeline.map((ev, i) => (
                  <li key={i} className="flex gap-3 border-l-2 border-muted pl-4">
                    <div className="flex-1">
                      <p className="font-medium capitalize">{ev.title || ev.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ev.date), "dd MMM yyyy HH:mm")}
                      </p>
                      {ev.meta && typeof ev.meta.message === "string" && (
                        <p className="mt-1 text-sm text-muted-foreground">{ev.meta.message}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={renewModal} onOpenChange={setRenewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New end date</Label>
              <Input
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewModal(false)}>Cancel</Button>
            <Button onClick={handleRenew} disabled={!renewEndDate || renewLoading}>
              {renewLoading ? "Renewing…" : "Renew"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteModal} onOpenChange={setNoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coach Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Check-in reminder" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={noteMessage} onChange={(e) => setNoteMessage(e.target.value)} placeholder="Message for the client…" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModal(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={!noteMessage.trim() || noteLoading}>
              {noteLoading ? "Saving…" : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
