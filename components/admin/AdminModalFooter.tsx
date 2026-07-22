import * as React from "react"
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminModalFooterProps extends React.ComponentProps<"div"> {
  status?: string
  statusTone?: "neutral" | "valid" | "warning"
  cancelLabel?: string
  submitLabel: string
  loadingLabel?: string
  loading?: boolean
  submitDisabled?: boolean
  onCancel: () => void
  onSubmit?: () => void
  submitType?: "button" | "submit"
  destructive?: boolean
}

export function AdminModalFooter({
  status,
  statusTone = "neutral",
  cancelLabel = "Annuler",
  submitLabel,
  loadingLabel,
  loading = false,
  submitDisabled = false,
  onCancel,
  onSubmit,
  submitType = "button",
  destructive = false,
  className,
  ...props
}: AdminModalFooterProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className
      )}
      {...props}
    >
      <div className="min-h-5 text-sm" aria-live="polite">
        {status && (
          <span className={cn(
            "inline-flex items-center gap-2",
            statusTone === "valid" && "text-emerald-700",
            statusTone === "warning" && "text-amber-700",
            statusTone === "neutral" && "text-slate-600"
          )}>
            {statusTone === "valid" && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {statusTone === "warning" && <CircleAlert className="h-4 w-4" aria-hidden="true" />}
            {status}
          </span>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type={submitType}
          variant={destructive ? "destructive" : "default"}
          size="lg"
          onClick={onSubmit}
          disabled={loading || submitDisabled}
          className="min-w-36"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? (loadingLabel ?? `${submitLabel}…`) : submitLabel}
        </Button>
      </div>
    </div>
  )
}
