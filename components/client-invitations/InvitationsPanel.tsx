"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";
import { Loader2, MailPlus, RefreshCw, Search, Send, Ban, UserCheck } from "lucide-react";
import { api, type ClientInvitation, type InvitationStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminConfirmDialog } from "@/components/admin";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { INVITATION_FILTERS, INVITATION_STATUS, invitationErrorMessage, notify } from "./invitationStatus";

const fmt = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: dateFnsFr }) : "—");

interface Props {
  /** Bump to reload (e.g. after a new invitation was created elsewhere). */
  refreshKey?: number;
  onInviteClick: () => void;
}

export function InvitationsPanel({ refreshKey = 0, onInviteClick }: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"all" | InvitationStatus>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ClientInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ClientInvitation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(false);
    try {
      const { invitations } = await api.getInvitations(
        { status: status === "all" ? undefined : status, q: query.trim() || undefined },
        { signal: controller.signal }
      );
      setRows(invitations);
    } catch (e) {
      if ((e as { code?: string }).code === "ERR_CANCELED") return;
      setError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, refreshKey, query]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const replace = (inv: ClientInvitation) => setRows((prev) => prev.map((r) => (r._id === inv._id ? inv : r)));

  const resend = async (inv: ClientInvitation) => {
    setBusyId(inv._id);
    try {
      const out = await api.resendInvitation(inv._id);
      replace(out.invitation);
      notify(toast, "Invitation renvoyée", `Un nouveau lien a été envoyé à ${inv.email}. Les liens précédents ne fonctionnent plus.`, "success");
    } catch (e) {
      const data = (e as { response?: { status?: number; data?: { invitation?: ClientInvitation } } }).response;
      if (data?.data?.invitation) replace(data.data.invitation);
      notify(toast, "Envoi impossible", invitationErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setBusyId(revoking._id);
    try {
      const out = await api.revokeInvitation(revoking._id);
      replace(out.invitation);
      notify(toast, "Invitation révoquée", "Le lien d'activation ne fonctionne plus.", "success");
    } catch (e) {
      notify(toast, "Révocation impossible", invitationErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-label="Invitations clients" className="px-6 py-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un e-mail…" className="pl-9 h-9 bg-background" aria-label="Rechercher une invitation" />
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2" aria-label="Actualiser">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <Button size="sm" onClick={onInviteClick} className="gap-2 ml-auto">
          <MailPlus className="h-4 w-4" />
          Inviter un client
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrer par statut">
        {INVITATION_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={status === f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
              status === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Impossible de charger les invitations.</p>
          <Button className="mt-3" size="sm" onClick={load}>Réessayer</Button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <MailPlus className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">{status === "all" && !query ? "Aucune invitation pour le moment" : "Aucune invitation ne correspond"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "all" && !query ? "Invitez un client par e-mail : il activera lui-même son compte." : "Essayez un autre filtre ou une autre recherche."}
          </p>
          {status === "all" && !query ? <Button className="mt-4 gap-2" onClick={onInviteClick}><MailPlus className="h-4 w-4" />Inviter un client</Button> : null}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((inv) => {
            const st = INVITATION_STATUS[inv.status];
            const busy = busyId === inv._id;
            return (
              <li key={inv._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">{inv.email}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", st.className)}>{st.label}</span>
                  </div>
                  <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <div><dt className="inline">Invité le </dt><dd className="inline">{fmt(inv.createdAt)}</dd></div>
                    {inv.status === "accepted" ? (
                      <div><dt className="inline">Acceptée le </dt><dd className="inline">{fmt(inv.acceptedAt)}</dd></div>
                    ) : inv.status !== "revoked" ? (
                      <div><dt className="inline">{inv.status === "expired" ? "Expirée le " : "Expire le "}</dt><dd className="inline">{fmt(inv.expiresAt)}</dd></div>
                    ) : (
                      <div><dt className="inline">Révoquée le </dt><dd className="inline">{fmt(inv.revokedAt)}</dd></div>
                    )}
                    {inv.sendCount > 1 ? <div>{inv.sendCount} envois</div> : null}
                  </dl>
                  {inv.status === "failed" && inv.lastSendError ? <p className="mt-1 text-xs text-red-500">{inv.lastSendError}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {inv.userId ? (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/admin/clients/${inv.userId}`}><UserCheck className="h-4 w-4" />Voir le client</Link>
                    </Button>
                  ) : null}
                  {inv.canResend ? (
                    <Button variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => resend(inv)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Renvoyer
                    </Button>
                  ) : null}
                  {inv.canRevoke ? (
                    <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={busy} onClick={() => setRevoking(inv)}>
                      <Ban className="h-4 w-4" />
                      Révoquer
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => { if (!o) setRevoking(null); }}
        title="Révoquer cette invitation ?"
        description={revoking ? `Le lien envoyé à ${revoking.email} ne fonctionnera plus. Vous pourrez inviter à nouveau cette adresse plus tard.` : undefined}
        confirmLabel="Révoquer"
        variant="destructive"
        onConfirm={revoke}
      />
    </section>
  );
}
