import type { Sequence, ContinueLoopState, SchedulerResult } from './types';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

function getDurationSeconds(seq: Sequence): number {
  const sec = parsePositiveInt(seq?.loopDurationSec, 0);
  return Math.max(1, sec || 10);
}

function sortContinueSequences(list: Sequence[]): Sequence[] {
  return [...list].sort((a, b) => {
    const orderA = parsePositiveInt(a.loopOrder, Number.MAX_SAFE_INTEGER);
    const orderB = parsePositiveInt(b.loopOrder, Number.MAX_SAFE_INTEGER);
    if (orderA !== orderB) return orderA - orderB;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function getContinueSignature(list: Sequence[]): string {
  return list
    .map(seq => `${seq.id}:${parsePositiveInt(seq.loopOrder, 0)}:${getDurationSeconds(seq)}`)
    .join('|');
}

/**
 * Compute ms remaining until endTime today (or midnight if no endTime).
 * nowDate is the current Date object used for computing.
 */
function msUntilEndTime(nowDate: Date, endTime: string | undefined): number {
  if (endTime) {
    const [h, m] = endTime.split(':').map(Number);
    const endMs = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), h, m, 0, 0).getTime();
    const diff = endMs - nowDate.getTime();
    return diff > 0 ? diff : 1000; // if already past (shouldn't happen), re-evaluate in 1s
  }
  // No endTime — expire at midnight
  const midnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1, 0, 0, 0, 0).getTime();
  return midnight - nowDate.getTime();
}

/**
 * Pure function — port of server/lib/sequences.js resolveActiveSequence (lines 194-257).
 * Additionally computes expiresInMs for precise timer scheduling.
 *
 * loopState is mutated in-place (same pattern as the server).
 */
export function resolveSequence(
  sequences: Sequence[],
  nowMs: number,
  loopState: ContinueLoopState,
): SchedulerResult | null {
  const now = new Date(nowMs);
  const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentDay = DAY_NAMES[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  // --- Priority 1: Custom schedules ---
  const customMatching = sequences.filter(seq => {
    if (seq.scheduleType !== 'custom') return false;
    if (seq.startTime && currentTime < seq.startTime) return false;
    if (seq.endTime && currentTime > seq.endTime) return false;
    if (seq.startDate && currentDate < seq.startDate) return false;
    if (seq.endDate && currentDate > seq.endDate) return false;
    if (!Array.isArray(seq.days) || seq.days.length === 0) return true;
    return seq.days.includes(currentDay);
  });

  if (customMatching.length > 0) {
    customMatching.sort((a, b) => {
      const dateA = a.startDate || '';
      const dateB = b.startDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    const winner = customMatching[0];
    return {
      layoutId: winner.layoutId,
      zones: winner.zones,
      customLayout: winner.customLayout || null,
      sequenceId: winner.id,
      expiresInMs: msUntilEndTime(now, winner.endTime),
    };
  }

  // --- Priority 2: Continue loop ---
  const continueSequences = sortContinueSequences(
    sequences.filter(seq => seq.scheduleType === 'continue'),
  );

  if (continueSequences.length > 0) {
    const signature = getContinueSignature(continueSequences);
    if (loopState.signature !== signature) {
      loopState.signature = signature;
      loopState.index = 0;
      loopState.startedAtMs = nowMs;
    } else if (!loopState.startedAtMs) {
      loopState.startedAtMs = nowMs;
    }

    let guard = continueSequences.length + 2;
    while (guard > 0) {
      const currentSeq = continueSequences[loopState.index % continueSequences.length];
      const durationMs = getDurationSeconds(currentSeq) * 1000;
      const elapsed = nowMs - loopState.startedAtMs;
      if (elapsed < durationMs) {
        return {
          layoutId: currentSeq.layoutId,
          zones: currentSeq.zones,
          customLayout: currentSeq.customLayout || null,
          sequenceId: currentSeq.id,
          expiresInMs: durationMs - elapsed,
        };
      }
      loopState.startedAtMs += durationMs;
      loopState.index = (loopState.index + 1) % continueSequences.length;
      guard -= 1;
    }

    // Fallback within continue loop
    const fallbackSeq = continueSequences[loopState.index % continueSequences.length];
    const durationMs = getDurationSeconds(fallbackSeq) * 1000;
    return {
      layoutId: fallbackSeq.layoutId,
      zones: fallbackSeq.zones,
      customLayout: fallbackSeq.customLayout || null,
      sequenceId: fallbackSeq.id,
      expiresInMs: durationMs,
    };
  }

  // --- No sequence ---
  return null;
}
