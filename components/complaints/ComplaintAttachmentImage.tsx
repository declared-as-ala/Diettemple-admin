"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

/** Private attachment: downloaded with the admin token and shown through a temporary blob URL (never a public link). */
export function ComplaintAttachmentImage({ complaintId, attachment }: { complaintId: string; attachment: { id: string; name: string } }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    api
      .getComplaintAttachmentBlob(complaintId, attachment.id)
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
  }, [complaintId, attachment.id]);

  if (failed) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground" title="Image indisponible">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border bg-muted/40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={attachment.name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={attachment.name} className="h-24 w-24 rounded-lg border border-border object-cover transition-opacity hover:opacity-90" />
    </a>
  );
}
