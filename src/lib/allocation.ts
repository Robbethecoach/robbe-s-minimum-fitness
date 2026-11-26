// Weekly allocation: which sessions a member does, and on which day.
//
// Model decided with Robbe on 26 Nov 2026 (see the project brief, section 2):
//   A = upper push + lower push (squat), B = upper pull + lower pull (hinge),
//   C/D = mobility, E = intensive conditioning, F = zone 2.
//   U1/U2/L = the strength-focus split (same exercises as A/B, regrouped).
//   RUN = a session from the member's running plan (when a running goal is set).
//
// Rules:
//   1. A and B are always in the week, and every member gets at least one zone 2 session.
//   2. 3 days: A · F · B, with F replaced by an intensive session once every 4 weeks.
//   3. Remaining days go to the qualities in proportion to the focus scores (1–5, relative).
//   4. 3 strength sessions → the U1 · U2 · L split instead of repeating A or B.
//   5. A running goal replaces E/F with running-plan sessions; around them only A and B.
//   6. No intervals for members who haven't completed the 30-minute test.
// Sequencing (LURE 3.6, 9.8): no intervals the day before heavy legs, no two hard days
// back to back where it can be avoided, repeated strength sessions spread out.

export type SessionCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'U1' | 'U2' | 'L' | 'RUN';

export interface FocusScores {
  strength: number;
  mobility: number;
  conditioning: number;
}

export interface AllocationInput {
  scores: FocusScores;
  days: number;
  /** Set when the member chose a running goal: the running plan fills the conditioning days. */
  runningGoal?: boolean;
  /** False until the member has completed the 30-minute test: no intervals before that. */
  canDoIntervals?: boolean;
  /** Week of the 4-week block (1–4). */
  weekInBlock?: number;
}

export const MIN_DAYS = 3;
export const MAX_DAYS = 6;

/**
 * PLACEHOLDER (Robbe to confirm): in which week of the block the 3-day member's
 * zone 2 session becomes an intensive session. Not the deload week.
 */
export const THREE_DAY_INTENSITY_WEEK = 2;

export const SESSION_NAMES: Record<SessionCode, string> = {
  A: 'Push',
  B: 'Pull',
  C: 'Mobility',
  D: 'Mobility',
  E: 'Intervals',
  F: 'Zone 2',
  U1: 'Upper push',
  U2: 'Upper pull',
  L: 'Lower',
  RUN: 'Run',
};

export const STRENGTH_SESSIONS: SessionCode[] = ['A', 'B', 'U1', 'U2', 'L'];
export const LEG_SESSIONS: SessionCode[] = ['A', 'B', 'L'];
export const HARD_SESSIONS: SessionCode[] = ['A', 'B', 'U1', 'U2', 'L', 'E'];

const clampScore = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
export const clampDays = (n: number) => Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n)));

type Quality = keyof FocusScores;
/**
 * PLACEHOLDER (Robbe to confirm): how much of the base week already "counts" for each quality
 * when extra days are handed out. A and B are a floor for everyone, so strength counts for 1.5
 * rather than 2: a strength-focused member still gets the extra day, a balanced member gets
 * conditioning or mobility first.
 */
const BASE_SHARE: Record<Quality, number> = { strength: 1.5, conditioning: 1, mobility: 1 };

/** Tie-break order when two qualities score the same. */
const TIE_ORDER: Quality[] = ['strength', 'conditioning', 'mobility'];

/** How the extra days (beyond the base 3) are split over the qualities. */
export const distributeExtraDays = (scores: FocusScores, extraDays: number): Record<Quality, number> => {
  const s: FocusScores = {
    strength: clampScore(scores.strength),
    mobility: clampScore(scores.mobility),
    conditioning: clampScore(scores.conditioning),
  };
  const count: Record<Quality, number> = { strength: 0, mobility: 0, conditioning: 0 };
  for (let i = 0; i < extraDays; i++) {
    let best: Quality = TIE_ORDER[0];
    let bestValue = -1;
    for (const q of TIE_ORDER) {
      const value = s[q] / (count[q] + BASE_SHARE[q]);
      if (value > bestValue) {
        bestValue = value;
        best = q;
      }
    }
    count[best]++;
  }
  return count;
};

/** The sessions for one week, before they are placed on days. */
export const allocateSessions = (input: AllocationInput): SessionCode[] => {
  const days = clampDays(input.days);
  const canDoIntervals = input.canDoIntervals ?? true;
  const week = input.weekInBlock ?? 1;

  if (input.runningGoal) {
    return ['A', 'B', ...Array<SessionCode>(days - 2).fill('RUN')];
  }

  const extra = distributeExtraDays(input.scores, days - 3);

  // Strength: 2 → A/B, 3 → U1/U2/L, 4 → A/B twice.
  // PLACEHOLDER (Robbe to confirm): 4 strength sessions as A·B·A·B, or U1·L·U2·L.
  const strengthCount = 2 + extra.strength;
  const strength: SessionCode[] =
    strengthCount === 3 ? ['U1', 'U2', 'L']
    : strengthCount >= 4 ? ['A', 'B', 'A', 'B']
    : ['A', 'B'];

  const mobility: SessionCode[] = Array.from({ length: extra.mobility }, (_, i) => (i % 2 === 0 ? 'C' : 'D'));

  // Conditioning: the base zone 2 session, then E, F, E… for extra days.
  const conditioning: SessionCode[] = ['F'];
  for (let i = 0; i < extra.conditioning; i++) conditioning.push(i % 2 === 0 ? 'E' : 'F');

  if (days === 3 && week === THREE_DAY_INTENSITY_WEEK) conditioning[0] = 'E';
  if (!canDoIntervals) for (let i = 0; i < conditioning.length; i++) conditioning[i] = 'F';

  return [...strength, ...mobility, ...conditioning];
};

// ── Placing sessions on days ────────────────────────────────────────────

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface PlannedDay {
  day: Weekday;
  session: SessionCode | null;
}

const isHard = (s: SessionCode | null) => !!s && HARD_SESSIONS.includes(s);
const isLegs = (s: SessionCode | null) => !!s && LEG_SESSIONS.includes(s);
const isStrength = (s: SessionCode | null) => !!s && STRENGTH_SESSIONS.includes(s);

/** Penalty for a full week (7 slots, Mon–Sun). The week wraps: Sunday is followed by Monday. */
export const weekPenalty = (week: (SessionCode | null)[]): number => {
  let penalty = 0;
  for (let i = 0; i < 7; i++) {
    const today = week[i];
    const tomorrow = week[(i + 1) % 7];
    if (today === 'E' && isLegs(tomorrow)) penalty += 100; // never intervals the day before legs
    if (isHard(today) && isHard(tomorrow)) penalty += 10; // avoid two hard days in a row
    if (today && today === tomorrow) penalty += 5; // same session two days running
    if (isStrength(today) && isStrength(tomorrow)) penalty += 3; // spread strength
  }
  return penalty;
};

const permutations = <T,>(items: T[]): T[][] => {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) {
      const candidate = [item, ...p];
      const key = candidate.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(candidate);
      }
    }
  });
  return out;
};

/**
 * Put the sessions on the member's preferred days with the lowest penalty.
 * Ties keep strength first in the week (the priority gets the freshest slot).
 */
export const scheduleWeek = (sessions: SessionCode[], preferredDays: string[]): PlannedDay[] => {
  const days = WEEKDAYS.filter((d) => preferredDays.includes(d));
  const slots = days.slice(0, sessions.length);
  const toPlace = sessions.slice(0, slots.length);

  let best: (SessionCode | null)[] | null = null;
  let bestPenalty = Infinity;
  for (const order of permutations(toPlace)) {
    const week: (SessionCode | null)[] = WEEKDAYS.map(() => null);
    slots.forEach((d, i) => {
      week[WEEKDAYS.indexOf(d)] = order[i];
    });
    const p = weekPenalty(week);
    if (p < bestPenalty) {
      bestPenalty = p;
      best = week;
    }
  }

  const week = best ?? WEEKDAYS.map(() => null);
  return WEEKDAYS.map((day, i) => ({ day, session: week[i] }));
};

/** Allocation + placement in one call. */
export const planWeek = (input: AllocationInput, preferredDays: string[]): PlannedDay[] =>
  scheduleWeek(allocateSessions({ ...input, days: preferredDays.length || input.days }), preferredDays);
