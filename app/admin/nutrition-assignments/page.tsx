"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ClipboardList, UserPlus } from "lucide-react";
import { format } from "date-fns";

interface Assignment {
  _id: string;
  userId?: { _id: string; name?: string; email?: string };
  nutritionPlanTemplateId?: { _id: string; name?: string; dailyCalories?: number };
  startAt: string;
  endAt: string;
  status: string;
  effectiveStatus?: string;
}

export default function NutritionAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchUser, setSearchUser] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [users, setUsers] = useState<{ _id: string; name?: string; email?: string }[]>([]);
  const [plans, setPlans] = useState<{ _id: string; name: string }[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignStart, setAssignStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assignEnd, setAssignEnd] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [assignLoading, setAssignLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNutritionAssignments({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        searchUser: searchUser.trim() || undefined,
      });
      setAssignments(data.assignments || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchUser]);

  useEffect(() => {
    load();
  }, [load]);

  const openAssign = () => {
    setAssignOpen(true);
    setAssignUserId("");
    setAssignPlanId("");
    setAssignStart(format(new Date(), "yyyy-MM-dd"));
    setAssignEnd(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
    api.getUsers({ limit: 200 }).then((d: { users?: { _id: string; name?: string; email?: string }[] }) => setUsers(d.users || []));
    api.getNutritionPlans().then((d: { nutritionPlanTemplates?: { _id: string; name: string }[] }) => setPlans(d.nutritionPlanTemplates || []));
  };

  const submitAssign = async () => {
    if (!assignUserId || !assignPlanId) return;
    setAssignLoading(true);
    try {
      await api.assignNutritionPlan({
        userId: assignUserId,
        nutritionPlanTemplateId: assignPlanId,
        startAt: new Date(assignStart).toISOString(),
        endAt: new Date(assignEnd + "T23:59:59.999Z").toISOString(),
      });
      setAssignOpen(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title="Nutrition Assignments"
        subtitle="Assign nutrition plans to users"
        actions={
          <Button onClick={openAssign}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign plan
          </Button>
        }
      />

      {loading ? (
        <div className="rounded-lg border border-border divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-5 w-24 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="Search user..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="PAUSED">Paused</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => load()}>Apply</Button>
          </div>
          {assignments.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title="No assignments"
              description="Assign a nutrition plan to a user to get started."
              action={<Button onClick={openAssign}>Assign plan</Button>}
            />
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-medium text-foreground">User</th>
                    <th className="text-left p-3 font-medium text-foreground">Plan</th>
                    <th className="text-left p-3 font-medium text-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-foreground">Start</th>
                    <th className="text-left p-3 font-medium text-foreground">End</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a._id} className="border-t border-border">
                      <td className="p-3">
                        {typeof a.userId === "object" && a.userId
                          ? a.userId.name || a.userId.email || a.userId._id
                          : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {typeof a.nutritionPlanTemplateId === "object" && a.nutritionPlanTemplateId
                          ? a.nutritionPlanTemplateId.name
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={a.effectiveStatus === "ACTIVE" ? "default" : "secondary"}>
                          {a.effectiveStatus || a.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{a.startAt ? format(new Date(a.startAt), "PP") : "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.endAt ? format(new Date(a.endAt), "PP") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign nutrition plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>User</Label>
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name || u.email || u._id}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Plan</Label>
              <select
                value={assignPlanId}
                onChange={(e) => setAssignPlanId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
              >
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start</Label>
                <input
                  type="date"
                  value={assignStart}
                  onChange={(e) => setAssignStart(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                />
              </div>
              <div>
                <Label>End</Label>
                <input
                  type="date"
                  value={assignEnd}
                  onChange={(e) => setAssignEnd(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={assignLoading || !assignUserId || !assignPlanId}>
              {assignLoading ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
