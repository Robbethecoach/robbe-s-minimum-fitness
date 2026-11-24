// Prescription rules: how one shared session template becomes a member's own plan.
//
// Everyone does the same session variation. What differs per member:
//   - focus (strength / conditioning / mobility) → more or fewer sets
//   - deload timing (member_plans.deload_week)
//   - overrides from accepted suggestions (member_exercise_overrides)
//
// PLACEHOLDER VALUES: the numbers below are starting points. Robbe sets the real ones.

export type Focus = 'strength' | 'conditioning' | 'mobility';
export type FocusLevel = 1 | 2 | 3; // 1 = low, 2 = medium, 3 = high
export type SessionRating = 'too_easy' | 'right' | 'too_hard';

export interface FocusProfile {
  focus_strength: number;
  focus_conditioning: number;
  focus_mobility: number;
}

/** Extra sets per focus level. Low focus = one set less, high focus = one set more. */
export const SET_DELTA_BY_FOCUS: Record<FocusLevel, number> = { 1: -1, 2: 0, 3: 1 };

/** Share of normal sets kept in a deload week. */
export const DELOAD_SET_FACTOR = 0.6;

export const MIN_DAYS = 3;
export const MAX_DAYS = 6;

export const focusLevel = (profile: FocusProfile, focus: Focus): FocusLevel => {
  const value =
    focus === 'strength' ? profile.focus_strength
    : focus === 'conditioning' ? profile.focus_conditioning
    : profile.focus_mobility;
  return (Math.min(3, Math.max(1, Math.round(value))) as FocusLevel);
};

export interface ExerciseOverride {
  sets: number | null;
  reps: string | null;
  target_load_kg: number | null;
  paused: boolean;
}

export interface Prescription {
  sets: number;
  reps: string;
  targetLoadKg: number | null;
  paused: boolean;
  isDeload: boolean;
}

/**
 * Sets and reps for one exercise for one member in one week.
 * Order: template → focus → member override (from suggestions) → deload.
 */
export const prescribe = (
  exercise: { sets: number; reps: string; focus?: string | null },
  profile: FocusProfile,
  opts: { weekInBlock: number; deloadWeek: number; override?: ExerciseOverride | null },
): Prescription => {
  const focus = (exercise.focus ?? 'strength') as Focus;
  let sets = exercise.sets + SET_DELTA_BY_FOCUS[focusLevel(profile, focus)];
  let reps = exercise.reps;
  const override = opts.override;

  if (override?.sets != null) sets = override.sets;
  if (override?.reps) reps = override.reps;

  const isDeload = opts.weekInBlock === opts.deloadWeek;
  if (isDeload) sets = Math.round(sets * DELOAD_SET_FACTOR);

  return {
    sets: Math.max(1, sets),
    reps,
    targetLoadKg: override?.target_load_kg ?? null,
    paused: override?.paused ?? false,
    isDeload,
  };
};

export const REQUIRED_SESSIONS = ['strength_a', 'strength_b', 'conditioning_a', 'conditioning_b'] as const;
export const OPTIONAL_SESSIONS = ['mobility_flow', 'recovery_run'] as const;

/**
 * Which required sessions a member does, in what order.
 * Strength and conditioning alternate so similar sessions don't land back to back.
 * The quality with the higher focus goes first, so with 3 days it gets both A and B.
 * PLACEHOLDER: Robbe to confirm the 3-day rule.
 */
export const orderRequiredSessions = (profile: FocusProfile, trainingDays: number): string[] => {
  const conditioningFirst = profile.focus_conditioning > profile.focus_strength;
  const first = conditioningFirst ? 'conditioning' : 'strength';
  const second = conditioningFirst ? 'strength' : 'conditioning';
  const order = [`${first}_a`, `${second}_a`, `${first}_b`, `${second}_b`];
  return order.slice(0, Math.min(trainingDays, order.length));
};

/** Optional sessions for spare training days: mobility first when mobility focus is high. */
export const orderOptionalSessions = (profile: FocusProfile): string[] =>
  profile.focus_mobility >= 3 ? ['mobility_flow', 'recovery_run'] : ['recovery_run', 'mobility_flow'];

/** Week of the 4-week block (1–4), counted from the block start date. */
export const weekInBlock = (blockStart: Date, today: Date): number => {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.floor((today.getTime() - blockStart.getTime()) / msPerWeek);
  return ((Math.max(0, weeks) % 4) + 1);
};
