"use client"

export default function ClientDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="h-[49px] border-b border-border bg-background/80 animate-pulse" />

      {/* Hero */}
      <div className="relative h-48 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative z-10 px-6 py-8 flex items-start gap-5">
          <div className="h-20 w-20 rounded-2xl bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-8 w-64 rounded bg-white/15 animate-pulse" />
            <div className="h-3 w-80 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="h-12 border-b border-border bg-background" />

      {/* Body */}
      <div className="p-6 space-y-6">
        <div className="h-24 rounded-xl border border-border bg-card animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    </div>
  )
}
