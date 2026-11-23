import { useLayoutEffect, type RefObject } from "react"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/motion"

/** When the last skeleton left the page (performance.now()). */
let skeletonLeftAt = -Infinity

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  useLayoutEffect(() => () => {
    skeletonLeftAt = performance.now()
  }, [])
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

/**
 * Fades `ref` in (opacity only, 200ms) when it mounts in the same commit a
 * loading skeleton left, so loaded content doesn't land in a single frame.
 * Plain navigations, with no skeleton before them, show at once. Opacity
 * isn't movement, so this stays on under reduced motion.
 */
function useFadeInAfterSkeleton(ref: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    if (performance.now() - skeletonLeftAt > 100) return
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT })
  }, [ref])
}

export { Skeleton, useFadeInAfterSkeleton }
