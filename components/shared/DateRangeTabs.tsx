"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

export type DateRange = "7d" | "30d" | "90d" | "12m";

const LABELS: Record<DateRange, string> = {
  "7d": fr.dateRange["7d"],
  "30d": fr.dateRange["30d"],
  "90d": fr.dateRange["90d"],
  "12m": fr.dateRange["12m"],
};

interface DateRangeTabsProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
}

export function DateRangeTabs({ value, onChange, className }: DateRangeTabsProps) {
  return (
    <div className={cn("flex gap-1 p-1 rounded-lg bg-muted/50 border border-border", className)}>
      {(Object.keys(LABELS) as DateRange[]).map((range) => (
        <Button
          key={range}
          variant={value === range ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(range)}
          className={cn(
            "rounded-md",
            value === range && "bg-background shadow-sm text-foreground"
          )}
        >
          {LABELS[range]}
        </Button>
      ))}
    </div>
  );
}
