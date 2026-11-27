// Prescription: how one shared session template becomes a member's own plan for a week.
//
// Everyone does the same exercises (workout_blocks + exercises = Robbe's 4-week upload).
// What differs per member (decided 26 Nov 2026):
//   - sets scale with how much focus the member puts on that quality (scores 1–5);
//   - every exercise keeps at least 2 sets;
//   - the block week sets the effort (RIR) and adds a set in week 3; the deload halves the sets;
//   - accepted suggestions can override one exercise for one member;
//   - level changes the weights only (see strength.ts), never exercises or sets.

import { weekTarget } from './strength';

export type Focus = 'strength' | 'conditioning' | 'mobility';

export interface FocusProfile {
  focus_strength: number;
  focus_conditioning: number;
  focus_mobility: number;
}

export const MIN_SETS = 2;

/**
 * PLACEHOLDER (Robbe to set): extra sets per focus score.
 * Score 1–2 = one set less, 3 = as written, 4–5 = one set more.
 */
export const setDeltaForScore = (score: number): number => (score <= 2 ? -1 : score >= 4 ? 1 : 0);

export const focusScore = (profile: FocusProfile, focus: Focus): number =>
  focus === 'strength' ? profile.focus_strength
  : focus === 'conditioning' ? profile.focus_conditioning
  : profile.focus_mobility;

export interface ExerciseOverride {
  sets: number | null;
  reps: string | null;
  target_load_kg: number | null;
  paused: boolean;
}

export interface Prescription {
  sets: number;
  reps: string;
  /** Target reps in reserve for this week. */
  rir: number;
  rirLabel: string;
  targetLoadKg: number | null;
  paused: boolean;
  isDeload: boolean;
}

/**
 * Sets, reps and RIR for one exercise, for one member, in one week.
 * Order: template → focus → block week → member override → deload → minimum of 2 sets.
 */
export const prescribe = (
  exercise: { sets: number; reps: string; focus?: string | null; is_main_lift?: boolean | null },
  profile: FocusProfile,
  opts: { weekInBlock: number; deloadWeek: number; override?: ExerciseOverride | null },
): Prescription => {
  const focus = (exercise.focus ?? 'strength') as Focus;
  const target = weekTarget(opts.weekInBlock, opts.deloadWeek);
  const override = opts.override;

  let sets = exercise.sets + setDeltaForScore(focusScore(profile, focus)) + target.extraSets;
  let reps = exercise.reps;
  if (override?.sets != null) sets = override.sets;
  if (override?.reps) reps = override.reps;
  if (target.isDeload) sets = Math.ceil(sets / 2);

  const rir = exercise.is_main_lift ? target.rirMain : target.rirAccessory;
  return {
    sets: Math.max(MIN_SETS, sets),
    reps,
    rir,
    rirLabel: target.isDeload ? 'Deload · RIR 4' : exercise.is_main_lift ? target.label : `RIR ${rir}`,
    targetLoadKg: override?.target_load_kg ?? null,
    paused: override?.paused ?? false,
    isDeload: target.isDeload,
  };
};

/** Week of the 4-week block (1–4), counted from the block start date. */
export const weekInBlock = (blockStart: Date, today: Date): number => {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.floor((today.getTime() - blockStart.getTime()) / msPerWeek);
  return (Math.max(0, weeks) % 4) + 1;
};
