"use client"

import { useState, useEffect, useCallback } from "react"

const DEFAULT_DEBOUNCE_MS = 400
const DEFAULT_MIN_LENGTH = 2

export interface UseDebouncedSearchOptions {
  /** Debounce delay in ms. Default 400. */
  debounceMs?: number
  /** Only set effective query when length >= this (avoids request spam). Default 2. */
  minLength?: number
  /** Initial value. */
  initial?: string
}

/**
 * Returns query (controlled), setQuery, debouncedQuery (for API),
 * clear, and isDebouncing. Use debouncedQuery in load effect;
 * use query for input value. If minLength is set, effective query
 * is empty when query.length < minLength.
 */
export function useDebouncedSearch(options: UseDebouncedSearchOptions = {}) {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minLength = DEFAULT_MIN_LENGTH,
    initial = "",
  } = options

  const [query, setQuery] = useState(initial)
  const [debouncedQuery, setDebouncedQuery] = useState(initial)
  const [isDebouncing, setIsDebouncing] = useState(false)

  useEffect(() => {
    if (query === debouncedQuery) {
      setIsDebouncing(false)
      return
    }
    setIsDebouncing(true)
    const t = setTimeout(() => {
      setDebouncedQuery(query)
      setIsDebouncing(false)
    }, debounceMs)
    return () => clearTimeout(t)
  }, [query, debounceMs, debouncedQuery])

  const clear = useCallback(() => {
    setQuery("")
    setDebouncedQuery("")
    setIsDebouncing(false)
  }, [])

  /** Use this for API: empty string when query is too short. */
  const effectiveQuery = query.trim().length >= minLength ? query.trim() : ""

  return {
    query,
    setQuery,
    debouncedQuery,
    effectiveQuery,
    isDebouncing,
    clear,
  }
}
