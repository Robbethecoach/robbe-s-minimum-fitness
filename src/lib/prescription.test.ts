import { describe, expect, it } from 'vitest';
import { orderOptionalSessions, orderRequiredSessions, prescribe, weekInBlock } from './prescription';

const medium = { focus_strength: 2, focus_conditioning: 2, focus_mobility: 2 };
const strengthHigh = { focus_strength: 3, focus_conditioning: 1, focus_mobility: 2 };

describe('prescribe', () => {
  it('keeps the template at medium focus', () => {
    expect(prescribe({ sets: 3, reps: '8', focus: 'strength' }, medium, { weekInBlock: 1, deloadWeek: 4 }))
      .toMatchObject({ sets: 3, reps: '8', isDeload: false });
  });

  it('adds a set for high focus and removes one for low focus', () => {
    expect(prescribe({ sets: 3, reps: '8', focus: 'strength' }, strengthHigh, { weekInBlock: 1, deloadWeek: 4 }).sets).toBe(4);
    expect(prescribe({ sets: 3, reps: '8', focus: 'conditioning' }, strengthHigh, { weekInBlock: 1, deloadWeek: 4 }).sets).toBe(2);
  });

  it('cuts sets in the deload week, wherever it falls', () => {
    const p = prescribe({ sets: 4, reps: '6', focus: 'strength' }, medium, { weekInBlock: 3, deloadWeek: 3 });
    expect(p).toMatchObject({ sets: 2, isDeload: true });
  });

  it('applies member overrides before the deload', () => {
    const p = prescribe({ sets: 3, reps: '8' }, medium, {
      weekInBlock: 1, deloadWeek: 4,
      override: { sets: 5, reps: '5', target_load_kg: 82.5, paused: false },
    });
    expect(p).toMatchObject({ sets: 5, reps: '5', targetLoadKg: 82.5 });
  });

  it('never goes below one set', () => {
    expect(prescribe({ sets: 1, reps: '8', focus: 'mobility' }, { ...medium, focus_mobility: 1 }, { weekInBlock: 4, deloadWeek: 4 }).sets).toBe(1);
  });
});

describe('session order', () => {
  it('gives 3-day members both sessions of their main focus', () => {
    expect(orderRequiredSessions(strengthHigh, 3)).toEqual(['strength_a', 'conditioning_a', 'strength_b']);
    expect(orderRequiredSessions({ ...medium, focus_conditioning: 3 }, 3)).toEqual(['conditioning_a', 'strength_a', 'conditioning_b']);
  });

  it('uses all four required sessions from 4 days', () => {
    expect(orderRequiredSessions(medium, 6)).toHaveLength(4);
  });

  it('puts mobility first for high mobility focus', () => {
    expect(orderOptionalSessions({ ...medium, focus_mobility: 3 })[0]).toBe('mobility_flow');
  });
});

describe('weekInBlock', () => {
  it('cycles 1–4 from the block start', () => {
    const start = new Date('2026-11-02');
    expect(weekInBlock(start, new Date('2026-11-02'))).toBe(1);
    expect(weekInBlock(start, new Date('2026-11-24'))).toBe(4);
    expect(weekInBlock(start, new Date('2026-11-30'))).toBe(1);
  });
});
