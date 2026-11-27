// Strength loading: estimated 5RM / 1RM from logged sets, load ranges, block RIR targets.
//
// Decided 26 Nov 2026 (project brief, section 2):
//   - No separate 5RM test. Week 1 of the first block (everyone at RIR 3) is the baseline.
//   - Every logged set (weight, reps, RIR) updates the estimate, so the range moves with the member:
//     sets logged further from failure than the target push the range up, closer push it down.
//   - Level changes the weights only, never the exercises or the number of sets.
//
// The estimate uses Epley with reps in reserve added to the reps done:
//   1RM ≈ weight × (1 + (reps + RIR) / 30)

export interface LoggedSet {
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  logged_at: string;
  completion_id?: string;
  is_calibration?: boolean;
}

/** RIR above this says little about the true max, so it is capped. */
export const MAX_USEFUL_RIR = 5;

export const estimate1RM = (weightKg: number, reps: number, rir: number): number =>
  weightKg * (1 + (reps + Math.min(Math.max(rir, 0), MAX_USEFUL_RIR)) / 30);

export const estimate5RM = (oneRm: number): number => oneRm / (1 + 5 / 30);

/** The load that gives `reps` reps with `rir` reps left, for a given 1RM. */
export const loadFor = (oneRm: number, reps: number, rir: number): number => oneRm / (1 + (reps + rir) / 30);

export const roundTo = (value: number, increment: number, mode: 'down' | 'up' | 'nearest' = 'nearest') => {
  const f = mode === 'down' ? Math.floor : mode === 'up' ? Math.ceil : Math.round;
  return Math.round(f(value / increment) * increment * 100) / 100;
};

/** Smallest load jumps (LURE 3.4): 1–2.5 kg upper body, 2.5–5 kg lower body. */
export const loadIncrement = (pattern: string | null | undefined): number =>
  pattern === 'squat' || pattern === 'hinge' || pattern === 'single_leg' ? 2.5 : 1;

/** "8-10", "8–10", "10", "10/leg", "3 x 8-10" → { low, high }. Null when there are no reps. */
export const parseRepRange = (reps: string): { low: number; high: number } | null => {
  const m = reps.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { low: Number(m[1]), high: Number(m[2]) };
  const single = reps.match(/(\d+)/g);
  if (!single) return null;
  const n = Number(single[single.length - 1]);
  return { low: n, high: n };
};

/**
 * Current 1RM estimate from logged sets: the best set of each of the last 3 sessions, averaged.
 * Sets without weight, reps or RIR are skipped.
 */
export const current1RM = (sets: LoggedSet[]): number | null => {
  const usable = sets.filter(
    (s) => s.weight_kg != null && s.weight_kg > 0 && s.reps != null && s.reps > 0 && s.rir != null,
  );
  if (usable.length === 0) return null;
  const bySession = new Map<string, { at: string; best: number }>();
  for (const s of usable) {
    const key = s.completion_id ?? s.logged_at.slice(0, 10);
    const e = estimate1RM(Number(s.weight_kg), Number(s.reps), Number(s.rir));
    const prev = bySession.get(key);
    const at = !prev || s.logged_at > prev.at ? s.logged_at : prev.at;
    bySession.set(key, { at, best: Math.max(e, prev?.best ?? 0) });
  }
  const recent = [...bySession.values()].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 3);
  return recent.reduce((sum, r) => sum + r.best, 0) / recent.length;
};

/** Load range for a prescription, e.g. 3 × 8–10 at RIR 2 → 24–28 kg. */
export const loadRange = (
  oneRm: number,
  reps: string,
  rir: number,
  increment = 2.5,
): { low: number; high: number } | null => {
  const range = parseRepRange(reps);
  if (!range) return null;
  const low = roundTo(loadFor(oneRm, range.high, rir), increment, 'down');
  const high = roundTo(loadFor(oneRm, range.low, rir), increment, 'nearest');
  return { low, high: Math.max(low, high) };
};

// ── The 4-week block (LURE 3.7) ─────────────────────────────────────────

export interface WeekTarget {
  /** Target reps in reserve on main compound lifts. */
  rirMain: number;
  /** Target reps in reserve on accessories. */
  rirAccessory: number;
  /** Label shown to the member, e.g. "RIR 1–2". */
  label: string;
  /** Sets added on top of the prescription this week. */
  extraSets: number;
  isDeload: boolean;
}

export const weekTarget = (weekInBlock: number, deloadWeek = 4): WeekTarget => {
  if (weekInBlock === deloadWeek) return { rirMain: 4, rirAccessory: 3, label: 'Deload · RIR 4', extraSets: 0, isDeload: true };
  if (weekInBlock <= 1) return { rirMain: 3, rirAccessory: 2, label: 'RIR 3', extraSets: 0, isDeload: false };
  if (weekInBlock === 2) return { rirMain: 2, rirAccessory: 1, label: 'RIR 2', extraSets: 0, isDeload: false };
  return { rirMain: 1, rirAccessory: 0, label: 'RIR 1–2', extraSets: 1, isDeload: false };
};

/**
 * Plan note for a main lift, from the RIR the member logged over recent sessions.
 * Logged RIR at least 2 above target for two sessions → suggest a load jump.
 */
export const rirTrend = (
  recentSessionRir: number[],
  targetRir: number,
): 'progress' | 'hold' | 'reduce' => {
  if (recentSessionRir.length < 2) return 'hold';
  const last2 = recentSessionRir.slice(0, 2);
  if (last2.every((r) => r >= targetRir + 2)) return 'progress';
  if (last2.every((r) => r <= targetRir - 2)) return 'reduce';
  return 'hold';
};
