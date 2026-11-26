"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";
import { ChevronLeft, EyeOff, ImagePlus, Loader2, Send, StickyNote, X } from "lucide-react";
import { api, type ComplaintDetail, type ComplaintPriority, type ComplaintStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ComplaintAttachmentImage } from "@/components/complaints/ComplaintAttachmentImage";
import { COMPLAINT_PRIORITY, COMPLAINT_STATUS, PRIORITY_ORDER, STATUS_ORDER, complaintErrorMessage } from "@/components/complaints/complaintMeta";

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";
const fmt = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: dateFnsFr }) : "—");

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const notify = (m: string, v: "success" | "error") => (toast as unknown as (m: string, v: string) => void)(m, v);
  const [c, setC] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [after, setAfter] = useState<"" | ComplaintStatus>("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        const data = await api.getComplaint(id);
        setC(data);
      } catch (e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 404) setNotFound(true);
        else if (!silent) notify(complaintErrorMessage(e), "error");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 20000); // picks up the client's replies
    return () => clearInterval(t);
  }, [load]);

  const count = c?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [count]);

  const patch = async (p: { status?: ComplaintStatus; priority?: ComplaintPriority }) => {
    try {
      setC(await api.updateComplaint(id, p));
      notify("Réclamation mise à jour.", "success");
    } catch (e) {
      notify(complaintErrorMessage(e), "error");
    }
  };

  const send = async () => {
    if (sending || (!text.trim() && files.length === 0)) return;
    setSending(true);
    try {
      const next = mode === "note" ? await api.addComplaintNote(id, text.trim()) : await api.replyToComplaint(id, { body: text.trim(), status: after || undefined, files });
      setC(next);
      setText("");
      setFiles([]);
      setAfter("");
      notify(mode === "note" ? "Note interne ajoutée." : "Réponse envoyée au client.", "success");
    } catch (e) {
      notify(complaintErrorMessage(e), "error");
    } finally {
      setSending(false);
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !c) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Réclamation introuvable.</p>
        <Button asChild variant="outline"><Link href="/admin/complaints">Retour aux réclamations</Link></Button>
      </div>
    );
  }

  const closed = c.status === "closed";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <Link href="/admin/complaints" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />Réclamations
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{c.subject}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.reference} · {c.categoryLabel} · ouverte le {fmt(c.createdAt)}{c.resolvedAt ? ` · résolue le ${fmt(c.resolvedAt)}` : ""}{c.closedAt ? ` · fermée le ${fmt(c.closedAt)}` : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", COMPLAINT_STATUS[c.status].className)}>{COMPLAINT_STATUS[c.status].label}</span>
            <select className={selectClass} value={c.status} onChange={(e) => void patch({ status: e.target.value as ComplaintStatus })} aria-label="Changer le statut">
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{COMPLAINT_STATUS[s].label}</option>)}
            </select>
            <select className={selectClass} value={c.priority} onChange={(e) => void patch({ priority: e.target.value as ComplaintPriority })} aria-label="Changer la priorité">
              {PRIORITY_ORDER.map((p) => <option key={p} value={p}>Priorité : {COMPLAINT_PRIORITY[p].label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 lg:grid-cols-[1fr_280px]">
        <div className="flex min-h-[60vh] flex-col rounded-xl border border-border bg-card">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-label="Conversation">
            {c.messages.map((m) => (
              <div key={m.id} className={cn("flex", m.authorType === "admin" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    m.internal
                      ? "border border-dashed border-amber-500/50 bg-amber-500/10 text-foreground"
                      : m.authorType === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                  )}
                >
                  {m.internal ? (
                    <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-500"><EyeOff className="h-3 w-3" />Note interne — invisible pour le client</p>
                  ) : null}
                  {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                  {m.attachments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a) => <ComplaintAttachmentImage key={a.id} complaintId={c.id} attachment={a} />)}
                    </div>
                  ) : null}
                  <p className={cn("mt-1 text-[11px]", m.authorType === "admin" && !m.internal ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.authorType === "admin" ? "Équipe" : c.client.name || "Client"} · {fmt(m.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex gap-1" role="tablist">
              <button role="tab" aria-selected={mode === "reply"} onClick={() => setMode("reply")} className={cn("min-h-9 rounded-full border px-3 text-xs font-medium", mode === "reply" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}><Send className="mr-1 inline h-3 w-3" />Répondre au client</button>
              <button role="tab" aria-selected={mode === "note"} onClick={() => setMode("note")} className={cn("min-h-9 rounded-full border px-3 text-xs font-medium", mode === "note" ? "border-amber-500 bg-amber-500/20 text-amber-500" : "border-border text-muted-foreground")}><StickyNote className="mr-1 inline h-3 w-3" />Note interne</button>
            </div>
            {closed && mode === "reply" ? (
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Cette réclamation est fermée. Changez son statut pour pouvoir répondre.</p>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder={mode === "note" ? "Note visible uniquement par l'équipe…" : "Votre réponse au client…"}
                  className={cn("w-full resize-y rounded-lg border bg-background p-3 text-sm", mode === "note" ? "border-amber-500/50" : "border-input")}
                  aria-label={mode === "note" ? "Note interne" : "Réponse au client"}
                />
                {files.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                        {f.name.slice(0, 24)}
                        <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {mode === "reply" ? (
                    <>
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                      <Button variant="outline" size="sm" className="gap-1" disabled={files.length >= 4} onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />Image</Button>
                      <select className={selectClass} value={after} onChange={(e) => setAfter(e.target.value as "" | ComplaintStatus)} aria-label="Statut après l'envoi">
                        <option value="">Statut après envoi : automatique</option>
                        {STATUS_ORDER.filter((s) => s !== "new" && s !== "closed").map((s) => <option key={s} value={s}>Après envoi : {COMPLAINT_STATUS[s].label}</option>)}
                      </select>
                    </>
                  ) : null}
                  <Button size="sm" className="ml-auto gap-2" disabled={sending || (!text.trim() && files.length === 0)} onClick={() => void send()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {mode === "note" ? "Ajouter la note" : "Envoyer"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</h2>
            <p className="font-medium text-foreground">{c.client.name || "Client"}</p>
            {c.client.email ? <p className="break-all text-sm text-muted-foreground">{c.client.email}</p> : null}
            {c.client.phone ? <p className="text-sm text-muted-foreground">{c.client.phone}</p> : null}
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild variant="outline" size="sm"><Link href={`/admin/clients/${c.client.id}`}>Voir la fiche client</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link href={`/admin/complaints?clientId=${c.client.id}`}>Ses autres réclamations</Link></Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
