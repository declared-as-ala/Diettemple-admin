"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageSquareWarning } from "lucide-react";
import { api, type ComplaintStats } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Dashboard shortcut: unread / new / pending complaints. Hidden while loading or when the module cannot be reached. */
export function ComplaintsDashboardCard() {
  const [stats, setStats] = useState<ComplaintStats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.getComplaintStats().then((s) => alive && setStats(s)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!stats) return null;
  const attention = stats.unread > 0;
  return (
    <Link
      href="/admin/complaints"
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/40",
        attention ? "border-primary/50" : "border-border"
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", attention ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        <MessageSquareWarning className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {attention ? `${stats.unread} réclamation${stats.unread > 1 ? "s" : ""} non lue${stats.unread > 1 ? "s" : ""}` : "Aucune réclamation non lue"}
        </p>
        <p className="text-xs text-muted-foreground">
          {stats.new} nouvelle{stats.new > 1 ? "s" : ""} · {stats.pending} en attente de traitement · {stats.resolved} résolue{stats.resolved > 1 ? "s" : ""}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
