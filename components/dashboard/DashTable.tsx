"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3, RefreshCw, TriangleAlert, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { AnimatedText } from "./AnimatedText"

export interface DashColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number | null
  align?: "left" | "right"
  /** Columns that can never be hidden (e.g. the name). */
  locked?: boolean
}

export interface BulkAction<T> {
  label: string
  icon?: ReactNode
  onClick: (rows: T[]) => void
}

interface Props<T> {
  columns: DashColumn<T>[]
  rows: T[]
  getId: (row: T) => string
  ariaLabel: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  pageSize?: number
  bulkActions?: BulkAction<T>[]
  emptyTitle: string
  emptyDescription?: string
  emptyIcon?: ReactNode
}

const pagerButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function DashTable<T>({
  columns,
  rows,
  getId,
  ariaLabel,
  loading,
  error,
  onRetry,
  pageSize = 5,
  bulkActions = [],
  emptyTitle,
  emptyDescription,
  emptyIcon,
}: Props<T>) {
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null)
  const [page, setPage] = useState(0)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const selectable = bulkActions.length > 0

  const visibleColumns = columns.filter((c) => !hidden.has(c.id))

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.id === sort.id)
    if (!col?.sortValue) return rows
    const get = col.sortValue
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr", { numeric: true })
      return sort.dir === "asc" ? cmp : -cmp
    })
  }, [rows, columns, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  // drop selections that no longer exist (after a refresh)
  useEffect(() => {
    const ids = new Set(rows.map(getId))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize)
  const pageIds = pageRows.map(getId)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const selectedRows = rows.filter((r) => selected.has(getId(r)))

  const toggleSort = (id: string) => setSort((s) => (s?.id !== id ? { id, dir: "asc" } : s.dir === "asc" ? { id, dir: "desc" } : null))
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPage) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden />
        <p className="text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-[transform,background-color] hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* toolbar: bulk action bar when rows are selected, otherwise the count + column visibility */}
      <div className="flex min-h-10 items-center justify-between gap-2 px-4 pb-2">
        {selectable && selected.size > 0 ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-foreground px-3 py-1.5 text-background" role="status">
            <span className="num text-xs font-medium">
              {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
            </span>
            <span className="flex-1" />
            {bulkActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => a.onClick(selectedRows)}
                className="inline-flex items-center gap-1.5 rounded-md bg-background/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {a.icon}
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Désélectionner tout"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-background/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="num text-xs text-muted-foreground">{loading ? "…" : `${rows.length} élément${rows.length > 1 ? "s" : ""}`}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Colonnes affichées"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Columns3 className="h-3.5 w-3.5" aria-hidden /> Colonnes
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter((c) => !c.locked)
                  .map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={!hidden.has(c.id)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(v) =>
                        setHidden((prev) => {
                          const next = new Set(prev)
                          if (v) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }
                    >
                      {c.header}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 px-4 pb-4" aria-busy="true" aria-label="Chargement">
          {Array.from({ length: Math.min(pageSize, 4) }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          {emptyIcon && <span className="text-muted-foreground [&_svg]:h-6 [&_svg]:w-6">{emptyIcon}</span>}
          <AnimatedText text={emptyTitle} className="justify-center text-sm font-medium text-foreground" />
          {emptyDescription && <AnimatedText text={emptyDescription} className="justify-center text-[13px] text-muted-foreground" />}
        </div>
      ) : (
        <>
          <div data-lenis-prevent className="overflow-x-auto">
            <table aria-label={ariaLabel} className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  {selectable && (
                    <th scope="col" className="w-10 py-2 pl-4">
                      <input
                        type="checkbox"
                        aria-label="Sélectionner la page"
                        checked={allOnPage}
                        onChange={toggleAll}
                        className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                      />
                    </th>
                  )}
                  {visibleColumns.map((c) => {
                    const active = sort?.id === c.id
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}
                        className={cn("px-4 py-2 font-medium", c.align === "right" && "text-right")}
                      >
                        {c.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.id)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              active && "text-foreground"
                            )}
                          >
                            {c.header}
                            {active ? (
                              sort!.dir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const id = getId(row)
                  const isSel = selected.has(id)
                  return (
                    <tr key={id} className={cn("border-b border-border transition-colors last:border-0 hover:bg-muted/40", isSel && "bg-muted/60")}>
                      {selectable && (
                        <td className="py-2.5 pl-4">
                          <input
                            type="checkbox"
                            aria-label="Sélectionner la ligne"
                            checked={isSel}
                            onChange={() => toggleOne(id)}
                            className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                          />
                        </td>
                      )}
                      {visibleColumns.map((c) => (
                        <td key={c.id} className={cn("px-4 py-2.5", c.align === "right" && "text-right")}>
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 pt-3 text-xs text-muted-foreground">
            <span className="num">
              {page * pageSize + 1}–{Math.min(sorted.length, page * pageSize + pageSize)} sur {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Page précédente" className={pagerButton}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                aria-label="Page suivante"
                className={pagerButton}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
