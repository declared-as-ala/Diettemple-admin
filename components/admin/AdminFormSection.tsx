import * as React from "react"
import { cn } from "@/lib/utils"

interface AdminFormSectionProps extends React.ComponentProps<"section"> {
  title: string
  description?: string
  icon?: React.ReactNode
}

export function AdminFormSection({
  title,
  description,
  icon,
  className,
  children,
  ...props
}: AdminFormSectionProps) {
  return (
    <section
      className={cn("rounded-xl border border-slate-200 bg-white p-4 sm:p-5", className)}
      {...props}
    >
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-50 text-lime-700">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          {description && <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
