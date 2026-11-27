import { describe, expect, it } from "vitest";

import { fromFiveK, fromLactate, parseMinSec, thresholdFromTest } from './zones';

describe('alternatives to the 30-minute test', () => {
  it('scales a 5 km best down to threshold', () => {
    const r = fromFiveK(22 * 60 + 30, 175); // 22:30 → 13.33 km/h
    expect(r.thresholdSpeedKmh).toBeCloseTo(12.4, 1);
    expect(r.thresholdHr).toBe(170);
  });
  it('takes LT2 from a lactate test as the threshold', () => {
    const r = fromLactate(275, 168);
    expect(r.thresholdPaceSec).toBe(275);
    expect(r.thresholdHr).toBe(168);
  });
  it('picks the right formula per test type and ignores the walk test', () => {
    expect(thresholdFromTest({ test_type: 'walk_1600', distance_km: 1.6, avg_hr: null, duration_sec: 900 })).toBeNull();
    expect(thresholdFromTest({ test_type: 'race_5k', distance_km: 5, avg_hr: 175, duration_sec: 1350 })?.thresholdHr).toBe(170);
    expect(thresholdFromTest({ test_type: 'lactate', distance_km: null, avg_hr: null, duration_sec: null, threshold_hr: 168, threshold_pace_sec: 275 })?.thresholdPaceSec).toBe(275);
  });
  it('reads minutes:seconds the way people type them', () => {
    expect(parseMinSec('4:35')).toBe(275);
    expect(parseMinSec('22.30')).toBe(1350);
    expect(parseMinSec('4:75')).toBeNull();
    expect(parseMinSec('abc')).toBeNull();
  });
});
