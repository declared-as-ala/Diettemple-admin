"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * Lenis smooth scrolling for the admin pages.
 *  - Not started for `prefers-reduced-motion` users.
 *  - Stands aside while a dialog / drawer is open (Radix sets role="dialog" + body[data-scroll-locked]).
 *  - Nested scroll areas opt out with `data-lenis-prevent` (sidebar, command palette, tables, modals).
 *  - Full-screen tools can pass `disabled` (e.g. a point-of-sale style screen).
 */
export function SmoothScroll({ disabled = false }: { disabled?: boolean }) {
  useEffect(() => {
    if (disabled) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // wheel/touch inside dialogs and flagged areas scroll natively
      prevent: (node: Element) => !!node.closest('[role="dialog"], [role="menu"], [role="listbox"], [data-lenis-prevent]'),
    })

    let raf = 0
    const tick = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const syncWithDialogs = () => {
      const open = !!document.querySelector('[role="dialog"][data-state="open"]') || document.body.hasAttribute("data-scroll-locked")
      if (open) lenis.stop()
      else lenis.start()
    }
    const observer = new MutationObserver(syncWithDialogs)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-scroll-locked", "data-state"] })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [disabled])

  return null
}
