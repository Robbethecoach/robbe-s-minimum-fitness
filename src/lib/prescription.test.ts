import { describe, expect, it } from 'vitest';
import { prescribe, weekInBlock } from './prescription';

const balanced = { focus_strength: 3, focus_conditioning: 3, focus_mobility: 3 };
const strengthHigh = { focus_strength: 5, focus_conditioning: 2, focus_mobility: 3 };
const main = { sets: 3, reps: '6-8', focus: 'strength', is_main_lift: true };

describe('prescribe', () => {
  it('keeps the template at a middle score, with week 1 at RIR 3', () => {
    expect(prescribe(main, balanced, { weekInBlock: 1, deloadWeek: 4 }))
      .toMatchObject({ sets: 3, reps: '6-8', rir: 3, isDeload: false });
  });

  it('adds a set for a high score and removes one for a low score', () => {
    expect(prescribe(main, strengthHigh, { weekInBlock: 1, deloadWeek: 4 }).sets).toBe(4);
    expect(prescribe({ sets: 3, reps: '20 min', focus: 'conditioning' }, strengthHigh, { weekInBlock: 1, deloadWeek: 4 }).sets).toBe(2);
  });

  it('never goes below 2 sets', () => {
    const low = { focus_strength: 1, focus_conditioning: 1, focus_mobility: 1 };
    expect(prescribe({ sets: 2, reps: '10', focus: 'mobility' }, low, { weekInBlock: 1, deloadWeek: 4 }).sets).toBe(2);
    expect(prescribe({ sets: 2, reps: '10', focus: 'mobility' }, low, { weekInBlock: 4, deloadWeek: 4 }).sets).toBe(2);
  });

  it('follows the block: RIR 2 in week 2, an extra set at RIR 1–2 in week 3', () => {
    expect(prescribe(main, balanced, { weekInBlock: 2, deloadWeek: 4 })).toMatchObject({ sets: 3, rir: 2 });
    expect(prescribe(main, balanced, { weekInBlock: 3, deloadWeek: 4 })).toMatchObject({ sets: 4, rir: 1, rirLabel: 'RIR 1–2' });
  });

  it('halves the sets in the deload week, wherever it falls', () => {
    expect(prescribe({ ...main, sets: 4 }, balanced, { weekInBlock: 3, deloadWeek: 3 })).toMatchObject({ sets: 2, rir: 4, isDeload: true });
  });

  it('gives accessories a lower RIR than main lifts', () => {
    expect(prescribe({ sets: 3, reps: '10-12', focus: 'strength' }, balanced, { weekInBlock: 2, deloadWeek: 4 }).rir).toBe(1);
  });

  it('applies member overrides before the deload', () => {
    const p = prescribe(main, balanced, {
      weekInBlock: 1, deloadWeek: 4,
      override: { sets: 5, reps: '5', target_load_kg: 82.5, paused: false },
    });
    expect(p).toMatchObject({ sets: 5, reps: '5', targetLoadKg: 82.5 });
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
