"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MAX_RECORDING_SECONDS = 180;

export interface Recording {
  blob: Blob;
  durationSec: number;
}

type Phase = "idle" | "recording" | "paused" | "recorded";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Picks a format the browser can record AND the server accepts (webm / ogg / mp4). */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
}

function micErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Accès au micro refusé. Autorisez le micro dans la barre d'adresse du navigateur, puis réessayez.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Aucun microphone détecté sur cet appareil.";
  if (name === "NotReadableError") return "Le micro est utilisé par une autre application.";
  return "Impossible de démarrer l'enregistrement.";
}

/** Browser voice recorder: record, pause/resume, stop, listen to the preview, cancel. Calls onChange with the final recording (or null). */
export function VoiceRecorder({ onChange, disabled }: { onChange: (r: Recording | null) => void; disabled?: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const supported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const stopAll = useCallback(() => {
    stopTimer();
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      r.onstop = null;
      try { r.stop(); } catch { /* already stopped */ }
    }
    recorderRef.current = null;
    releaseMic();
  }, []);

  // Never leave the microphone open when the modal closes.
  useEffect(() => stopAll, [stopAll]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_RECORDING_SECONDS) finish();
    }, 1000);
  };

  const finish = () => {
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    stopTimer();
    r.stop(); // onstop builds the blob
  };

  const start = async () => {
    setError(null);
    if (!supported) {
      setError("Votre navigateur ne permet pas d'enregistrer le son.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      secondsRef.current = 0;
      setSeconds(0);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        releaseMic();
        recorderRef.current = null;
        if (blob.size < 1000 || secondsRef.current < 1) {
          setPhase("idle");
          setError("Enregistrement trop court. Réessayez.");
          onChange(null);
          return;
        }
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase("recorded");
        onChange({ blob, durationSec: secondsRef.current });
      };
      recorderRef.current = rec;
      rec.start(250);
      setPhase("recording");
      startTimer();
    } catch (e) {
      releaseMic();
      setError(micErrorMessage(e));
      setPhase("idle");
    }
  };

  const pause = () => {
    const r = recorderRef.current;
    if (r?.state === "recording") {
      r.pause();
      stopTimer();
      setPhase("paused");
    }
  };
  const resume = () => {
    const r = recorderRef.current;
    if (r?.state === "paused") {
      r.resume();
      startTimer();
      setPhase("recording");
    }
  };
  const cancel = () => {
    stopAll();
    chunksRef.current = [];
    setPreviewUrl(null);
    setSeconds(0);
    secondsRef.current = 0;
    setPhase("idle");
    setError(null);
    onChange(null);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3" aria-label="Enregistreur vocal">
      {phase === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={start} disabled={disabled || !supported} className="gap-2">
            <Mic className="h-4 w-4" />Enregistrer un message vocal
          </Button>
          <span className="text-xs text-muted-foreground">Durée maximale : {MAX_RECORDING_SECONDS / 60} min</span>
        </div>
      )}

      {(phase === "recording" || phase === "paused") && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground" role="timer" aria-live="off">
            <span className={`h-2.5 w-2.5 rounded-full ${phase === "recording" ? "animate-pulse bg-red-500" : "bg-amber-500"}`} />
            {fmt(seconds)}
            <span className="text-xs font-normal text-muted-foreground">{phase === "recording" ? "Enregistrement…" : "En pause"}</span>
          </span>
          {phase === "recording" ? (
            <Button type="button" variant="outline" size="sm" onClick={pause} className="gap-1"><Pause className="h-4 w-4" />Pause</Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={resume} className="gap-1"><Play className="h-4 w-4" />Reprendre</Button>
          )}
          <Button type="button" size="sm" onClick={finish} className="gap-1"><Square className="h-4 w-4" />Terminer</Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancel} className="gap-1 text-destructive"><Trash2 className="h-4 w-4" />Annuler</Button>
        </div>
      )}

      {phase === "recorded" && previewUrl && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Aperçu ({fmt(seconds)}) — écoutez avant d&apos;envoyer</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={previewUrl} className="h-10 max-w-full" />
            <Button type="button" variant="ghost" size="sm" onClick={cancel} className="gap-1 text-destructive"><Trash2 className="h-4 w-4" />Supprimer</Button>
          </div>
        </div>
      )}

      {error ? <p role="alert" className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
