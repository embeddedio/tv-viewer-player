import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ActiveDisplay } from '../layouts';
import type { Sequence, ContinueLoopState } from '../scheduler/types';
import { resolveSequence } from '../scheduler/resolveSequence';

const SAFETY_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const RETRY_DELAYS = [3000, 6000, 12000];

export function useScheduler(baseUrl: string): {
  activeDisplay: ActiveDisplay | null;
  isLoading: boolean;
  refetchSequences: () => void;
} {
  const [activeDisplay, setActiveDisplay] = useState<ActiveDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sequencesRef = useRef<Sequence[]>([]);
  const loopStateRef = useRef<ContinueLoopState>({
    signature: '',
    index: 0,
    startedAtMs: 0,
  });
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Use a ref for evaluate so fetchSequences always calls the latest version
  const evaluateRef = useRef<() => void>(() => {});

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  // evaluate is assigned to a ref to avoid stale closures
  evaluateRef.current = () => {
    if (!mountedRef.current) return;

    const result = resolveSequence(
      sequencesRef.current,
      Date.now(),
      loopStateRef.current,
    );

    console.log(
      '[useScheduler] evaluate result =',
      result ? `${result.sequenceId || 'no-id'} / ${result.layoutId}` : 'null'
    );

    if (result) {
      setActiveDisplay({
        layoutId: result.layoutId as ActiveDisplay['layoutId'],
        zones: result.zones,
        customLayout: result.customLayout,
      });
    } else {
      setActiveDisplay(null);
    }
    setIsLoading(false);

    // Schedule next transition
    clearTransitionTimer();
    if (result?.expiresInMs != null && result.expiresInMs > 0) {
      const delay = result.expiresInMs + 50; // 50ms buffer
      transitionTimerRef.current = setTimeout(() => {
        if (mountedRef.current) evaluateRef.current();
      }, delay);
    }
  };

  const fetchSequences = useCallback(async () => {
    try {
      console.log('[useScheduler] Fetching', `${baseUrl}/api/app/sequences`);
      const response = await fetch(`${baseUrl}/api/app/sequences`);
      const data = await response.json();
      console.log(
        '[useScheduler] Received sequence count =',
        Array.isArray(data?.sequences) ? data.sequences.length : 'invalid'
      );
      if (data?.sequences && Array.isArray(data.sequences)) {
        sequencesRef.current = data.sequences;
        retryCountRef.current = 0;
        evaluateRef.current();
      }
    } catch (e) {
      console.log('[useScheduler] Fetch failed');
      const retryIndex = Math.min(retryCountRef.current, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[retryIndex];
      retryCountRef.current += 1;
      setTimeout(() => {
        if (mountedRef.current) fetchSequences();
      }, delay);
    }
  }, [baseUrl]);

  // Mount: setup safety interval (initial fetch is triggered by App.tsx via refetchSequences)
  useEffect(() => {
    mountedRef.current = true;

    safetyIntervalRef.current = setInterval(() => {
      fetchSequences();
    }, SAFETY_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearTransitionTimer();
      if (safetyIntervalRef.current !== null) {
        clearInterval(safetyIntervalRef.current);
        safetyIntervalRef.current = null;
      }
    };
  }, [fetchSequences, clearTransitionTimer]);

  // AppState: re-evaluate on foreground return
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        evaluateRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  return { activeDisplay, isLoading, refetchSequences: fetchSequences };
}
