"use client"

import * as React from "react"
import { Check, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AdminSearchableSelectProps<T> {
  items: T[]
  selectedKeys: string[]
  onSelectionChange: (keys: string[]) => void
  getKey: (item: T) => string
  getLabel: (item: T) => string
  getSearchText?: (item: T) => string
  renderMeta?: (item: T) => React.ReactNode
  maxSelections?: number
  disabledKeys?: string[]
  placeholder?: string
  emptyText?: string
  label?: string
  loading?: boolean
  className?: string
}

export function AdminSearchableSelect<T>({
  items,
  selectedKeys,
  onSelectionChange,
  getKey,
  getLabel,
  getSearchText,
  renderMeta,
  maxSelections = 1,
  disabledKeys = [],
  placeholder = "Rechercher…",
  emptyText = "Aucun résultat.",
  label = "Options disponibles",
  loading = false,
  className,
}: AdminSearchableSelectProps<T>) {
  const [query, setQuery] = React.useState("")
  const deferredQuery = React.useDeferredValue(query.trim().toLocaleLowerCase("fr"))
  const disabled = React.useMemo(() => new Set(disabledKeys), [disabledKeys])
  const selected = React.useMemo(() => new Set(selectedKeys), [selectedKeys])

  const filteredItems = React.useMemo(() => {
    if (!deferredQuery) return items
    return items.filter((item) => {
      const text = getSearchText?.(item) ?? getLabel(item)
      return text.toLocaleLowerCase("fr").includes(deferredQuery)
    })
  }, [deferredQuery, getLabel, getSearchText, items])

  const toggle = (item: T) => {
    const key = getKey(item)
    if (disabled.has(key)) return
    if (selected.has(key)) {
      onSelectionChange(selectedKeys.filter((selectedKey) => selectedKey !== key))
      return
    }
    if (maxSelections === 1) {
      onSelectionChange([key])
      return
    }
    if (selectedKeys.length < maxSelections) onSelectionChange([...selectedKeys, key])
  }

  const selectedItems = items.filter((item) => selected.has(getKey(item)))
  const atLimit = selectedKeys.length >= maxSelections

  return (
    <div className={cn("space-y-3", className)}>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Sélection actuelle">
          {selectedItems.map((item) => {
            const key = getKey(item)
            return (
              <span key={key} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-foreground">
                {getLabel(item)}
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Retirer ${getLabel(item)}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="bg-muted/30 pl-9" aria-label={placeholder} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
        <span>{loading ? "Chargement…" : `${filteredItems.length} disponible${filteredItems.length !== 1 ? "s" : ""}`}</span>
        {maxSelections > 1 && <span>{selectedKeys.length}/{maxSelections} sélectionné{selectedKeys.length !== 1 ? "s" : ""}</span>}
      </div>

      <div role="listbox" aria-label={label} aria-multiselectable={maxSelections > 1 || undefined} className="max-h-72 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-2">
        {!loading && filteredItems.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>}
        {filteredItems.map((item) => {
          const key = getKey(item)
          const isSelected = selected.has(key)
          const isDisabled = disabled.has(key) || (!isSelected && atLimit)
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={isDisabled}
              onClick={() => toggle(item)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
                isSelected ? "border-primary/40 bg-primary/10 text-foreground font-medium" : "border-transparent text-foreground hover:bg-muted/50"
              )}
            >
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border") }>
                {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{getLabel(item)}</span>
                {renderMeta && <span className="mt-0.5 block text-xs text-muted-foreground">{renderMeta(item)}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const AdminCommandSelector = AdminSearchableSelect
