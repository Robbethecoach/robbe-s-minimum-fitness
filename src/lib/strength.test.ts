import { describe, expect, it } from 'vitest';
import { current1RM, estimate1RM, estimate5RM, loadFor, loadRange, parseRepRange, rirTrend, weekTarget } from './strength';

describe('estimates', () => {
  it('adds reps in reserve to the reps done', () => {
    // 60 kg × 5 reps with 2 left ≈ a 7-rep max
    expect(estimate1RM(60, 5, 2)).toBeCloseTo(74, 0);
    expect(estimate1RM(60, 7, 0)).toBeCloseTo(estimate1RM(60, 5, 2));
  });

  it('caps very high RIR, which says little about the max', () => {
    expect(estimate1RM(60, 5, 9)).toBeCloseTo(estimate1RM(60, 5, 5));
  });

  it('round-trips load and 1RM', () => {
    expect(loadFor(estimate1RM(80, 6, 2), 6, 2)).toBeCloseTo(80);
    expect(estimate5RM(100)).toBeCloseTo(85.7, 1);
  });
});

describe('current1RM', () => {
  it('averages the best set of the last three sessions', () => {
    const sets = [
      { weight_kg: 50, reps: 8, rir: 2, logged_at: '2026-11-02T10:00:00Z', completion_id: 'a' },
      { weight_kg: 52.5, reps: 8, rir: 2, logged_at: '2026-11-09T10:00:00Z', completion_id: 'b' },
      { weight_kg: 55, reps: 8, rir: 2, logged_at: '2026-11-16T10:00:00Z', completion_id: 'c' },
      { weight_kg: 55, reps: 6, rir: 1, logged_at: '2026-11-16T10:05:00Z', completion_id: 'c' },
      { weight_kg: 57.5, reps: 8, rir: 2, logged_at: '2026-11-23T10:00:00Z', completion_id: 'd' },
    ];
    const expected = (estimate1RM(52.5, 8, 2) + estimate1RM(55, 8, 2) + estimate1RM(57.5, 8, 2)) / 3;
    expect(current1RM(sets)).toBeCloseTo(expected);
  });

  it('skips sets without RIR and returns null without data', () => {
    expect(current1RM([{ weight_kg: 50, reps: 8, rir: null, logged_at: '2026-11-02T10:00:00Z' }])).toBeNull();
    expect(current1RM([])).toBeNull();
  });
});

describe('loadRange', () => {
  it('turns reps and RIR into a range on the right increment', () => {
    const oneRm = estimate1RM(26, 10, 3);
    const r = loadRange(oneRm, '8-10', 2, 2.5)!;
    expect(r.low % 2.5).toBe(0);
    expect(r.low).toBeLessThanOrEqual(r.high);
    expect(r.high).toBeGreaterThan(26);
  });

  it('parses the rep formats used in the templates', () => {
    expect(parseRepRange('8–10')).toEqual({ low: 8, high: 10 });
    expect(parseRepRange('10/leg')).toEqual({ low: 10, high: 10 });
    expect(parseRepRange('3 x 6-8')).toEqual({ low: 6, high: 8 });
    expect(parseRepRange('max')).toBeNull();
  });
});

describe('block targets', () => {
  it('follows LURE 3.7', () => {
    expect(weekTarget(1).rirMain).toBe(3);
    expect(weekTarget(2).rirMain).toBe(2);
    expect(weekTarget(3)).toMatchObject({ rirMain: 1, extraSets: 1 });
    expect(weekTarget(4)).toMatchObject({ isDeload: true, rirMain: 4 });
  });

  it('suggests a load jump after two sessions well above the target RIR', () => {
    expect(rirTrend([4, 4], 2)).toBe('progress');
    expect(rirTrend([2, 3], 2)).toBe('hold');
    expect(rirTrend([0, 0], 2)).toBe('reduce');
    expect(rirTrend([4], 2)).toBe('hold');
  });
});
