"use client"

import * as React from "react"
import { Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  /** Show a small spinner on the right (e.g. while search is in flight). */
  isLoading?: boolean
  placeholder?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, isLoading, className, placeholder = "Rechercher…", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)
    const handleClear = () => {
      onChange("")
      onClear?.()
    }
    const showClear = value.length > 0

    return (
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          type="search"
          role="searchbox"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={cn("pl-9 pr-20", className)}
          {...props}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
          {showClear && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={handleClear}
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
