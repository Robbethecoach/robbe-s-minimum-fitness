// Session composer: turns Robbe's placements for one session into what one member does.
//
// Decided 27 Nov 2026:
//   - Robbe tags each library exercise with a role (main / accessory / extra), a quality
//     (strength / mobility / power), a region (upper / lower / full body / core) and, for main
//     strength lifts, a pattern (squat / hinge / push / pull).
//   - Order is automatic: power first, then main strength, then the mobility block,
//     then accessory strength, then extras. In C/D: main mobility, then accessory mobility.
//   - Supersets: a power or mobility exercise marked "superset ok" is paired with a strength
//     exercise of the other region (power legs with upper strength, mobility shoulders with
//     lower strength). Robbe can fix a pair by hand with `superset_with`.
//   - Extras: dropped at a focus score of 1–2, optional at 3, in at 4–5.
//   - Sessions are 60 minutes by default. When a session runs longer, the member is asked
//     whether to drop the extras or do the full session.
//   - EMOM (optional): every `emom_interval_sec` seconds the member does the reps; one round per set.

import { type FocusProfile, prescribe, type Prescription } from './prescription';

export type Role = 'main' | 'accessory' | 'extra';
export type Quality = 'strength' | 'mobility' | 'power';
export type Region = 'upper' | 'lower' | 'full_body' | 'core';
export type Unit = 'reps' | 'seconds' | 'per_side';

export interface Placement {
  id: string;
  name: string;
  sets: number;
  reps: string;
  role: Role;
  quality: Quality;
  region: Region;
  pattern: string | null;
  unit: Unit;
  superset_ok: boolean;
  superset_with: string | null;
  emom_interval_sec: number | null;
  order_index?: number;
}

export interface SessionItem {
  placement: Placement;
  prescription: Prescription;
  /** "A1", "A2", "B", … */
  label: string;
  /** Shared by the two exercises of a superset. */
  group: string;
  optional: boolean;
  estimatedSeconds: number;
}

export interface ComposedSession {
  items: SessionItem[];
  /** Extras that were left out for this member (focus or time). */
  dropped: Placement[];
  estimatedMinutes: number;
  /** Estimate with every extra included, used for the "longer than your limit" question. */
  fullMinutes: number;
  /** True when extras would push the session past the member's limit. */
  overLimit: boolean;
}

/** Timing used for the duration estimate. Robbe tunes these in the Feed (method_settings 'timing'). */
export interface Timing {
  /** Rest between sets, seconds. */
  rest: Record<Quality, Record<Role, number>>;
  secondsPerRep: number;
  warmUpMinutes: number;
}

export const DEFAULT_TIMING: Timing = {
  rest: {
    strength: { main: 150, accessory: 75, extra: 60 },
    power: { main: 120, accessory: 90, extra: 90 },
    mobility: { main: 30, accessory: 20, extra: 20 },
  },
  secondsPerRep: 4,
  warmUpMinutes: 8,
};

/** Merge saved settings over the defaults, ignoring anything malformed. */
export const timingFrom = (value: unknown): Timing => {
  const v = (value ?? {}) as Partial<Timing>;
  const num = (x: unknown, d: number) => (typeof x === 'number' && x >= 0 && x < 3600 ? x : d);
  const rest = {} as Timing['rest'];
  for (const q of ['strength', 'power', 'mobility'] as Quality[]) {
    rest[q] = {} as Record<Role, number>;
    for (const r of ['main', 'accessory', 'extra'] as Role[]) rest[q][r] = num(v.rest?.[q]?.[r], DEFAULT_TIMING.rest[q][r]);
  }
  return { rest, secondsPerRep: num(v.secondsPerRep, DEFAULT_TIMING.secondsPerRep), warmUpMinutes: num(v.warmUpMinutes, DEFAULT_TIMING.warmUpMinutes) };
};

const ROLE_ORDER: Record<Role, number> = { main: 0, accessory: 1, extra: 2 };

/** Sort key for the automatic order within a session. */
export const orderKey = (p: Placement): number => {
  if (p.quality === 'power') return 0;
  if (p.quality === 'strength' && p.role === 'main') return 1;
  if (p.quality === 'mobility' && p.role === 'main') return 2;
  if (p.quality === 'mobility' && p.role === 'accessory') return 3;
  if (p.quality === 'strength' && p.role === 'accessory') return 4;
  return 5 + ROLE_ORDER[p.role];
};

const focusFor = (q: Quality) => (q === 'mobility' ? 'mobility' : 'strength');

const scoreFor = (profile: FocusProfile, q: Quality) =>
  q === 'mobility' ? profile.focus_mobility : profile.focus_strength;

const repsNumber = (reps: string): number => {
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return 8;
  return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
};

const workSeconds = (p: Placement, reps: string, t: Timing = DEFAULT_TIMING) => {
  const n = repsNumber(reps);
  if (p.unit === 'seconds') return n;
  if (p.unit === 'per_side') return n * t.secondsPerRep * 2;
  return n * t.secondsPerRep;
};

export const estimateSeconds = (p: Placement, rx: Prescription, t: Timing = DEFAULT_TIMING): number => {
  if (p.emom_interval_sec) return rx.sets * p.emom_interval_sec;
  return rx.sets * (workSeconds(p, rx.reps, t) + t.rest[p.quality][p.role]);
};

const opposite = (a: Region, b: Region) =>
  (a === 'upper' && b === 'lower') || (a === 'lower' && b === 'upper');

/** Pair power/mobility exercises with strength of the other region. Returns id → partner id. */
export const pairSupersets = (placements: Placement[]): Map<string, string> => {
  const pairs = new Map<string, string>();
  const link = (a: string, b: string) => {
    pairs.set(a, b);
    pairs.set(b, a);
  };
  for (const p of placements) {
    if (p.superset_with && !pairs.has(p.id) && !pairs.has(p.superset_with) && placements.some((x) => x.id === p.superset_with)) {
      link(p.id, p.superset_with);
    }
  }
  const strength = placements
    .filter((p) => p.quality === 'strength')
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  for (const p of placements) {
    if (pairs.has(p.id) || !p.superset_ok || p.quality === 'strength') continue;
    const partner = strength.find((s) => !pairs.has(s.id) && opposite(p.region, s.region));
    if (partner) link(p.id, partner.id);
  }
  return pairs;
};

export const composeSession = (
  placements: Placement[],
  profile: FocusProfile,
  opts: {
    weekInBlock: number;
    deloadWeek: number;
    sessionMinutes?: number;
    /** The member chose "full session" for this one. */
    includeAllExtras?: boolean;
    /** Power can be switched off per block, and is dropped in the deload week. */
    powerIncluded?: boolean;
    timing?: Timing;
  },
): ComposedSession => {
  const t = opts.timing ?? DEFAULT_TIMING;
  const limit = opts.sessionMinutes ?? 60;
  const deload = opts.weekInBlock === opts.deloadWeek;
  const powerOn = (opts.powerIncluded ?? true) && !deload;

  const sorted = placements
    .filter((p) => powerOn || p.quality !== 'power')
    .slice()
    .sort((a, b) => orderKey(a) - orderKey(b) || (a.order_index ?? 0) - (b.order_index ?? 0));

  const focusDropped = sorted.filter((p) => p.role === 'extra' && scoreFor(profile, p.quality) <= 2);
  const candidates = sorted.filter((p) => !focusDropped.includes(p));

  const rx = new Map<string, Prescription>();
  for (const p of candidates) {
    rx.set(p.id, prescribe({ sets: p.sets, reps: p.reps, focus: focusFor(p.quality), is_main_lift: p.role === 'main' && p.quality === 'strength' }, profile, {
      weekInBlock: opts.weekInBlock,
      deloadWeek: opts.deloadWeek,
    }));
  }

  const minutesFor = (list: Placement[]) => {
    const pairs = pairSupersets(list);
    let seconds = t.warmUpMinutes * 60;
    const counted = new Set<string>();
    for (const p of list) {
      if (counted.has(p.id)) continue;
      const partnerId = pairs.get(p.id);
      const partner = partnerId ? list.find((x) => x.id === partnerId) : undefined;
      if (partner) {
        // In a superset the work adds up, the rest is shared.
        const a = rx.get(p.id)!;
        const b = rx.get(partner.id)!;
        const sets = Math.max(a.sets, b.sets);
        seconds += sets * (workSeconds(p, a.reps, t) + workSeconds(partner, b.reps, t) + Math.max(t.rest[p.quality][p.role], t.rest[partner.quality][partner.role]));
        counted.add(partner.id);
      } else {
        seconds += estimateSeconds(p, rx.get(p.id)!, t);
      }
      counted.add(p.id);
    }
    return Math.round(seconds / 60);
  };

  const fullMinutes = minutesFor(candidates);
  const withoutExtras = candidates.filter((p) => p.role !== 'extra');
  const overLimit = fullMinutes > limit && withoutExtras.length < candidates.length;
  const keep = overLimit && !opts.includeAllExtras ? withoutExtras : candidates;
  const dropped = [...focusDropped, ...candidates.filter((p) => !keep.includes(p))];

  // Labels: supersets share a letter (A1/A2), singles get their own letter.
  const pairs = pairSupersets(keep);
  const items: SessionItem[] = [];
  const done = new Set<string>();
  let letter = 0;
  for (const p of keep) {
    if (done.has(p.id)) continue;
    const L = String.fromCharCode(65 + letter++);
    const partnerId = pairs.get(p.id);
    const partner = partnerId ? keep.find((x) => x.id === partnerId) : undefined;
    // Power always goes first in its superset; otherwise strength first.
    const members = partner
      ? [p, partner].sort((a, b) => (a.quality === 'power' ? -1 : b.quality === 'power' ? 1 : a.quality === 'strength' ? -1 : 1))
      : [p];
    members.forEach((m, i) => {
      const prescription = rx.get(m.id)!;
      items.push({
        placement: m,
        prescription,
        label: partner ? `${L}${i + 1}` : L,
        group: L,
        optional: m.role === 'extra' && scoreFor(profile, m.quality) === 3,
        estimatedSeconds: estimateSeconds(m, prescription, t),
      });
      done.add(m.id);
    });
  }

  return { items, dropped, estimatedMinutes: minutesFor(keep), fullMinutes, overLimit };
};

/** "Lower body strength", "Upper body power", "Mobility" … for labels in the overview. */
export const focusLabel = (p: Pick<Placement, 'quality' | 'region'>): string => {
  const region = p.region === 'full_body' ? 'Full body' : p.region === 'core' ? 'Core' : p.region === 'upper' ? 'Upper body' : 'Lower body';
  if (p.quality === 'mobility') return p.region === 'full_body' ? 'Mobility' : `Mobility · ${region.toLowerCase()}`;
  return `${region} ${p.quality}`;
};

export const roleLabel = (role: Role) => (role === 'main' ? 'Main lift' : role === 'accessory' ? 'Accessory' : 'Extra');

/**
 * Placements for a session code. U1 / U2 / L regroup the A and B exercises
 * (same exercises): U1 = upper part of A, U2 = upper part of B, L = lower and core of both.
 * A dedicated session uploaded under that code wins.
 */
export const placementsForSession = (code: string, byCode: Record<string, Placement[] | undefined>): Placement[] => {
  if (byCode[code]?.length) return byCode[code]!;
  const lowerish = (p: Placement) => p.region === 'lower' || p.region === 'core';
  if (code === 'U1') return (byCode.A ?? []).filter((p) => !lowerish(p));
  if (code === 'U2') return (byCode.B ?? []).filter((p) => !lowerish(p));
  if (code === 'L') return [...(byCode.A ?? []), ...(byCode.B ?? [])].filter(lowerish);
  if (code === 'D') return byCode.C ?? []; // D empty → C twice
  return [];
};
