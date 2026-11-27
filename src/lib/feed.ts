// Small helpers for Robbe's Feed: the inputs are typed fast, so they accept loose formats.

import type { Placement, Quality, Region, Role, Unit } from './session';

/** "3 × 6–8", "3x6-8", "3 x 45s", "2×8/side" → { sets, reps }. Null when it can't be read. */
export const parseSetsReps = (input: string): { sets: number; reps: string } | null => {
  const m = input.trim().match(/^(\d+)\s*[x×*]\s*(.+)$/i);
  if (!m) return null;
  const sets = Number(m[1]);
  const reps = m[2].trim().replace(/\s*-\s*/g, '–');
  if (!sets || sets > 10 || !reps) return null;
  return { sets, reps };
};

export const formatSetsReps = (sets: number, reps: string) => `${sets} × ${reps}`;

/** "every 2:30", "2:30", "150", "150s", "2.5 min" → seconds. Empty → null. Invalid → NaN. */
export const parseEmom = (input: string): number | null => {
  const v = input.trim().toLowerCase().replace(/^every\s+/, '');
  if (!v) return null;
  const mmss = v.match(/^(\d+):(\d{2})$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const min = v.match(/^(\d+(?:[.,]\d+)?)\s*min/);
  if (min) return Math.round(Number(min[1].replace(',', '.')) * 60);
  const sec = v.match(/^(\d+)\s*s?$/);
  if (sec) return Number(sec[1]);
  return NaN;
};

export const formatEmom = (seconds: number | null) =>
  seconds == null ? '' : `every ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Standard sets × reps per role and quality, so Robbe only types when it's different. */
export const defaultDose = (role: Role, quality: Quality, unit: Unit): { sets: number; reps: string } => {
  if (quality === 'power') return { sets: 3, reps: '3–5' };
  if (quality === 'mobility') return unit === 'seconds' ? { sets: 2, reps: '45' } : { sets: 2, reps: '8' };
  if (role === 'main') return { sets: 3, reps: '6–8' };
  return { sets: 3, reps: '10–12' };
};

export interface LibraryRow {
  id: string;
  name: string;
  role: string;
  quality: string;
  region: string;
  pattern: string | null;
  unit: string;
  superset_ok: boolean;
  emom_interval_sec: number | null;
  default_sets: number;
  default_reps: string;
}

export interface PlacementRow {
  id: string;
  sets: number;
  reps: string;
  role: string | null;
  emom_interval_sec: number | null;
  superset_with: string | null;
  order_index: number;
  library: LibraryRow | null;
  name: string;
}

/** A placement in a block, with its library tags, as the session composer needs it. */
export const toPlacement = (row: PlacementRow): Placement => ({
  id: row.id,
  name: row.library?.name ?? row.name,
  sets: row.sets,
  reps: row.reps,
  role: ((row.role ?? row.library?.role) || 'accessory') as Role,
  quality: (row.library?.quality ?? 'strength') as Quality,
  region: (row.library?.region ?? 'full_body') as Region,
  pattern: row.library?.pattern ?? null,
  unit: (row.library?.unit ?? 'reps') as Unit,
  superset_ok: row.library?.superset_ok ?? false,
  superset_with: row.superset_with,
  emom_interval_sec: row.emom_interval_sec ?? row.library?.emom_interval_sec ?? null,
  order_index: row.order_index,
});

/** Example members for the block previews in the Feed. */
export const PREVIEW_PROFILES = [
  { name: 'Balanced', days: ['Mon', 'Tue', 'Thu', 'Sat'], focus_strength: 3, focus_mobility: 3, focus_conditioning: 3 },
  { name: 'Strength focus', days: ['Mon', 'Tue', 'Thu', 'Sat'], focus_strength: 5, focus_mobility: 2, focus_conditioning: 2 },
  { name: 'Conditioning focus', days: ['Mon', 'Wed', 'Fri'], focus_strength: 2, focus_mobility: 2, focus_conditioning: 5 },
  { name: 'Mobility focus', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'], focus_strength: 2, focus_mobility: 5, focus_conditioning: 2 },
] as const;
