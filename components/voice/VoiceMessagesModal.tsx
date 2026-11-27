"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";
import { CheckCheck, Loader2, Mic, Send, Trash2 } from "lucide-react";
import { api, type VoiceMessageItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { AdminModal } from "@/components/admin";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { VoiceRecorder, type Recording } from "./VoiceRecorder";

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** One stored message: audio is downloaded with the admin token and played through a temporary blob URL. */
function VoiceBubble({ m, onDelete }: { m: VoiceMessageItem; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!m.hasAudio) return;
    let alive = true;
    let objectUrl: string | null = null;
    api
      .getVoiceAudioBlob(m.id)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [m.id, m.hasAudio]);

  return (
    <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md border border-border bg-card p-3">
      {m.hasAudio ? (
        failed ? (
          <p className="text-xs text-destructive">Audio indisponible.</p>
        ) : url ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={url} className="h-10 w-full min-w-[220px]" />
        ) : (
          <div className="flex h-10 items-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        )
      ) : null}
      {m.body ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{m.body}</p> : null}
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {m.hasAudio ? <><Mic className="h-3 w-3" />{fmtDur(m.durationSec)} · </> : null}
          {format(new Date(m.createdAt), "d MMM, HH:mm", { locale: dateFnsFr })}
        </span>
        <span className="flex items-center gap-2">
          {m.scope === "exercise" ? (
            <span className="flex items-center gap-1" title="Nombre de clients qui l'ont écouté ou ouvert">
              <CheckCheck className="h-3.5 w-3.5" />Lu par {m.readCount ?? 0} client{(m.readCount ?? 0) > 1 ? "s" : ""}
            </span>
          ) : (
            <span className={m.read ? "flex items-center gap-1 text-emerald-500" : "flex items-center gap-1"} title={m.read ? "Lu par le client" : "Pas encore lu"}>
              <CheckCheck className="h-3.5 w-3.5" />{m.read ? "Lu" : "Envoyé"}
            </span>
          )}
          <button type="button" onClick={onDelete} className="rounded p-1 hover:bg-destructive/10 hover:text-destructive" aria-label="Supprimer ce message" title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}

export function VoiceMessagesModal({
  open, onOpenChange, clientId, exerciseId, exerciseName, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = message on the exercise itself, shown to every client. */
  clientId: string | null;
  exerciseId: string;
  exerciseName: string;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const notify = (m: string, v: "success" | "error") => (toast as unknown as (m: string, v: string) => void)(m, v);
  const [items, setItems] = useState<VoiceMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [toDelete, setToDelete] = useState<VoiceMessageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recorderKey, setRecorderKey] = useState(0); // remounts the recorder after a send

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setItems(await api.getVoiceMessages(clientId, exerciseId));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId, exerciseId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load();
  }, [open, load]);

  const canSend = !sending && (!!recording || text.trim().length > 0);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const created = await api.sendVoiceMessage(clientId, exerciseId, { audio: recording?.blob, durationSec: recording?.durationSec, body: text.trim() || undefined });
      setItems((p) => [...p, created]);
      setRecording(null);
      setText("");
      setRecorderKey((k) => k + 1);
      notify(clientId ? "Message envoyé au client." : "Message ajouté à l'exercice.", "success");
      onChanged?.();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      notify(msg || "L'envoi a échoué. Réessayez.", "error"); // the recording is kept so nothing is lost
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteVoiceMessage(toDelete.id);
      setItems((p) => p.filter((m) => m.id !== toDelete.id));
      setToDelete(null);
      notify("Message supprimé.", "success");
      onChanged?.();
    } catch {
      notify("Suppression impossible. Réessayez.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminModal open={open} onOpenChange={onOpenChange} title={`Messages vocaux — ${exerciseName}`} description={clientId ? "Visible uniquement par ce client, sur cet exercice." : "Visible par tous les clients, dans l'application, sur cet exercice."} busy={sending} dirty={!!recording || text.trim().length > 0}>
        <div className="space-y-4">
          <div className="max-h-[38vh] min-h-[80px] space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-3" role="log" aria-label="Messages envoyés">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : loadError ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">Chargement impossible.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => { setLoading(true); void load(); }}>Réessayer</Button>
              </div>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun message pour cet exercice. Enregistrez le premier ci-dessous.</p>
            ) : (
              items.map((m) => <VoiceBubble key={m.id} m={m} onDelete={() => setToDelete(m)} />)
            )}
          </div>

          <VoiceRecorder key={recorderKey} onChange={setRecording} disabled={sending} />

          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder="Ajouter un texte (facultatif)…" aria-label="Texte du message" />

          <div className="flex justify-end">
            <Button onClick={() => void send()} disabled={!canSend} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {clientId ? "Envoyer au client" : "Publier sur l'exercice"}
            </Button>
          </div>
        </div>
      </AdminModal>

      <ConfirmModal
        open={!!toDelete}
        onOpenChange={(v) => { if (!v) setToDelete(null); }}
        title="Supprimer ce message ?"
        description="Le message (et son audio) disparaîtra aussi de l'application du client. Cette action est définitive."
        confirmLabel="Supprimer"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
