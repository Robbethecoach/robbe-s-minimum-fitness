import { describe, expect, it } from 'vitest';
import { composeSession, focusLabel, pairSupersets, type Placement } from './session';

const p = (over: Partial<Placement> & Pick<Placement, 'id' | 'name'>): Placement => ({
  sets: 3,
  reps: '8-10',
  role: 'accessory',
  quality: 'strength',
  region: 'lower',
  pattern: null,
  unit: 'reps',
  superset_ok: false,
  superset_with: null,
  emom_interval_sec: null,
  ...over,
});

const sessionA: Placement[] = [
  p({ id: 'extra', name: 'Landmine press', role: 'extra', region: 'upper' }),
  p({ id: 'split', name: 'Split squat' }),
  p({ id: 'mob', name: '90/90 hip switch', quality: 'mobility', unit: 'per_side', reps: '8' }),
  p({ id: 'squat', name: 'Back squat', role: 'main', pattern: 'squat', reps: '6-8' }),
  p({ id: 'bench', name: 'DB bench press', role: 'main', region: 'upper', pattern: 'push' }),
  p({ id: 'jump', name: 'Box jump', quality: 'power', reps: '4', superset_ok: true }),
];

const balanced = { focus_strength: 3, focus_mobility: 3, focus_conditioning: 3 };
const week1 = { weekInBlock: 1, deloadWeek: 4 };

describe('composeSession', () => {
  it('orders power first, then main strength, mobility, accessories, extras', () => {
    const s = composeSession(sessionA, balanced, { ...week1, sessionMinutes: 120 });
    expect(s.items.map((i) => i.placement.id)).toEqual(['jump', 'bench', 'squat', 'mob', 'split', 'extra']);
  });

  it('pairs power legs with upper strength as A1/A2', () => {
    const s = composeSession(sessionA, balanced, { ...week1, sessionMinutes: 120 });
    expect(s.items.slice(0, 2).map((i) => [i.placement.id, i.label])).toEqual([['jump', 'A1'], ['bench', 'A2']]);
    expect(s.items[2].label).toBe('B');
  });

  it('drops extras at a low focus score and marks them optional at 3', () => {
    const low = composeSession(sessionA, { ...balanced, focus_strength: 2 }, { ...week1, sessionMinutes: 120 });
    expect(low.items.some((i) => i.placement.id === 'extra')).toBe(false);
    expect(low.dropped.map((d) => d.id)).toContain('extra');
    const mid = composeSession(sessionA, balanced, { ...week1, sessionMinutes: 120 });
    expect(mid.items.find((i) => i.placement.id === 'extra')?.optional).toBe(true);
  });

  it('asks before going over the session limit, and lets the member do it all', () => {
    const tight = composeSession(sessionA, { ...balanced, focus_strength: 5 }, { ...week1, sessionMinutes: 30 });
    expect(tight.overLimit).toBe(true);
    expect(tight.items.some((i) => i.placement.role === 'extra')).toBe(false);
    const full = composeSession(sessionA, { ...balanced, focus_strength: 5 }, { ...week1, sessionMinutes: 30, includeAllExtras: true });
    expect(full.items.some((i) => i.placement.role === 'extra')).toBe(true);
  });

  it('leaves power out in the deload week and when the block has none', () => {
    expect(composeSession(sessionA, balanced, { weekInBlock: 4, deloadWeek: 4 }).items.some((i) => i.placement.quality === 'power')).toBe(false);
    expect(composeSession(sessionA, balanced, { ...week1, powerIncluded: false }).items.some((i) => i.placement.quality === 'power')).toBe(false);
  });

  it('uses EMOM rounds for the time estimate', () => {
    const emom = composeSession([p({ id: 'x', name: 'Bench', role: 'main', region: 'upper', emom_interval_sec: 150, sets: 4 })], balanced, week1);
    expect(emom.items[0].estimatedSeconds).toBe(4 * 150);
  });
});

describe('timing', () => {
  it('uses Robbe’s own rest times when set, and ignores malformed values', async () => {
    const { timingFrom } = await import('./session');
    const t = timingFrom({ rest: { strength: { main: 240 } }, warmUpMinutes: 'ten' });
    expect(t.rest.strength.main).toBe(240);
    expect(t.rest.strength.accessory).toBe(75);
    expect(t.warmUpMinutes).toBe(8);
    const slow = composeSession(sessionA, balanced, { ...week1, sessionMinutes: 120, timing: t });
    const normal = composeSession(sessionA, balanced, { ...week1, sessionMinutes: 120 });
    expect(slow.fullMinutes).toBeGreaterThan(normal.fullMinutes);
  });
});

describe('pairSupersets', () => {
  it('respects a pair Robbe fixed by hand', () => {
    const pairs = pairSupersets([
      p({ id: 'a', name: 'Shoulder CARs', quality: 'mobility', region: 'upper', superset_with: 'b' }),
      p({ id: 'b', name: 'Bench', region: 'upper' }),
    ]);
    expect(pairs.get('a')).toBe('b');
  });

  it('only pairs exercises marked superset ok, with the other region', () => {
    const pairs = pairSupersets([
      p({ id: 'mob', name: 'Shoulder CARs', quality: 'mobility', region: 'upper', superset_ok: true }),
      p({ id: 'bench', name: 'Bench', region: 'upper' }),
      p({ id: 'squat', name: 'Squat', region: 'lower', role: 'main' }),
    ]);
    expect(pairs.get('mob')).toBe('squat');
    expect(pairs.has('bench')).toBe(false);
  });
});

describe('focusLabel', () => {
  it('reads like the overview groups', () => {
    expect(focusLabel({ quality: 'strength', region: 'lower' })).toBe('Lower body strength');
    expect(focusLabel({ quality: 'power', region: 'lower' })).toBe('Lower body power');
    expect(focusLabel({ quality: 'mobility', region: 'upper' })).toBe('Mobility · upper body');
  });
});
