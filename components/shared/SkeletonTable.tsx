"use client";

import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, cols = 5, className }: SkeletonTableProps) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <div className="flex border-b border-border bg-muted/30">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-10 px-4 flex items-center">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="flex-1 h-12 px-4 flex items-center">
              <div
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: colIdx === 0 ? 120 : 80 }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
