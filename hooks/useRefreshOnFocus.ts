import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Re-run `refresh` each time the screen regains focus (e.g. coming back from a detail screen),
 * but not on the very first focus — the data hook already loads on mount.
 */
export function useRefreshOnFocus(refresh: () => void) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );
}
