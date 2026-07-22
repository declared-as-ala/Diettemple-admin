import { AlertCircle } from "lucide-react"

export interface AdminFormError {
  field?: string
  message: string
}

export function AdminFormErrorSummary({ errors }: { errors: AdminFormError[] }) {
  if (errors.length === 0) return null

  return (
    <div role="alert" aria-live="assertive" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">
            {errors.length === 1 ? "Une erreur doit être corrigée" : `${errors.length} erreurs doivent être corrigées`}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {errors.map((error, index) => (
              <li key={`${error.field ?? "form"}-${index}`}>
                {error.field ? (
                  <a className="underline underline-offset-2 hover:no-underline" href={`#${error.field}`}>
                    {error.message}
                  </a>
                ) : error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
