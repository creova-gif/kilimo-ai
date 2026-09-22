import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** A short-lived success message that is also announced to screen readers. */
export function useNotice(durationMs = 3500) {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const show = useCallback(
    (message: string) => {
      setNotice(message);
      try {
        AccessibilityInfo.announceForAccessibility(message);
      } catch {
        /* not available (web / tests) */
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(null), durationMs);
    },
    [durationMs]
  );

  const clear = useCallback(() => setNotice(null), []);
  return { notice, show, clear };
}
