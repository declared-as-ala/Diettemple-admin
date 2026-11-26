import type { InvitationStatus } from "@/lib/api";

/** French labels + colours of the invitation statuses shown in the admin. */
export const INVITATION_STATUS: Record<InvitationStatus, { label: string; className: string }> = {
  pending: { label: "Invitation en attente", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  sent: { label: "Invitation envoyée", className: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  accepted: { label: "Invitation acceptée", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  expired: { label: "Invitation expirée", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  revoked: { label: "Invitation révoquée", className: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  failed: { label: "Échec d'envoi", className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

export const INVITATION_FILTERS: Array<{ value: "all" | InvitationStatus; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: INVITATION_STATUS.pending.label },
  { value: "sent", label: INVITATION_STATUS.sent.label },
  { value: "accepted", label: INVITATION_STATUS.accepted.label },
  { value: "expired", label: INVITATION_STATUS.expired.label },
  { value: "revoked", label: INVITATION_STATUS.revoked.label },
  { value: "failed", label: INVITATION_STATUS.failed.label },
];

export function invitationErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || "Une erreur est survenue. Réessayez.";
}

type ToastFn = (message: string, variant?: "success" | "error" | "info" | "warning") => void;

/** The admin toast takes (message, variant): join the title and the detail into one readable message. */
export function notify(toast: unknown, title: string, description: string, variant: "success" | "error") {
  (toast as ToastFn)(`${title} : ${description}`, variant);
}
