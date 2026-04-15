"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MessageSquare, CreditCard, RefreshCw, TrendingUp, Activity,
  Circle, Loader2, MessageSquarePlus,
} from "lucide-react"
import type { TimelineEvent } from "./types"
import { fmtDate } from "./utils"

function TimelineIcon({ type }: { type: string }) {
  const base =
    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
  if (type === "coach_note")
    return (
      <div className={cn(base, "bg-blue-500/10")}>
        <MessageSquare className="h-4 w-4 text-blue-500" />
      </div>
    )
  if (type === "subscription_assigned")
    return (
      <div className={cn(base, "bg-emerald-500/10")}>
        <CreditCard className="h-4 w-4 text-emerald-500" />
      </div>
    )
  if (type === "subscription_renewed")
    return (
      <div className={cn(base, "bg-teal-500/10")}>
        <RefreshCw className="h-4 w-4 text-teal-500" />
      </div>
    )
  if (type === "subscription_level_changed")
    return (
      <div className={cn(base, "bg-amber-500/10")}>
        <TrendingUp className="h-4 w-4 text-amber-500" />
      </div>
    )
  if (type === "workout" || type === "workout_session")
    return (
      <div className={cn(base, "bg-purple-500/10")}>
        <Activity className="h-4 w-4 text-purple-500" />
      </div>
    )
  return (
    <div className={cn(base, "bg-muted")}>
      <Circle className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

interface TimelineTabProps {
  timeline: TimelineEvent[]
  timelineLoading: boolean
  onOpenNoteModal: () => void
}

export default function TimelineTab({
  timeline,
  timelineLoading,
  onOpenNoteModal,
}: TimelineTabProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Historique</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] gap-1"
            onClick={onOpenNoteModal}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Ajouter une note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {timelineLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">
            Aucun evenement pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {timeline.map((ev, i) => (
              <li key={i} className="flex items-start gap-3">
                <TimelineIcon type={ev.type} />
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-medium capitalize">
                    {ev.title || ev.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(ev.date)}</p>
                  {ev.meta && typeof ev.meta.message === "string" && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">
                      {ev.meta.message}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
