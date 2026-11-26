import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "@/lib/api";

export const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; className: string }> = {
  new: { label: "Nouvelle", className: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  in_progress: { label: "En cours de traitement", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  waiting_client: { label: "En attente de réponse", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  resolved: { label: "Résolue", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  closed: { label: "Fermée", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

export const COMPLAINT_PRIORITY: Record<ComplaintPriority, { label: string; className: string }> = {
  low: { label: "Basse", className: "text-zinc-400 border-zinc-500/30" },
  normal: { label: "Normale", className: "text-sky-500 border-sky-500/30" },
  high: { label: "Haute", className: "text-amber-500 border-amber-500/40" },
  urgent: { label: "Urgente", className: "text-red-500 border-red-500/40 bg-red-500/10" },
};

export const COMPLAINT_CATEGORIES: Record<ComplaintCategory, string> = {
  technical: "Problème technique",
  training: "Programme d'entraînement",
  nutrition: "Programme nutritionnel",
  billing: "Abonnement et paiement",
  order: "Commande et livraison",
  other: "Autre",
};

export const STATUS_ORDER: ComplaintStatus[] = ["new", "in_progress", "waiting_client", "resolved", "closed"];
export const PRIORITY_ORDER: ComplaintPriority[] = ["low", "normal", "high", "urgent"];

export function complaintErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } } };
  return err.response?.data?.message || "Une erreur est survenue. Réessayez.";
}
