import { describe, expect, it } from 'vitest';
import { formatPace, fromThirtyMinuteTest, hrRange, paceRange } from './zones';
import { activityFactor, activityPoints, bmrMifflin, energyTarget, proteinTarget } from './nutrition';

describe('30-minute test', () => {
  it('gives threshold speed, pace and heart rate', () => {
    const t = fromThirtyMinuteTest(6.4, 172);
    expect(t.thresholdSpeedKmh).toBeCloseTo(12.8);
    expect(formatPace(t.thresholdPaceSec)).toBe('4:41');
    expect(t.thresholdHr).toBe(172);
  });

  it('computes zone 2 in bpm and min/km', () => {
    expect(hrRange(172, 2)).toEqual({ low: 146, high: 153 });
    const p = paceRange(12.8, 2);
    expect(formatPace(p.fast!)).toBe('5:52');
    expect(formatPace(p.slow!)).toBe('6:42');
  });
});

describe('energy and protein', () => {
  it('uses Mifflin-St Jeor', () => {
    expect(bmrMifflin('male', 80, 180, 35)).toBeCloseTo(1755);
    expect(bmrMifflin('female', 65, 168, 40)).toBeCloseTo(1339);
  });

  it('maps the activity answers to a factor', () => {
    expect(activityPoints({ daytime: 0, steps: 0, otherSport: 0, trainingDays: 3 })).toBe(1);
    expect(activityFactor(1)).toBe(1.35);
    expect(activityFactor(5)).toBe(1.6);
    expect(activityFactor(10)).toBe(1.9);
  });

  it('never goes below BMR or the floor', () => {
    const t = energyTarget({ sex: 'female', weightKg: 50, heightCm: 158, age: 55 }, { daytime: 0, steps: 0, otherSport: 0, trainingDays: 3 }, 'fat_loss');
    expect(t.target).toBeGreaterThanOrEqual(1500);
    expect(t.floorApplied).toBe(true);
  });

  it('protein: 1.2 g/kg minimum, 1.6 target, 2.0 when losing fat', () => {
    expect(proteinTarget(70, 'maintain')).toEqual({ minimum: 84, target: 112 });
    expect(proteinTarget(70, 'fat_loss')).toEqual({ minimum: 84, target: 140 });
  });
});
