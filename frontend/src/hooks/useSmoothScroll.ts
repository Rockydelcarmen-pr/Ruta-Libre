import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Momentum / inertia scrolling via Lenis. Disabled when the user prefers
 * reduced motion. Native touch inertia is left alone (smoothTouch off).
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });

    let rafId = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}
