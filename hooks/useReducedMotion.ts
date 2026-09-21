import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the OS "Reduce Motion" accessibility setting is on.
 * Starts `false` (animate) and flips as soon as the async platform query resolves,
 * then follows live changes. Non-essential animation MUST be skipped when this is true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      AccessibilityInfo.isReduceMotionEnabled?.()
        .then((v) => {
          if (mounted) setReduced(Boolean(v));
        })
        .catch(() => {});
    } catch {
      /* platform without the API — keep default */
    }
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
      if (mounted) setReduced(Boolean(v));
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
