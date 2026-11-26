"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { api, type ClientInvitation } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminModal, AdminModalFooter } from "@/components/admin";
import { useToast } from "@/components/ui/toast";
import { invitationErrorMessage, notify } from "./invitationStatus";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the invitation exists (sent, or created with a send failure the admin can retry). */
  onInvited: (invitation: ClientInvitation) => void;
}

/** "Ajouter un client": the only required field is the email. The client chooses their own password. */
export function InviteClientModal({ open, onOpenChange, onInvited }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setError(null);
    }
  }, [open]);

  const valid = EMAIL_RE.test(email.trim());

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { invitation } = await api.createInvitation({ email: email.trim(), name: name.trim() || undefined });
      notify(toast, "Invitation envoyée", `Un e-mail d'activation a été envoyé à ${invitation.email}.`, "success");
      onInvited(invitation);
      onOpenChange(false);
    } catch (e) {
      const data = (e as { response?: { status?: number; data?: { invitation?: ClientInvitation } } }).response;
      if (data?.status === 502 && data.data?.invitation) {
        // Created, but the email could not be sent: it is listed as "Échec d'envoi" and can be re-sent.
        onInvited(data.data.invitation);
        notify(toast, "Invitation créée, e-mail non envoyé", "Vous pouvez la renvoyer depuis la liste des invitations.", "error");
        onOpenChange(false);
      } else {
        setError(invitationErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Inviter un client"
      description="Le client reçoit un e-mail pour activer son compte et choisir lui-même son mot de passe."
      icon={<Mail className="h-5 w-5" />}
      size="md"
      busy={loading}
      dirty={email.length > 0}
      initialFocusRef={emailRef}
      footer={
        <AdminModalFooter
          submitLabel="Inviter le client"
          loadingLabel="Envoi en cours…"
          loading={loading}
          submitDisabled={!valid}
          onCancel={() => onOpenChange(false)}
          onSubmit={submit}
          submitType="submit"
        />
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Adresse e-mail *</Label>
          <Input
            id="invite-email"
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="client@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={email.length > 0 && !valid}
            aria-describedby="invite-help"
          />
          {email.length > 0 && !valid ? <p className="text-xs text-destructive">Saisissez une adresse e-mail valide.</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">Prénom (facultatif)</Label>
          <Input id="invite-name" autoComplete="off" maxLength={80} placeholder="Pour personnaliser le message de bienvenue" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <p id="invite-help" className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {"Le compte n'est créé qu'une fois l'invitation acceptée. Le lien est personnel, valable 48 h, et aucun mot de passe n'est jamais envoyé par e-mail."}
        </p>
      </form>
    </AdminModal>
  );
}
