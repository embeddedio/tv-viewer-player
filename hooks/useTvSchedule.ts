import { useCallback, useEffect, useRef, useState } from "react";
import { NativeModules } from "react-native";

const { CecPower } = NativeModules;

export interface TvSchedule {
  enabled: boolean;
  startTime: string; // "HH:MM"
  stopTime: string;  // "HH:MM"
  days: number[];    // 0=Sun, 1=Mon, ..., 6=Sat
}

const DEFAULT_SCHEDULE: TvSchedule = {
  enabled: false,
  startTime: "08:00",
  stopTime: "22:00",
  days: [1, 2, 3, 4, 5],
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function shouldTvBeOn(schedule: TvSchedule): boolean {
  if (!schedule.enabled) return true; // no schedule = always on

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(schedule.startTime);
  const stop = timeToMinutes(schedule.stopTime);

  // Day not in active days -> TV should be off all day
  if (!schedule.days.includes(currentDay)) return false;

  // Check time window
  if (start <= stop) {
    // Normal: e.g. 08:00 - 22:00
    return currentMinutes >= start && currentMinutes < stop;
  } else {
    // Overnight: e.g. 22:00 - 06:00
    return currentMinutes >= start || currentMinutes < stop;
  }
}

export function useTvSchedule(baseUrl: string) {
  const [schedule, setSchedule] = useState<TvSchedule>(DEFAULT_SCHEDULE);
  const lastStateRef = useRef<boolean | null>(null);

  const fetchSchedule = useCallback(() => {
    fetch(`${baseUrl}/api/tv-schedule`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.enabled === "boolean") {
          setSchedule(data);
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  const applySchedule = useCallback((s: TvSchedule) => {
    if (s && typeof s.enabled === "boolean") {
      setSchedule(s);
    }
  }, []);

  // Timer: check every 30s if TV should be on or off
  useEffect(() => {
    if (!schedule.enabled) {
      // Schedule disabled — make sure TV is on, then stop checking
      if (lastStateRef.current === false && CecPower) {
        CecPower.turnOnTv().catch(() => {});
      }
      lastStateRef.current = null;
      return;
    }

    if (!CecPower) return;

    const check = () => {
      const wantOn = shouldTvBeOn(schedule);

      // Only send CEC command when state actually changes
      if (lastStateRef.current === wantOn) return;
      lastStateRef.current = wantOn;

      if (wantOn) {
        CecPower.turnOnTv().catch(() => {});
      } else {
        CecPower.turnOffTv().catch(() => {});
      }
    };

    // Run check immediately, then every 30 seconds
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [schedule.enabled, schedule.startTime, schedule.stopTime, JSON.stringify(schedule.days)]);

  return { schedule, fetchSchedule, applySchedule };
}
