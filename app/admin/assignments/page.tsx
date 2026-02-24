"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { User, Users } from "lucide-react";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface BoardUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  subscription?: {
    _id: string;
    levelTemplateId?: string;
    levelName?: string;
    effectiveStatus: string;
    endAt: string;
    daysRemaining: number | null;
  };
}

interface BoardTemplate {
  _id: string;
  name: string;
  activeCount: number;
  expiringSoonCount: number;
}

export default function AssignmentsBoardPage() {
  const [users, setUsers] = useState<BoardUser[]>([]);
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignModal, setAssignModal] = useState<{
    userId: string;
    userName: string;
    levelTemplateId: string;
    levelName: string;
    hasActive: boolean;
    currentLevelId?: string;
    subscriptionId?: string;
  } | null>(null);
  const [assignStart, setAssignStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assignEnd, setAssignEnd] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [assignNote, setAssignNote] = useState("");
  const [assignAction, setAssignAction] = useState<"assign" | "change_level" | "cancel_and_assign">("assign");
  const [assignLoading, setAssignLoading] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAssignmentsBoard({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setUsers(data.users || []);
      setTemplates(data.templates || []);
    } catch (e) {
      console.error(e);
      setUsers([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => loadBoard(), 300);
    return () => clearTimeout(t);
  }, [loadBoard]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (!aid.startsWith("user-")) return;
    const userId = aid.replace("user-", "");
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    if (oid === "drop-unassigned") {
      if (user.subscription?.effectiveStatus === "ACTIVE") {
        if (confirm(fr.pages.cancelSubscriptionConfirm.replace("{name}", user.name || user.email || ""))) {
          api.cancelSubscription(user.subscription._id).then(() => loadBoard()).catch(console.error);
        }
      }
      return;
    }

    if (oid.startsWith("drop-template-")) {
      const levelTemplateId = oid.replace("drop-template-", "");
      const template = templates.find((t) => t._id === levelTemplateId);
      if (!template) return;
      const hasActive = user.subscription?.effectiveStatus === "ACTIVE";
      setAssignModal({
        userId,
        userName: user.name || user.email || userId,
        levelTemplateId,
        levelName: template.name,
        hasActive,
        currentLevelId: user.subscription?.levelTemplateId,
        subscriptionId: user.subscription?._id,
      });
      setAssignStart(format(new Date(), "yyyy-MM-dd"));
      setAssignEnd(format(addDays(new Date(), 30), "yyyy-MM-dd"));
      setAssignNote("");
      setAssignAction(hasActive && user.subscription?.levelTemplateId !== levelTemplateId ? "change_level" : "assign");
    }
  };

  const submitAssign = async () => {
    if (!assignModal) return;
    setAssignLoading(true);
    try {
      if (assignAction === "cancel_and_assign" && assignModal.subscriptionId) {
        await api.cancelSubscription(assignModal.subscriptionId);
      }
      if (assignAction === "change_level" && assignModal.subscriptionId) {
        await api.changeSubscriptionLevel(assignModal.subscriptionId, {
          newLevelTemplateId: assignModal.levelTemplateId,
          keepDates: true,
        });
      } else if (assignAction === "assign" || assignAction === "cancel_and_assign") {
        await api.assignSubscription({
          userId: assignModal.userId,
          levelTemplateId: assignModal.levelTemplateId,
          startAt: new Date(assignStart).toISOString(),
          endAt: new Date(assignEnd + "T23:59:59.999Z").toISOString(),
          note: assignNote || undefined,
        });
      }
      setAssignModal(null);
      loadBoard();
    } catch (e) {
      console.error((e as Error).message);
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-200">
      <PageHeader
        title="Assignments"
        subtitle="Drag users into a template to assign. Drop on Unassigned to cancel."
      />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
        <input
          placeholder="Search name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 min-w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-[140px]"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="NONE">None</option>
        </select>
      </div>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Users column */}
          <div className="w-72 shrink-0 rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium text-foreground">
              <Users className="h-4 w-4" />
              {fr.pages.users} ({users.length})
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground">{fr.status.loading}</p>
              ) : users.length === 0 ? (
                <EmptyState title={fr.empty.noUsers} description={fr.empty.adjustSearchOrFilters} />
              ) : (
                users.map((u) => (
                  <UserCard key={u._id} user={u} />
                ))
              )}
            </div>
          </div>

          {/* Template columns */}
          {templates.map((t) => (
            <TemplateColumn key={t._id} template={t} users={users} />
          ))}

          {/* Unassigned / Expired */}
          <UnassignedColumn />
        </div>
      </DndContext>

      {/* Assign modal */}
      <Dialog open={!!assignModal} onOpenChange={(o) => !o && setAssignModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {assignModal?.hasActive && assignModal.currentLevelId !== assignModal.levelTemplateId
                ? fr.buttons.changeLevel + " / " + fr.buttons.assign
                : fr.pages.assignToTemplate}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {assignModal?.userName} → {assignModal?.levelName}
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {assignModal?.hasActive && assignModal.currentLevelId !== assignModal.levelTemplateId && (
              <div className="grid gap-2">
                <Label>Action</Label>
                <select
                  value={assignAction}
                  onChange={(e) => setAssignAction(e.target.value as "assign" | "change_level" | "cancel_and_assign")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="change_level">{fr.pages.upgradeDowngradeKeepDates}</option>
                  <option value="cancel_and_assign">{fr.pages.cancelCurrentAndAssign}</option>
                </select>
              </div>
            )}
            {(assignAction === "assign" || assignAction === "cancel_and_assign") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start</Label>
                    <input
                      type="date"
                      value={assignStart}
                      onChange={(e) => setAssignStart(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End</Label>
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
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModal(null)}>{fr.buttons.cancel}</Button>
            <Button onClick={submitAssign} disabled={assignLoading}>
              {assignLoading ? fr.status.savingShort : assignAction === "change_level" ? fr.buttons.changeLevel : fr.buttons.assign}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserCard({ user }: { user: BoardUser }) {
  const id = `user-${user._id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { userId: user._id },
  });

  const status = user.subscription?.effectiveStatus ?? "NONE";
  const badgeVariant = status === "ACTIVE" ? "default" : status === "EXPIRED" ? "secondary" : "outline";
  const days = user.subscription?.daysRemaining;
  const daysText =
    status === "ACTIVE" && days != null
      ? days > 0
        ? `${days}d left`
        : fr.pages.expiresToday
      : status === "EXPIRED" && days != null
        ? `${Math.abs(days)}d ago`
        : "";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow",
        isDragging && "opacity-80 shadow-lg cursor-grabbing"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{user.name || user.email || user._id}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge variant={badgeVariant} className="text-xs">
          {status}
        </Badge>
        {user.subscription?.levelName && (
          <Badge variant="outline" className="text-xs">
            {user.subscription.levelName}
          </Badge>
        )}
        {daysText && <span className="text-xs text-muted-foreground">{daysText}</span>}
      </div>
    </div>
  );
}

function TemplateColumn({ template, users }: { template: BoardTemplate; users: BoardUser[] }) {
  const id = `drop-template-${template._id}`;
  const { isOver, setNodeRef } = useDroppable({ id });
  const assigned = users.filter(
    (u) => u.subscription?.effectiveStatus === "ACTIVE" && u.subscription?.levelTemplateId === template._id
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-64 shrink-0 rounded-lg border-2 border-dashed p-4 transition-colors",
        isOver ? "border-primary bg-primary/10" : "border-border bg-muted/20"
      )}
    >
      <div className="mb-2 font-medium text-foreground">{template.name}</div>
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>{template.activeCount} active</span>
        {template.expiringSoonCount > 0 && (
          <span className="text-amber-600">{template.expiringSoonCount} expiring soon</span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Drop user here to assign</p>
    </div>
  );
}

function UnassignedColumn() {
  const { isOver, setNodeRef } = useDroppable({ id: "drop-unassigned" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-56 shrink-0 rounded-lg border-2 border-dashed p-4 transition-colors",
        isOver ? "border-destructive/70 bg-destructive/10" : "border-border bg-muted/20"
      )}
    >
      <div className="mb-1 font-medium text-foreground">{fr.pages.unassignedCancel}</div>
      <p className="text-xs text-muted-foreground">Drop user here to cancel subscription</p>
    </div>
  );
}
