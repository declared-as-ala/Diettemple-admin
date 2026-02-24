"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, MoreHorizontal, UserPlus, RefreshCw, ArrowRightLeft, XCircle } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface SubRow {
  _id: string;
  userId?: { _id: string; name?: string; email?: string; phone?: string };
  levelTemplateId?: { _id: string; name?: string };
  status: string;
  startAt: string;
  endAt: string;
  effectiveStatus?: string;
}

interface SubscriptionDetail {
  _id: string;
  userId?: { _id: string; name?: string; email?: string };
  levelTemplateId?: { _id: string; name?: string };
  status: string;
  startAt: string;
  endAt: string;
  effectiveStatus?: string;
  history?: Array<{
    action: string;
    date: string;
    note?: string;
    fromLevelTemplateId?: string;
    toLevelTemplateId?: string;
  }>;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "secondary",
  CANCELED: "destructive",
};

export default function AdminSubscriptionsPage() {
  const searchParams = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [levelTemplates, setLevelTemplates] = useState<{ _id: string; name: string }[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignLevelId, setAssignLevelId] = useState("");
  const [assignStart, setAssignStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assignEnd, setAssignEnd] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [usersForAssign, setUsersForAssign] = useState<{ _id: string; name?: string; email?: string }[]>([]);

  const [renewModal, setRenewModal] = useState<{ sub: SubRow } | null>(null);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);

  const [changeLevelModal, setChangeLevelModal] = useState<{ sub: SubRow } | null>(null);
  const [changeLevelId, setChangeLevelId] = useState("");
  const [changeLevelLoading, setChangeLevelLoading] = useState(false);

  const [cancelModal, setCancelModal] = useState<{ sub: SubRow } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [detailSub, setDetailSub] = useState<SubscriptionDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (searchDebounced) params.searchUser = searchDebounced;
      if (statusFilter) params.status = statusFilter;
      if (levelFilter) params.levelTemplateId = levelFilter;
      if (expiringSoon) params.expiringSoonDays = 7;
      const data = await api.getSubscriptions(params);
      setSubscriptions(data.subscriptions || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (e) {
      console.error(e);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchDebounced, statusFilter, levelFilter, expiringSoon]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchUser), 400);
    return () => clearTimeout(t);
  }, [searchUser]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [searchDebounced, statusFilter, levelFilter, expiringSoon]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    api.getLevelTemplates({ limit: 100 }).then((data: { levelTemplates?: { _id: string; name: string }[] }) => {
      setLevelTemplates(data.levelTemplates || []);
    });
  }, []);

  useEffect(() => {
    const exp = searchParams.get("expiringSoon");
    const st = searchParams.get("status");
    if (exp === "1") setExpiringSoon(true);
    if (st) setStatusFilter(st);
  }, [searchParams]);

  const openAssign = () => {
    setAssignOpen(true);
    setAssignUserId("");
    setAssignLevelId("");
    setAssignStart(format(new Date(), "yyyy-MM-dd"));
    setAssignEnd(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    setAssignNote("");
    api.getUsers({ limit: 200 }).then((data: { users?: { _id: string; name?: string; email?: string }[] }) => {
      setUsersForAssign(data.users || []);
    });
  };

  const submitAssign = async () => {
    if (!assignUserId || !assignLevelId || !assignStart || !assignEnd) return;
    setAssignLoading(true);
    try {
      await api.assignSubscription({
        userId: assignUserId,
        levelTemplateId: assignLevelId,
        startAt: new Date(assignStart).toISOString(),
        endAt: new Date(assignEnd + "T23:59:59.999Z").toISOString(),
        note: assignNote || undefined,
      });
      setAssignOpen(false);
      loadSubscriptions();
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setAssignLoading(false);
    }
  };

  const openRenew = (sub: SubRow) => {
    setRenewModal({ sub });
    setRenewEndDate(format(addDays(new Date(sub.endAt), 30), "yyyy-MM-dd"));
  };

  const submitRenew = async () => {
    if (!renewModal) return;
    setRenewLoading(true);
    try {
      await api.renewSubscription(renewModal.sub._id, {
        newEndAt: renewEndDate + "T23:59:59.999Z",
      });
      setRenewModal(null);
      loadSubscriptions();
      if (detailSub?._id === renewModal.sub._id) {
        const d = await api.getSubscription(renewModal.sub._id);
        setDetailSub(d.subscription);
      }
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setRenewLoading(false);
    }
  };

  const openChangeLevel = (sub: SubRow) => {
    setChangeLevelModal({ sub });
    setChangeLevelId("");
  };

  const submitChangeLevel = async () => {
    if (!changeLevelModal || !changeLevelId) return;
    setChangeLevelLoading(true);
    try {
      await api.changeSubscriptionLevel(changeLevelModal.sub._id, {
        newLevelTemplateId: changeLevelId,
        keepDates: true,
      });
      setChangeLevelModal(null);
      setChangeLevelId("");
      loadSubscriptions();
      if (detailSub?._id === changeLevelModal.sub._id) {
        const d = await api.getSubscription(changeLevelModal.sub._id);
        setDetailSub(d.subscription);
      }
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setChangeLevelLoading(false);
    }
  };

  const openCancel = (sub: SubRow) => setCancelModal({ sub });
  const submitCancel = async () => {
    if (!cancelModal) return;
    setCancelLoading(true);
    try {
      await api.cancelSubscription(cancelModal.sub._id);
      setCancelModal(null);
      setDetailOpen(false);
      setDetailSub(null);
      loadSubscriptions();
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setCancelLoading(false);
    }
  };

  const openDetail = async (sub: SubRow) => {
    try {
      const data = await api.getSubscription(sub._id);
      setDetailSub(data.subscription);
      setDetailOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const daysRemaining = (endAt: string, effective?: string) => {
    if (effective === "EXPIRED" || effective === "CANCELED") return "—";
    const d = differenceInDays(new Date(endAt), new Date());
    if (d < 0) return "Expired";
    if (d === 0) return "Today";
    return `${d}d`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title="Subscriptions (Users & Access)"
        subtitle="Manage user access to level templates"
        actions={
          <Button onClick={openAssign}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign subscription
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex-1 min-w-[200px]">
          <input
            placeholder="Search user (name, email, phone)"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-[140px]"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELED">Canceled</option>
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-[180px]"
        >
          <option value="">All levels</option>
          {levelTemplates.map((l) => (
            <option key={l._id} value={l._id}>{l.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={expiringSoon}
            onChange={(e) => setExpiringSoon(e.target.checked)}
            className="rounded border-input"
          />
          Expiring soon (7d)
        </label>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {loading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<CreditCard />}
            title="No subscriptions found"
            description="Adjust filters or assign a new subscription."
            action={<Button onClick={openAssign}>Assign subscription</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>User</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Days left</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow
                    key={sub._id}
                    className="cursor-pointer"
                    onClick={() => openDetail(sub)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {typeof sub.userId === "object" && sub.userId?.name ? sub.userId.name : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(typeof sub.userId === "object" && sub.userId?.email) ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {typeof sub.levelTemplateId === "object" && sub.levelTemplateId?.name
                        ? sub.levelTemplateId.name
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[sub.effectiveStatus || sub.status] || "outline"}>
                        {sub.effectiveStatus || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.startAt ? format(new Date(sub.startAt), "PP") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.endAt ? format(new Date(sub.endAt), "PP") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {daysRemaining(sub.endAt, sub.effectiveStatus)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(sub.effectiveStatus || sub.status) === "ACTIVE" && (
                            <>
                              <DropdownMenuItem onClick={() => openRenew(sub)}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Renew
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openChangeLevel(sub)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" /> Upgrade / Downgrade
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCancel(sub)} className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign subscription</DialogTitle>
            <p className="text-sm text-muted-foreground">Assign a level template to a user with start and end dates.</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User</Label>
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select user</option>
                {usersForAssign.map((u) => (
                  <option key={u._id} value={u._id}>{u.name || u.email || u._id}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Level template</Label>
              <select
                value={assignLevelId}
                onChange={(e) => setAssignLevelId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select level</option>
                {levelTemplates.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start date</Label>
                <input
                  type="date"
                  value={assignStart}
                  onChange={(e) => setAssignStart(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label>End date</Label>
                <input
                  type="date"
                  value={assignEnd}
                  onChange={(e) => setAssignEnd(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Note (optional)</Label>
              <input
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Optional note"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={assignLoading || !assignUserId || !assignLevelId}>
              {assignLoading ? "Creating..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew modal */}
      <Dialog open={!!renewModal} onOpenChange={(o) => !o && setRenewModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew subscription</DialogTitle>
            <p className="text-sm text-muted-foreground">
              New end date for {renewModal && typeof renewModal.sub.userId === "object" && renewModal.sub.userId?.name}
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New end date</Label>
              <input
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewModal(null)}>Cancel</Button>
            <Button onClick={submitRenew} disabled={renewLoading}>{renewLoading ? "Saving..." : "Renew"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change level modal */}
      <Dialog open={!!changeLevelModal} onOpenChange={(o) => !o && setChangeLevelModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade / Downgrade</DialogTitle>
            <p className="text-sm text-muted-foreground">Select new level template.</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New level</Label>
              <select
                value={changeLevelId}
                onChange={(e) => setChangeLevelId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select level</option>
                {levelTemplates.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeLevelModal(null)}>Cancel</Button>
            <Button onClick={submitChangeLevel} disabled={changeLevelLoading || !changeLevelId}>
              {changeLevelLoading ? "Saving..." : "Change level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <ConfirmModal
        open={!!cancelModal}
        onOpenChange={(o) => !o && setCancelModal(null)}
        title="Cancel subscription"
        description={`Cancel subscription for ${cancelModal && typeof cancelModal.sub.userId === "object" && cancelModal.sub.userId?.name}? This will set status to CANCELED.`}
        confirmLabel="Cancel subscription"
        variant="destructive"
        onConfirm={submitCancel}
        loading={cancelLoading}
      />

      {/* Detail drawer (dialog) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription details</DialogTitle>
            {detailSub && (
              <p className="text-sm text-muted-foreground">
                {typeof detailSub.userId === "object" && detailSub.userId?.name} ·{" "}
                {typeof detailSub.levelTemplateId === "object" && detailSub.levelTemplateId?.name}
              </p>
            )}
          </DialogHeader>
          {detailSub && (
            <div className="space-y-4 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANTS[detailSub.effectiveStatus || detailSub.status] || "outline"}>
                  {detailSub.effectiveStatus || detailSub.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(detailSub.startAt), "PP")} → {format(new Date(detailSub.endAt), "PP")}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">History</h4>
                <ul className="space-y-2 text-sm">
                  {(detailSub.history || []).map((h, i) => (
                    <li key={i} className="flex gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">{h.action}</span>
                      <span>{format(new Date(h.date), "PPp")}</span>
                      {h.note && <span className="italic">— {h.note}</span>}
                    </li>
                  ))}
                  {(!detailSub.history || detailSub.history.length === 0) && (
                    <li className="text-muted-foreground">No history</li>
                  )}
                </ul>
              </div>
              {(detailSub.effectiveStatus || detailSub.status) === "ACTIVE" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { openRenew(detailSub as unknown as SubRow); setDetailOpen(false); }}>Renew</Button>
                  <Button size="sm" variant="outline" onClick={() => { openChangeLevel(detailSub as unknown as SubRow); setDetailOpen(false); }}>Change level</Button>
                  <Button size="sm" variant="destructive" onClick={() => { openCancel(detailSub as unknown as SubRow); setDetailOpen(false); }}>Cancel</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
