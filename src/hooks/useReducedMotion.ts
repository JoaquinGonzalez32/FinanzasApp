import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Tracks the OS "Reduce Motion" accessibility setting (and, on web,
 * `prefers-reduced-motion`). Use it to skip looping or decorative animations —
 * shimmer pulses, continuous scale loops, mount fade/slide — for users who are
 * sensitive to motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduced(!!value);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => setReduced(!!value)
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
