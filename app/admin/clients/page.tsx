"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fr } from "@/lib/i18n/fr";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Input } from "@/components/ui/input";
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
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, RefreshCw, Users } from "lucide-react";
import { format } from "date-fns";

type Segment = "all" | "active" | "expired" | "expiring_soon" | "inactive" | "unassigned";

interface ClientRow {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
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

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: fr.segments.all },
  { value: "active", label: fr.segments.active },
  { value: "expiring_soon", label: fr.segments.expiringSoon },
  { value: "inactive", label: fr.segments.inactive },
  { value: "expired", label: fr.segments.expired },
  { value: "unassigned", label: fr.segments.unassigned },
];

const SEGMENT_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  expiring_soon: "outline",
  inactive: "secondary",
  expired: "destructive",
  unassigned: "outline",
};

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [segment, setSegment] = useState<Segment>("all");
  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(false);
  const { query, setQuery, effectiveQuery, isDebouncing } = useDebouncedSearch({
    debounceMs: 400,
    minLength: 2,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const loadClients = useCallback(
    async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      const isSearchOrRefresh = hasLoadedOnce.current;
      if (isSearchOrRefresh) setSearchLoading(true);
      else setLoading(true);
      try {
        const data = await api.getClients(
          {
            segment,
            search: effectiveQuery || undefined,
            page: pagination.page,
            limit: pagination.limit,
          },
          { signal }
        );
        if (signal.aborted) return;
        hasLoadedOnce.current = true;
        setClients(data.clients || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } catch (e: any) {
        if (e?.name === "AbortError" || e?.code === "ERR_CANCELED") return;
        console.error(e);
        setClients([]);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setSearchLoading(false);
        }
      }
    },
    [segment, effectiveQuery, pagination.page, pagination.limit]
  );

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [effectiveQuery]);

  const handleAddClient = async () => {
    if (!addEmail && !addPhone) {
      setAddError("Email or phone is required");
      return;
    }
    if (!addPassword || addPassword.length < 6) {
      setAddError(fr.clientsPage.passwordMinLength);
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      await api.createClient({
        name: addName || undefined,
        email: addEmail || undefined,
        phone: addPhone || undefined,
        password: addPassword,
      });
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddPassword("");
      loadClients();
    } catch (e: any) {
      setAddError(e.response?.data?.message || fr.clientsPage.failedToCreateClient);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={fr.sidebar.clients}
        subtitle={fr.clientsPage.subtitle}
        actions={
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {fr.buttons.addClient}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <Button
              key={s.value}
              variant={segment === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSegment(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 min-w-0 max-w-md">
          <SearchInput
            placeholder={fr.clientsPage.searchPlaceholder}
            value={query}
            onChange={setQuery}
            isLoading={searchLoading || isDebouncing}
          />
          <Button variant="outline" size="icon" onClick={() => loadClients()} className="shrink-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Users className="size-10" />}
            title={fr.clientsPage.noClientsFound}
            description={segment !== "all" ? `${fr.empty.noClientsInSegment} "${SEGMENTS.find((s) => s.value === segment)?.label}".` : fr.empty.addClientOrAdjustFilters}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fr.clientsPage.name}</TableHead>
                <TableHead>{fr.clientsPage.contact}</TableHead>
                <TableHead>{fr.clientsPage.status}</TableHead>
                <TableHead>{fr.clientsPage.levelEnd}</TableHead>
                <TableHead>{fr.dashboard.lastWorkout}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow
                  key={c._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/clients/${c._id}`)}
                >
                  <TableCell className="font-medium">{c.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email || c.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={SEGMENT_BADGE[c.segment] || "outline"}>
                      {c.segment === "expiring_soon" ? fr.segments.expiringSoon : c.segment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.subscription ? (
                      <>
                        {c.subscription.levelName || "—"} ·{" "}
                        {format(new Date(c.subscription.endAt), "dd MMM yyyy")}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.lastWorkoutDate
                      ? format(new Date(c.lastWorkoutDate), "dd MMM yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {fr.clientsPage.pageOf.replace("{page}", String(pagination.page)).replace("{pages}", String(pagination.pages)).replace("{total}", String(pagination.total))}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              {fr.clientsPage.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              {fr.clientsPage.next}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr.buttons.addClient}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal">{fr.clientsPage.nameOptional}</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={fr.pages.fullName} />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal">{fr.clientsPage.emailOptional}</Label>
              <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder={fr.pages.emailPlaceholder} />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal">{fr.clientsPage.phoneOptional}</Label>
              <Input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder={fr.pages.phonePlaceholder} />
            </div>
            <p className="text-xs text-muted-foreground">{fr.clientsPage.provideEmailOrPhone}</p>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal">{fr.pages.password}</Label>
              <Input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder={fr.pages.minPassword} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{fr.buttons.cancel}</Button>
            <Button onClick={handleAddClient} disabled={addLoading}>
              {addLoading ? fr.status.creating : fr.buttons.createClient}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
