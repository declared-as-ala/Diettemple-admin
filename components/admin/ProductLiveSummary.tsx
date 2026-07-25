import { Badge } from "@/components/ui/badge"
import { PackageCheck, PackageX, Tag } from "lucide-react"

export function ProductLiveSummary({ price, uhPrice, discount, stock, featured }: { price: string; uhPrice: string; discount: string; stock: string; featured: boolean }) {
  const normal = Number(price) || 0
  const reduction = Math.min(100, Math.max(0, Number(discount) || 0))
  const displayed = normal > 0 ? normal * (1 - reduction / 100) : 0
  const quantity = Number(stock) || 0
  return (
    <section className="rounded-xl border border-primary/30 bg-primary/10 p-5" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Résumé en direct</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{displayed.toFixed(2)} TND</p></div>{featured && <Badge className="bg-primary text-primary-foreground">Mis en avant</Badge>}</div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Remise</p><p className="mt-1 flex items-center gap-2 font-semibold text-foreground"><Tag className="h-4 w-4" aria-hidden="true" />{reduction}%</p></div><div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Prix UH</p><p className="mt-1 font-semibold tabular-nums text-foreground">{Number(uhPrice) > 0 ? `${Number(uhPrice).toFixed(2)} TND` : "Non défini"}</p></div><div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Stock</p><p className={`mt-1 flex items-center gap-2 font-semibold ${quantity > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-destructive"}`}>{quantity > 0 ? <PackageCheck className="h-4 w-4" aria-hidden="true" /> : <PackageX className="h-4 w-4" aria-hidden="true" />}{quantity > 0 ? `${quantity} disponible${quantity !== 1 ? "s" : ""}` : "Rupture"}</p></div></div>
    </section>
  )
}
