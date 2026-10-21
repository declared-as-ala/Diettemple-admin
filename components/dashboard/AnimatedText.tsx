"use client"

import BlurText from "@/components/BlurText"
import { cn } from "@/lib/utils"

/**
 * Blur-in text (React Bits BlurText). BlurText already renders the full string in an sr-only node and
 * honours prefers-reduced-motion, so screen readers and reduced-motion users get plain text.
 */
export function AnimatedText({
  text,
  className,
  delay = 55,
  trigger = "view",
}: {
  text: string
  className?: string
  delay?: number
  trigger?: "view" | "load"
}) {
  return <BlurText text={text} delay={delay} blur={6} distance={6} stepDuration={0.3} trigger={trigger} className={cn("m-0", className)} />
}
