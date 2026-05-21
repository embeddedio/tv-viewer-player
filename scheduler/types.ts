import type { LayoutNode, ZoneConfig } from '../layouts';

export interface Sequence {
  id: string;
  name: string;
  scheduleType: 'continue' | 'custom';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  days: string[];
  loopDurationSec: number;
  loopOrder: number;
  layoutId: string;
  customLayout: LayoutNode | null;
  zones: Record<string, ZoneConfig>;
  createdAt: number;
  updatedAt: number;
}

export interface ContinueLoopState {
  signature: string;
  index: number;
  startedAtMs: number;
}

export interface SchedulerResult {
  layoutId: string;
  zones: Record<string, ZoneConfig>;
  customLayout: LayoutNode | null;
  sequenceId: string | null;
  expiresInMs: number | null;
}
