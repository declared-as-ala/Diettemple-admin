"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InvitationsPanel } from "@/components/client-invitations/InvitationsPanel";
import { InviteClientModal } from "@/components/client-invitations/InviteClientModal";

export default function InvitationsPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-5">
        <Link href="/admin/clients" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Invitations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Suivez les invitations envoyées : le client active lui-même son compte et choisit son mot de passe.</p>
      </div>
      <InvitationsPanel refreshKey={refreshKey} onInviteClick={() => setInviteOpen(true)} />
      <InviteClientModal open={inviteOpen} onOpenChange={setInviteOpen} onInvited={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
